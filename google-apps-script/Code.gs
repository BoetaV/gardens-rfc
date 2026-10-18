/**
 * Gardens RFC website forms -> Google Sheet.
 *
 * Paste this whole file into Extensions > Apps Script in the club's Google Sheet,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * Copy the web app address into data.js  (backend.googleScriptUrl).
 * Full steps: SETUP-GOOGLE-AND-CLOUDFLARE.md
 *
 * Each form goes to its own tab, created on first use:
 *   Members        member registrations
 *   Contributions  newsletter stories, community activities and memorial memories
 *                  (Status starts as "pending"). Photos sent with a memory are saved in the
 *                  Drive folder "Gardens RFC memorial photos" and linked in the Photos column.
 *   Subscribers    newsletter email sign-ups
 * The visitor counter in the website footer is kept in the script's own storage (no tab):
 * set START_VISITS below to carry on from an earlier count.
 * Candles lit on the Wall of Remembrance are kept there too: a count for each name.
 *   Predictions    Predict the Score entries. After a match, use the menu
 *                  Gardens RFC > Find the prediction winner.
 *
 * Website content: the menu Gardens RFC > Set up website content tabs adds tabs the club edits to
 * change the website (fixtures, announcements, birthdays, the newsletter and more; see CONTENT below).
 * The website reads them through this same web app, and shows changes within a minute or two.
 */

// Optional: an email address to tell when someone registers or sends a story. Leave "" for none.
const NOTIFY_EMAIL = "";

// The visitor counter starts from this number the very first time it is used.
const START_VISITS = 0;

const SHEETS = {
  members: {
    name: "Members",
    columns: ["Registered at", "First name", "Surname", "Date of birth", "Gender", "Email", "Cell number",
              "Street address", "Suburb", "Town", "Postal code", "Membership type", "Team", "Position",
              "Emergency contact", "Emergency number", "POPIA consent", "Club news"]
  },
  contributions: {
    name: "Contributions",
    columns: ["Submitted at", "Status", "Type", "Name", "I am a", "Email", "Cell number", "Title",
              "Story or details", "Activity date", "Start time", "Venue", "Category", "Publish consent",
              "Memorial", "Photos"]
  },
  subscribers: {
    name: "Subscribers",
    columns: ["Subscribed at", "Email"]
  },
  predictions: {
    name: "Predictions",
    columns: ["Submitted at", "Match", "Kick-off", "Name", "Cell number", "Gardens", "Opponent", "Contact consent"]
  }
};

const MEMBER_TYPES = ["Senior player", "Junior player", "Veteran player", "Supporter", "Coach or official", "Volunteer"];
const ROLES = ["Fan or supporter", "Club official", "Sponsor", "Player", "Parent", "Community organisation"];
const CATEGORIES = ["Club", "Youth", "Charity", "Church", "Fundraiser", "Community"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9 ()-]{9,20}$/;
const PHOTO_FOLDER = "Gardens RFC memorial photos";
const MAX_PHOTOS = 5;

function doPost(e) {
  let data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return reply({ ok: false, error: "Invalid request." });
  }
  if (data.website) return reply({ ok: true });  // spam trap, invisible to people

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);  // one save at a time, so duplicate checks are reliable
  try {
    if (data.form === "members") return reply(saveMember(data));
    if (data.form === "contributions") return reply(saveContribution(data));
    if (data.form === "subscribe") return reply(saveSubscriber(data));
    if (data.form === "predictions") return reply(savePrediction(data));
    if (data.form === "visit") return reply(countVisit());
    if (data.form === "candles") return reply(lightCandle(data));
    return reply({ ok: false, error: "Unknown form." });
  } finally {
    lock.releaseLock();
  }
}

// Visiting the web app address in a browser shows this, which is handy for checking it is live.
// With ?content=1 on the end it returns the website content from the content tabs instead.
function doGet(e) {
  if (e && e.parameter && e.parameter.content) return reply({ ok: true, content: websiteContent() });
  return reply({ ok: true, message: "Gardens RFC forms are connected." });
}

/* ---------- Member registration ---------- */
function saveMember(d) {
  const f = {};
  const fields = { first_name: [1, 60], surname: [1, 60], date_of_birth: [1, 10], gender: [0, 20], email: [1, 120],
    phone: [1, 20], address_line: [1, 120], suburb: [0, 60], town: [1, 60], postal_code: [0, 4], member_type: [1, 40],
    team: [0, 60], position: [0, 40], emergency_name: [1, 80], emergency_phone: [1, 20] };
  for (const name in fields) {
    const v = clean(d[name]);
    if (fields[name][0] && !v) return fail(`Please fill in ${name.replace(/_/g, " ")}.`);
    if (v.length > fields[name][1]) return fail(`${label(name)} is too long.`);
    f[name] = v;
  }
  if (!EMAIL.test(f.email)) return fail("Please enter a valid email address.");
  if (!PHONE.test(f.phone) || !PHONE.test(f.emergency_phone)) return fail("Please enter a valid cell number.");
  if (f.postal_code && !/^\d{4}$/.test(f.postal_code)) return fail("Postal code should be 4 digits.");
  if (MEMBER_TYPES.indexOf(f.member_type) < 0) return fail("Please choose a membership type.");
  const dob = new Date(f.date_of_birth + "T12:00:00");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date_of_birth) || isNaN(dob) || dob > new Date() || dob < new Date("1920-01-01"))
    return fail("Please check the date of birth.");
  if (d.consent !== true) return fail("Consent is required to register.");

  const sheet = tab("members");
  if (emailExists(sheet, 6, f.email))
    return fail("This email address is already registered. Contact the club to update your details.");
  sheet.appendRow(safe([new Date(), f.first_name, f.surname, f.date_of_birth, f.gender, f.email, f.phone,
    f.address_line, f.suburb, f.town, f.postal_code, f.member_type, f.team, f.position,
    f.emergency_name, f.emergency_phone, "Yes", d.news_opt_in === true ? "Yes" : "No"]));
  notify("New Gardens RFC member: " + f.first_name + " " + f.surname, f.member_type + " registered on the website.");
  return { ok: true };
}

/* ---------- Newsletter story or community activity ---------- */
function saveContribution(d) {
  const kind = d.kind;
  if (kind === "memory") return saveMemory(d);
  if (kind !== "story" && kind !== "activity") return fail("Please choose a story or an activity.");
  const act = kind === "activity";
  const f = {};
  const fields = { name: [1, 1, 80], role: [1, 1, 40], email: [1, 1, 120], phone: [0, 0, 20], title: [1, 1, 100],
    body: [1, 1, 2500], date: [0, 1, 10], time: [0, 0, 5], venue: [0, 1, 100], category: [0, 1, 20] };
  for (const name in fields) {
    const activityOnly = ["date", "time", "venue", "category"].indexOf(name) >= 0;
    const v = act || !activityOnly ? clean(d[name]) : "";
    if ((act ? fields[name][1] : fields[name][0]) && !v) return fail(`Please fill in ${name}.`);
    if (v.length > fields[name][2]) return fail(`${label(name)} is too long.`);
    f[name] = v;
  }
  if (!EMAIL.test(f.email)) return fail("Please enter a valid email address.");
  if (f.phone && !PHONE.test(f.phone)) return fail("Please enter a valid cell number.");
  if (ROLES.indexOf(f.role) < 0) return fail("Please choose who you are.");
  if (act) {
    if (CATEGORIES.indexOf(f.category) < 0) return fail("Please choose a category.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return fail("Please enter a valid date.");
    const today = Utilities.formatDate(new Date(), "Africa/Johannesburg", "yyyy-MM-dd");
    if (f.date < today) return fail("The activity date has already passed.");
    if (f.time && !/^[0-2]\d:[0-5]\d$/.test(f.time)) return fail("Please enter a valid time.");
  }
  if (d.consent !== true) return fail("Please give permission for the club to publish it.");

  tab("contributions").appendRow(safe([new Date(), "pending", act ? "Community activity" : "Newsletter story",
    f.name, f.role, f.email, f.phone, f.title, f.body, f.date, f.time, f.venue, f.category, "Yes"]));
  notify("New " + (act ? "community activity" : "newsletter story") + " to review: " + f.title,
    "From " + f.name + " (" + f.role + "). Open the Contributions tab to review it.");
  return { ok: true };
}

/* ---------- Memory and photos for a memorial page ---------- */
function saveMemory(d) {
  const f = {};
  const fields = { memorial: [1, 60], name: [1, 80], role: [1, 40], email: [1, 120], phone: [0, 20], body: [0, 2500] };
  for (const name in fields) {
    const v = clean(d[name]);
    if (fields[name][0] && !v) return fail(`Please fill in ${name}.`);
    if (v.length > fields[name][1]) return fail(`${label(name)} is too long.`);
    f[name] = v;
  }
  if (!EMAIL.test(f.email)) return fail("Please enter a valid email address.");
  if (f.phone && !PHONE.test(f.phone)) return fail("Please enter a valid cell number.");
  if (ROLES.indexOf(f.role) < 0) return fail("Please choose who you are.");
  const photos = Array.isArray(d.photos) ? d.photos : [];
  if (photos.length > MAX_PHOTOS) return fail(`Please send up to ${MAX_PHOTOS} photos at a time.`);
  const blobs = [];
  for (let i = 0; i < photos.length; i++) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(photos[i]));
    if (!m) return fail("One of the photos could not be read. Please try another.");
    const bytes = Utilities.base64Decode(m[1]);
    if (bytes.length > 3 * 1024 * 1024) return fail("One of the photos is too large.");
    if ((bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8) return fail("One of the photos could not be read. Please try another.");
    blobs.push(bytes);
  }
  if (!f.body && !blobs.length) return fail("Please write a memory or add at least one photo.");
  if (d.consent !== true) return fail("Please give permission for the club to publish it.");

  // Photos stay private in the club's Drive until someone approves them
  const stamp = Utilities.formatDate(new Date(), "Africa/Johannesburg", "yyyy-MM-dd HHmm");
  const links = [];
  if (blobs.length) {
    const found = DriveApp.getFoldersByName(PHOTO_FOLDER);
    const folder = found.hasNext() ? found.next() : DriveApp.createFolder(PHOTO_FOLDER);
    blobs.forEach((bytes, i) => {
      const file = folder.createFile(Utilities.newBlob(bytes, "image/jpeg", `${f.memorial} - ${stamp} - ${f.name} - ${i + 1}.jpg`));
      links.push(file.getUrl());
    });
  }
  tab("contributions").appendRow(safe([new Date(), "pending", "Memory", f.name, f.role, f.email, f.phone,
    "A memory of " + f.memorial, f.body, "", "", "", "", "Yes", f.memorial, links.join("\n")]));
  notify("New memory of " + f.memorial + " to review",
    "From " + f.name + " (" + f.role + "), with " + links.length + " photo(s). Open the Contributions tab to review it.");
  return { ok: true };
}

/* ---------- Newsletter sign-up ---------- */
function saveSubscriber(d) {
  const email = clean(d.email);
  if (email.length > 120 || !EMAIL.test(email)) return fail("Please enter a valid email address.");
  const sheet = tab("subscribers");
  // Already subscribed: same answer either way, so the list of subscribers is not revealed
  if (!emailExists(sheet, 2, email)) sheet.appendRow(safe([new Date(), email]));
  return { ok: true };
}

/* ---------- Predict the Score ---------- */
function savePrediction(d) {
  const match = clean(d.match), name = clean(d.name), phone = clean(d.phone);
  if (!match || match.length > 120) return fail("Please choose a match.");
  const kickoff = new Date(clean(d.kickoff));
  if (isNaN(kickoff)) return fail("Please choose a match.");
  if (new Date() >= kickoff) return fail("Entries for this match closed at kick-off.");
  const score = v => typeof v === "number" && Math.floor(v) === v && v >= 0 && v <= 150;
  if (!score(d.us) || !score(d.them)) return fail("Please enter a score from 0 to 150.");
  if (name.length < 2 || name.length > 60) return fail("Please enter your name.");
  if (!PHONE.test(phone)) return fail("Please enter a valid cell number.");
  if (d.consent !== true) return fail("Please tick the box so the club can contact you if you win.");

  // One guess per cell number per match (compare the last 9 digits, so 071... and +2771... match)
  const sheet = tab("predictions");
  const digits = phone.replace(/\D/g, "").slice(-9);
  const rows = sheet.getLastRow() - 1;
  if (rows > 0 && sheet.getRange(2, 2, rows, 4).getValues()
      .some(r => String(r[0]) === match && String(r[3]).replace(/\D/g, "").slice(-9) === digits))
    return fail("This cell number already has a prediction for this match. One guess each.");
  sheet.appendRow(safe([new Date(), match, kickoff, name, phone, d.us, d.them, "Yes"]));
  return { ok: true };
}

// Adds the Gardens RFC menu to the sheet
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Gardens RFC")
    .addItem("Find the prediction winner", "findWinner")
    .addSeparator()
    .addItem("Set up website content tabs", "setUpContent")
    .addItem("Update the website now", "updateWebsiteNow")
    .addToUi();
}

// Asks for the match and the final score, then lists the closest guesses (earliest entry wins a tie)
function findWinner() {
  const ui = SpreadsheetApp.getUi();
  const sheet = tab("predictions");
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues() : [];
  const matches = [...new Set(rows.map(r => String(r[1])))];
  if (!matches.length) return ui.alert("There are no predictions yet.");
  const m = ui.prompt("Which match?", matches.map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\nType the number:", ui.ButtonSet.OK_CANCEL);
  if (m.getSelectedButton() !== ui.Button.OK) return;
  const match = matches[parseInt(m.getResponseText(), 10) - 1];
  if (!match) return ui.alert("Please type one of the numbers in the list.");
  const r = ui.prompt("Final score", "Gardens score - opponent score, for example 24-17:", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const parts = r.getResponseText().split("-").map(n => parseInt(n, 10));
  if (parts.length !== 2 || parts.some(isNaN)) return ui.alert("Please type the score like 24-17.");
  const best = rows.filter(x => String(x[1]) === match)
    .map(x => ({ at: new Date(x[0]), name: x[3], phone: x[4], us: x[5], them: x[6], off: Math.abs(x[5] - parts[0]) + Math.abs(x[6] - parts[1]) }))
    .sort((a, b) => a.off - b.off || a.at - b.at).slice(0, 5);
  ui.alert(`Closest guesses for ${match} (final ${parts[0]}-${parts[1]})`,
    best.map((x, i) => `${i + 1}. ${x.name} (${x.phone}): ${x.us}-${x.them}, off by ${x.off}`).join("\n"), ui.ButtonSet.OK);
}

/* ---------- Visitor counter ---------- */
function countVisit() {
  const store = PropertiesService.getScriptProperties();
  const count = (parseInt(store.getProperty("visits"), 10) || START_VISITS) + 1;
  store.setProperty("visits", String(count));
  return { ok: true, count: count };
}

/* ---------- Wall of Remembrance candles ---------- */
// {name} lights one more candle for that person; without a name it only reads. Returns every count.
function lightCandle(d) {
  const store = PropertiesService.getScriptProperties();
  let counts = {};
  try { counts = JSON.parse(store.getProperty("candles") || "{}"); } catch (err) { counts = {}; }
  const name = clean(d.name);
  if (name) {
    if (name.length > 60 || (!(name in counts) && Object.keys(counts).length >= 300)) return fail("That name is not on the wall.");
    counts[name] = (counts[name] || 0) + 1;
    store.setProperty("candles", JSON.stringify(counts));
  }
  return { ok: true, counts: counts };
}

/* ---------- Website content ---------- */
// The tabs the club edits to change the website. Each column: [heading, kind, help note, dropdown choices].
// kind: "date", "time", "month", "birthday", "number", or empty for text.
// A tab that does not exist yet leaves that part of the website as it is in data.js.
const CONTENT_TZ = "Africa/Johannesburg";
const CONTENT = [
  { key: "fixtures", name: "Fixtures", columns: [
    ["Date", "date", "The day of the match."],
    ["Kick-off", "time", "South African time, for example 15:00."],
    ["Team", "", "For example First team, Under 21 or Women."],
    ["Opponent", "", "The other club."],
    ["Venue", "", "Where the match is played."],
    ["Gardens score", "number", "Fill in after the match. The match then moves to the results."],
    ["Opponent score", "number", "Fill in after the match."]] },
  { key: "announcements", name: "Announcements", columns: [
    ["Date", "date", "When the notice was posted."],
    ["Type", "", "Urgent notices go to the top.", ["Urgent", "Match", "Club", "Training", "Social"]],
    ["Title", "", "A short heading."],
    ["Message", "", "The notice itself."],
    ["Show until", "date", "Optional. The notice disappears after this day."],
    ["Button text", "", "Optional, for example Register now."],
    ["Button link", "", "Optional. A page of the website, for example members.html, or a full address starting with https://"]] },
  { key: "bereavements", name: "Bereavements", columns: [
    ["Posted", "date", "The day the notice was posted."],
    ["Name", "", "The name as the family wants it shown."],
    ["Years", "", "For example 1944 - 2026."],
    ["Photo", "", "Optional. A picture saved in the website's assets/img/notices folder, for example assets/img/notices/joan-de-monk.jpg (photos need the website to be published)."],
    ["Message", "", "The club's words. Press Ctrl+Enter for a new paragraph."],
    ["Memorial service", "", "Day, time and place. Leave empty to show To be confirmed."],
    ["Funeral service", "", "Day, time and place. Leave empty to show To be confirmed."],
    ["Show until", "date", "Optional. The notice disappears after this day."]] },
  { key: "condolences", name: "Condolence messages", columns: [
    ["Remembering", "", "The name exactly as in the Bereavements tab."],
    ["From", "", "The name of the person who sent it. Ask them first, or use their first name only."],
    ["Message", "", "Their words, for example from the comments on the club's Facebook post."]] },
  { key: "birthdays", name: "Birthdays", columns: [
    ["Name", "", "Ask each person before adding them (POPIA)."],
    ["Birthday", "birthday", "Type the day and month, for example 14 March. The website never shows the year."],
    ["Group", "", "", ["Executive", "Coach", "Player", "Supporter"]]] },
  { key: "community", name: "Community", columns: [
    ["Date", "date", "Past activities drop off the website by themselves."],
    ["Time", "time", "Optional, for example 09:00."],
    ["Title", "", ""],
    ["Category", "", "", CATEGORIES],
    ["Venue", "", ""],
    ["Organiser", "", ""],
    ["Details", "", ""]] },
  { key: "newsletter", name: "Newsletter", columns: [
    ["Month", "month", "The issue this belongs to. Type the first day of the month, for example 1 November 2026. The newest month shows first."],
    ["Section", "", "Intro is the short welcome at the top of the issue (leave Title, Author and Role empty).",
      ["Intro", "From the club", "Fan voices", "Sponsor news"]],
    ["Title", "", ""],
    ["Author", "", "For example Gardens RFC, or the name of the person who sent it."],
    ["Role", "", "For example Club, Supporter or Sponsor news."],
    ["Text", "", ""]] },
  { key: "people", name: "Club people", columns: [
    ["Group", "", "Which list on the website the person is in.", ["Executive", "Coaching team", "Supporters Club committee"]],
    ["Role", "", "For example Chairperson or Head coach."],
    ["Name", "", "Leave empty to show To be confirmed."],
    ["About", "", "Optional. A sentence or two about the person."]] },
  { key: "trips", name: "Supporters trips", columns: [
    ["Date", "date", "Past trips drop off the website by themselves."],
    ["Opponent", "", ""],
    ["Venue", "", ""],
    ["Bus leaves", "time", "For example 11:30."],
    ["Pick-up point", "", ""],
    ["Back at", "", "For example About 19:00."],
    ["Price", "", "For example R120 return."],
    ["Seats", "number", "Seats on the bus."],
    ["Seats booked", "number", "Seats taken so far."]] },
  { key: "functions", name: "Supporters functions", columns: [
    ["Date", "date", "Past functions drop off the website by themselves."],
    ["Time", "time", ""],
    ["Title", "", "For example End-of-season braai."],
    ["Venue", "", ""],
    ["Price", "", "For example R100 a plate."],
    ["Details", "", ""]] },
  { key: "documents", name: "Documents", columns: [
    ["Title", "", ""],
    ["Category", "", "", ["Governance", "Codes of conduct", "Policies", "Player welfare", "Players", "Meetings"]],
    ["Link", "", "Leave empty to show Being prepared. To publish a PDF: put it in Google Drive, Share > Anyone with the link, and paste the link here."],
    ["Updated", "month", "Optional. Type the first day of the month, for example 1 October 2026."],
    ["Summary", "", "One or two sentences about the document."]] },
  { key: "winners", name: "Prediction winners", columns: [
    ["Match", "", "Newest first, for example Gardens v Progress."],
    ["Result", "", "For example 34 - 21."],
    ["Winner", "", "First name and surname initial only, for example Thandi M."],
    ["Their guess", "", "For example 30 - 20."]] },
  { key: "settings", name: "Settings", columns: [
    ["Setting", "", "Do not change the words in this column."],
    ["Value", "", "Change these."],
    ["What it does", "", ""]] }
];

// The rows of the Settings tab: [setting, where it goes on the website, kind, what it does]
const SETTINGS = [
  ["Predict the Score: on", "predict.on", "yesno", "Yes shows the Predict the Score game for the next match. No hides it."],
  ["Predict the Score: prize", "predict.prize", "", "What the winner gets. Empty shows Prize to be announced."],
  ["Predict the Score: sponsor", "predict.sponsor", "", "Shown as Presented by."],
  ["Live stream: on", "live.on", "yesno", "Yes on match day shows the live stream on the home page. Set it back to No afterwards."],
  ["Live stream: link", "live.url", "link", "A YouTube link, or a public Facebook Page video link."],
  ["Live stream: YouTube channel id", "live.youtubeChannelId", "", "The club channel's id starting with UC. Used when the link is empty: YouTube then shows whatever the channel is streaming."],
  ["Live stream: title", "live.title", "", "Optional. Empty uses the next fixture."],
  ["Live stream: sponsor", "live.sponsor.name", "", "Shown as Live stream presented by ..."],
  ["Live stream: sponsor website", "live.sponsor.url", "link", "Optional."],
  ["Live stream: support link", "live.support.url", "link", "A payment or donation link for the Support the stream button. Empty hides the button."],
  ["Players: contact name", "players.contactName", "", "Who new players speak to, on the Join as a player page."],
  ["Players: contact role", "players.contactRole", "", "For example Club registrar."],
  ["Players: WhatsApp number", "players.whatsapp", "phone", "The number for player enquiries, for example 073 407 9870."],
  ["Players: email", "players.email", "", ""],
  ["Players: training", "players.training", "", "For example Tuesdays and Thursdays, 17:30 at Rosedale."],
  ["Players: pre-season", "players.preseason", "", "For example Pre-season training starts on 13 January 2027."],
  ["Players: transfer cut-off", "players.transferCutoff", "", "For example The union's transfer cut-off for 2027 is 31 May."],
  ["Players: fee for senior men", "fee:Senior men", "", "For example R600 a season."],
  ["Players: fee for under 21", "fee:Under 21", "", ""],
  ["Players: fee for women", "fee:Women", "", ""],
  ["Supporters Club: WhatsApp number", "supporters.whatsapp", "phone", "The Supporters Club organiser's number."],
  ["Supporters Club: membership", "supporters.membership", "", "For example R150 a year, family R300."],
  ["Supporters Club: meetings", "supporters.meets", "", "For example First Sunday of the month at the clubhouse."]
];

// What the website showed when this script was written, used to fill the tabs the first time.
// (Sample entries are left out: they disappear from the website once the tabs are set up.)
const SEED = { "fixtures": [
    [ "2026-10-31", "15:00", "First team", "Excelsiors RFC", "", "", "" ],
    [ "2026-10-17", "15:00", "First team", "Harlequins Rugby Club", "", "", "" ],
    [ "2026-10-10", "15:00", "First team", "Progress", "", 34, 21 ] ],
  "announcements": [
    [ "2026-10-14", "Match", "Harlequins on Saturday", "The first team plays Harlequins Rugby Club on Saturday 17 October. Kick-off is at 15:00. Come early and bring the family.", "2026-10-17", "Fixtures and results", "#fixtures" ],
    [ "2026-10-14", "Club", "Member registration is open", "Players, supporters, juniors, veterans, coaches and volunteers can now register as Gardens RFC members online.", "", "Register now", "#members" ],
    [ "2026-10-14", "Club", "Write for the November newsletter", "Stories for the November issue of Gardens Monthly close on 25 October. Fans, officials, players, parents and sponsors are all welcome.", "2026-10-25", "Contribute a story", "#newsletter" ] ],
  "bereavements": [
    [ "2026-10-18", "Joan de Monk", "1944 - 2026", "assets/img/notices/joan-de-monk.jpg", "It is with deep sadness that Gardens Rugby Football Club shares the passing of Joan de Monk.\n\nThe club sends its heartfelt condolences to the de Monk family. We keep the family in our thoughts and prayers during this difficult time.", "", "", "" ] ],
  "condolences": [
    [ "Joan de Monk", "Sharon Maarman", "Sag rus my auntie 🙏🙏🙏🙏" ],
    [ "Joan de Monk", "Tercia Muller", "My sincere condolences to the Monk family." ],
    [ "Joan de Monk", "Tercia Muller", "Sorry De Monk." ],
    [ "Joan de Monk", "Catherine Josephs", "Sterkte Pieter 🙏" ],
    [ "Joan de Monk", "Omar Samdaan", "Condolences to the bereave family and friends too" ] ],
  "birthdays": [],
  "community": [],
  "newsletter": [
    [ "2026-10-01", "Intro", "", "", "", "A win over Progress, Harlequins up next, and member registration is now open online. Welcome to the first issue of Gardens Monthly." ],
    [ "2026-10-01", "From the club", "34 - 21 over Progress", "Gardens RFC", "Club", "The first team beat Progress 34 - 21 in our last outing. Thank you to everyone who came out to support the boys in green, white and red." ],
    [ "2026-10-01", "From the club", "Harlequins next, Saturday 17 October", "Gardens RFC", "Club", "Next up is Harlequins Rugby Club on Saturday 17 October, kick-off 15:00. The countdown is on the site. Come early and bring the family." ],
    [ "2026-10-01", "From the club", "Member registration is open", "Gardens RFC", "Club", "Players, supporters, juniors, veterans, coaches and volunteers can now register as Gardens RFC members on the website, in the Members area." ],
    [ "2026-10-01", "Sponsor news", "Score Energy Drink on the jersey", "Gardens RFC", "Sponsor news", "Score Energy Drink is the official energy drink partner of Gardens RFC, and the Score name is on the Gardens jersey. Please support the people who support the club." ] ],
  "people": [
    [ "Executive", "President", "", "" ],
    [ "Executive", "Vice-president", "", "" ],
    [ "Executive", "Chairperson", "", "" ],
    [ "Executive", "Vice-chairperson", "", "" ],
    [ "Executive", "Secretary", "", "" ],
    [ "Executive", "Treasurer", "", "" ],
    [ "Executive", "Fixtures secretary", "", "" ],
    [ "Executive", "Additional member", "", "" ],
    [ "Coaching team", "Head coach", "", "" ],
    [ "Coaching team", "Assistant coach", "", "" ],
    [ "Coaching team", "Forwards coach", "", "" ],
    [ "Coaching team", "Backs coach", "", "" ],
    [ "Coaching team", "Strength and conditioning", "", "" ],
    [ "Coaching team", "Team manager", "", "" ],
    [ "Coaching team", "Physio and medical", "", "" ],
    [ "Coaching team", "Junior coaching coordinator", "", "" ],
    [ "Supporters Club committee", "Chairperson", "", "" ],
    [ "Supporters Club committee", "Secretary", "", "" ],
    [ "Supporters Club committee", "Treasurer", "", "" ],
    [ "Supporters Club committee", "Transport coordinator", "", "" ],
    [ "Supporters Club committee", "Functions coordinator", "", "" ] ],
  "trips": [],
  "functions": [],
  "documents": [
    [ "Club constitution", "Governance", "", "", "How Gardens RFC is run: membership, the executive committee, general meetings, elections and the club's finances." ],
    [ "Membership fees and subscriptions", "Governance", "", "", "Fees for players, supporters, juniors and veterans, when they are due and how to pay." ],
    [ "Code of conduct: players", "Codes of conduct", "", "", "What the club expects from every player at training, on match day, in the clubhouse and online." ],
    [ "Code of conduct: supporters and parents", "Codes of conduct", "", "", "Behaviour in the stands, at home and away games, and on Supporters Club trips." ],
    [ "Code of conduct: coaches and officials", "Codes of conduct", "", "", "Standards for everyone who coaches, manages or represents the club." ],
    [ "Disciplinary procedure", "Policies", "", "", "How complaints and breaches of the codes of conduct are heard, and the right to appeal." ],
    [ "Child protection and safeguarding policy", "Policies", "", "", "How the club keeps under-18 players and young supporters safe, and who to speak to." ],
    [ "Privacy notice (POPIA)", "Policies", "privacy.html", "2026-10-01", "What personal information the club keeps, why, and how to ask to see or remove it." ],
    [ "Social media and communications policy", "Policies", "", "", "Posting about the club, team news and match footage." ],
    [ "Concussion and player welfare policy", "Player welfare", "", "", "Recognising concussion, removal from play and the return-to-play steps, in line with BokSmart." ],
    [ "Player registration and transfer guidelines", "Players", "", "", "The full procedure for new players and players moving from another club." ],
    [ "Annual general meeting minutes", "Meetings", "", "", "Minutes of the most recent AGM, including the election of the executive committee." ] ],
  "winners": [],
  "settings": { "predict.on": true, "predict.prize": "", "predict.sponsor": "Score Energy Drink", "live.on": false, "live.url": "", "live.youtubeChannelId": "", "live.title": "", "live.sponsor.name": "", "live.sponsor.url": "", "live.support.url": "", "players.contactName": "", "players.contactRole": "Club registrar", "players.whatsapp": "27734079870", "players.email": "", "players.training": "", "players.preseason": "", "players.transferCutoff": "", "fee:Senior men": "", "fee:Under 21": "", "fee:Women": "", "supporters.whatsapp": "27734079870", "supporters.membership": "", "supporters.meets": "" } };

// Menu: Gardens RFC > Set up website content tabs. Adds any content tab that is missing; never changes existing ones.
function setUpContent() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  book.setSpreadsheetTimeZone(CONTENT_TZ);
  const added = [];
  CONTENT.forEach(def => {
    if (book.getSheetByName(def.name)) return;
    const sheet = book.insertSheet(def.name);
    const heads = def.columns.map(c => c[0]);
    sheet.getRange(1, 1, 1, heads.length).setValues([heads])
      .setFontWeight("bold").setBackground("#0f5a3a").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    def.columns.forEach((c, i) => {
      const col = sheet.getRange(2, i + 1, 999, 1);
      if (c[2]) sheet.getRange(1, i + 1).setNote(c[2]);
      if (c[1] === "date") col.setNumberFormat("d mmm yyyy");
      if (c[1] === "time") col.setNumberFormat("hh:mm");
      if (c[1] === "month") col.setNumberFormat("mmmm yyyy");
      if (c[1] === "birthday") col.setNumberFormat("d mmmm");
      if (c[1] === "date" || c[1] === "month" || c[1] === "birthday")
        col.setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false)
          .setHelpText("Please type a date, for example 31 October 2026.").build());
      if (c[1] === "number")
        col.setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0, 999).setAllowInvalid(false).build());
      if (c[3]) col.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(c[3], true).setAllowInvalid(false).build());
      if (!c[1]) col.setNumberFormat("@").setWrap(true);  // text stays exactly as typed
    });
    let rows;
    if (def.key === "settings") {
      rows = SETTINGS.map(s => {
        const v = SEED.settings[s[1]];
        return [s[0], s[2] === "yesno" ? (v ? "Yes" : "No") : String(v == null ? "" : v), s[3]];
      });
    } else {
      rows = (SEED[def.key] || []).map(r => r.map(v => (v === null ? "" : v)));
    }
    // Dates become real dates; times like 15:00 are turned into times by the sheet itself
    if (rows.length) sheet.getRange(2, 1, rows.length, heads.length)
      .setValues(rows.map(r => r.map((v, i) => (v === "" ? "" : toCell(v, def.columns[i][1])))));
    if (def.key === "settings") {
      sheet.getRange(2, 1, SETTINGS.length, 1).setFontWeight("bold");
      SETTINGS.forEach((s, i) => {
        if (s[2] === "yesno") sheet.getRange(i + 2, 2).setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(["Yes", "No"], true).setAllowInvalid(false).build());
      });
    }
    sheet.autoResizeColumns(1, heads.length);
    def.columns.forEach((c, i) => { if (!c[1] && sheet.getColumnWidth(i + 1) > 360) sheet.setColumnWidth(i + 1, 360); });
    added.push(def.name);
  });
  clearContentCache();
  SpreadsheetApp.getUi().alert(added.length
    ? "Added these tabs: " + added.join(", ") + ".\n\nThe website now shows what is in them. Changes appear within a minute or two."
    : "All the website content tabs are already there.");
}

// The first-time values as real dates and times in the sheet
function toCell(v, kind) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  if (d && (kind === "date" || kind === "month" || kind === "birthday")) return new Date(+d[1], +d[2] - 1, +d[3], 12);
  return v;
}

// Menu: Gardens RFC > Update the website now. Normally changes show within a minute or two by themselves.
function updateWebsiteNow() {
  clearContentCache();
  SpreadsheetApp.getUi().alert("Done. The website shows the latest content within about a minute.");
}

// Any edit to the sheet (a content tab, or approving a memory) lets the website pick up the change straight away
function onEdit() {
  clearContentCache();
}

function clearContentCache() {
  CacheService.getScriptCache().remove("content");
}

// Everything the website needs from the content tabs, in the same shape as data.js
function websiteContent() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get("content");
  if (hit) return JSON.parse(hit);
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const tz = book.getSpreadsheetTimeZone() || CONTENT_TZ;
  const out = {};
  const read = key => {
    const def = CONTENT.filter(d => d.key === key)[0];
    const sheet = book.getSheetByName(def.name);
    if (!sheet) return null;  // not set up: the website keeps what data.js has
    const last = sheet.getLastRow();
    if (last < 2) return [];
    const width = sheet.getLastColumn();
    const range = sheet.getRange(1, 1, last, width);
    const values = range.getValues(), shown = range.getDisplayValues();
    const heads = values[0].map(h => String(h).trim());
    const rows = [];
    for (let r = 1; r < values.length; r++) {
      if (values[r].every(v => v === "" || v === null)) continue;
      const row = {};
      def.columns.forEach(c => {
        const i = heads.indexOf(c[0]);
        row[c[0]] = i < 0 ? "" : cellValue(values[r][i], shown[r][i], c[1], tz);
      });
      rows.push(row);
    }
    return rows;
  };
  const set = (key, fn) => { const rows = read(key); if (rows) out[key] = fn(rows); };
  const has = (...v) => v.every(x => x !== "");

  set("fixtures", rows => rows.filter(r => has(r["Date"], r["Opponent"])).map(r => {
    const f = { date: r["Date"], time: r["Kick-off"], team: r["Team"], opponent: r["Opponent"], venue: r["Venue"] };
    if (typeof r["Gardens score"] === "number" && typeof r["Opponent score"] === "number")
      f.score = { us: r["Gardens score"], them: r["Opponent score"] };
    return f;
  }));
  set("announcements", rows => rows.filter(r => has(r["Title"])).map(r => ({
    date: r["Date"], tag: r["Type"] || "Club", title: r["Title"], body: r["Message"], until: r["Show until"],
    linkText: r["Button text"], link: cleanLink(r["Button link"]) })));
  set("bereavements", rows => rows.filter(r => has(r["Name"])).map(r => ({
    date: r["Posted"], name: r["Name"], years: r["Years"], message: r["Message"], until: r["Show until"],
    photo: /^assets\/img\/[\w\/ .-]+\.(jpe?g|png|webp)$/i.test(r["Photo"]) ? r["Photo"] : "",
    services: [{ name: "Memorial service", details: r["Memorial service"] }, { name: "Funeral service", details: r["Funeral service"] }] })));
  const condolences = read("condolences");
  if (out.bereavements && condolences) out.bereavements.forEach(b => {
    b.messages = condolences.filter(r => r["Remembering"] === b.name && has(r["Message"])).map(r => ({ name: r["From"], text: r["Message"] }));
  });
  set("birthdays", rows => rows.filter(r => has(r["Name"], r["Birthday"])).map(r => ({
    name: r["Name"], birthday: r["Birthday"], group: r["Group"] || "Supporter" })));
  set("community", rows => rows.filter(r => has(r["Date"], r["Title"])).map(r => ({
    date: r["Date"], time: r["Time"], title: r["Title"], category: r["Category"] || "Community", venue: r["Venue"],
    organiser: r["Organiser"], details: r["Details"] })));
  set("newsletter", rows => {
    const KEYS = { "From the club": "club", "Fan voices": "fans", "Sponsor news": "sponsors" };
    const issues = {};
    rows.filter(r => r["Month"]).forEach(r => {
      const iss = issues[r["Month"]] = issues[r["Month"]] || { month: r["Month"], intro: "", items: [] };
      if (r["Section"] === "Intro") iss.intro = r["Text"];
      else if (KEYS[r["Section"]] && has(r["Title"]))
        iss.items.push({ section: KEYS[r["Section"]], title: r["Title"], author: r["Author"], role: r["Role"], body: r["Text"] });
    });
    return Object.keys(issues).sort().reverse().map(m => issues[m]);
  });
  const people = read("people");
  if (people) {
    const group = g => people.filter(r => r["Group"] === g && has(r["Role"]))
      .map(r => ({ role: r["Role"], name: r["Name"], bio: r["About"] }));
    out.executive = group("Executive");
    out.coaches = group("Coaching team");
    out.supporters = { committee: group("Supporters Club committee") };
  }
  set("trips", rows => rows.filter(r => has(r["Date"])).map(r => ({
    date: r["Date"], opponent: r["Opponent"], venue: r["Venue"], departs: r["Bus leaves"], from: r["Pick-up point"],
    returns: r["Back at"], price: r["Price"], seats: num(r["Seats"]), booked: num(r["Seats booked"]) })));
  if (out.trips) { out.supporters = out.supporters || {}; out.supporters.trips = out.trips; delete out.trips; }
  set("functions", rows => rows.filter(r => has(r["Date"], r["Title"])).map(r => ({
    date: r["Date"], time: r["Time"], title: r["Title"], venue: r["Venue"], price: r["Price"], details: r["Details"] })));
  if (out.functions) { out.supporters = out.supporters || {}; out.supporters.functions = out.functions; delete out.functions; }
  set("documents", rows => rows.filter(r => has(r["Title"])).map(r => ({
    title: r["Title"], category: r["Category"] || "Policies", file: cleanLink(r["Link"]), updated: r["Updated"], summary: r["Summary"] })));
  set("winners", rows => rows.filter(r => has(r["Winner"])).map(r => ({
    match: r["Match"], result: r["Result"], name: r["Winner"], guess: r["Their guess"] })));
  if (out.winners) { out.predict = { winners: out.winners }; delete out.winners; }

  const settings = read("settings");
  if (settings) {
    const fees = {};
    settings.forEach(r => {
      const def = SETTINGS.filter(s => s[0] === r["Setting"])[0];
      if (!def) return;
      let v = String(r["Value"]).trim();
      if (def[2] === "yesno") v = /^(yes|ja|true|on)$/i.test(v);
      if (def[2] === "link") v = cleanLink(v);
      if (def[2] === "phone") { v = v.replace(/\D/g, ""); if (v.charAt(0) === "0") v = "27" + v.slice(1); }
      if (def[1].indexOf("fee:") === 0) { fees[def[1].slice(4)] = v; return; }
      const path = def[1].split(".");
      let at = out;
      path.slice(0, -1).forEach(p => { at = at[p] = at[p] || {}; });
      at[path[path.length - 1]] = v;
    });
    if (Object.keys(fees).length) {
      out.players = out.players || {};
      out.players.fees = Object.keys(fees).map(label => ({ label: label, amount: fees[label] }));
    }
  }

  // Approved memories from the Contributions tab: the name of the person who sent it and the words only
  const contrib = book.getSheetByName(SHEETS.contributions.name);
  if (contrib && contrib.getLastRow() > 1) {
    const rows = contrib.getRange(2, 1, contrib.getLastRow() - 1, SHEETS.contributions.columns.length).getValues();
    const col = name => SHEETS.contributions.columns.indexOf(name);
    out.memories = rows.filter(r => String(r[col("Type")]) === "Memory" && /^approved$/i.test(String(r[col("Status")]).trim())
        && String(r[col("Story or details")]).trim())
      .map(r => ({ memorial: String(r[col("Memorial")]), name: String(r[col("Name")]), text: String(r[col("Story or details")]).trim() }));
  }

  try { cache.put("content", JSON.stringify(out), 300); } catch (err) { /* too large to cache: read fresh each time */ }
  return out;
}

// A cell as the website wants it: dates as 2026-10-31, months as 2026-10, birthdays as 03-14, times as 15:00
function cellValue(v, shown, kind, tz) {
  if (kind === "date" || kind === "month" || kind === "birthday") {
    if (!(v instanceof Date)) return "";
    return Utilities.formatDate(v, tz, kind === "date" ? "yyyy-MM-dd" : kind === "month" ? "yyyy-MM" : "MM-dd");
  }
  if (kind === "time") {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(shown).trim());  // the time as the sheet shows it
    return m ? ("0" + m[1]).slice(-2) + ":" + m[2] : "";
  }
  if (kind === "number") return typeof v === "number" ? v : "";
  return v instanceof Date ? String(shown).trim() : String(v).trim();
}

function num(v) {
  return typeof v === "number" ? v : 0;
}

// Only links to the website's own pages or to normal web addresses
function cleanLink(v) {
  const s = String(v || "").trim();
  return /^(https?:\/\/|mailto:|#|[\w-]+\.html([#?].*)?$|assets\/)/i.test(s) ? s : "";
}

/* ---------- Helpers ---------- */
function tab(key) {
  const def = SHEETS[key];
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(def.name);
  if (!sheet) {
    sheet = book.insertSheet(def.name);
    sheet.appendRow(def.columns);
    sheet.getRange(1, 1, 1, def.columns.length).setFontWeight("bold").setBackground("#0f5a3a").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < def.columns.length) {
    // A newer version of this script added columns: add their headings to the existing tab
    sheet.getRange(1, 1, 1, def.columns.length).setValues([def.columns])
      .setFontWeight("bold").setBackground("#0f5a3a").setFontColor("#ffffff");
  }
  return sheet;
}

function emailExists(sheet, column, email) {
  const rows = sheet.getLastRow() - 1;
  if (rows < 1) return false;
  const wanted = email.toLowerCase();
  return sheet.getRange(2, column, rows, 1).getValues().some(r => String(r[0]).toLowerCase() === wanted);
}

function clean(v) {
  return String(v == null ? "" : v).trim();
}

// Keep what people typed exactly as text: entries starting with = + - @ would otherwise run as
// formulas, and ones starting with a digit would be changed (071... loses its 0, dates get reformatted)
function safe(row) {
  return row.map(v => (typeof v === "string" && /^[=+\-@0-9]/.test(v) ? "'" + v : v));
}

function label(name) {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fail(error) {
  return { ok: false, error: error };
}

function notify(subject, body) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, subject, body + "\n\n" + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  } catch (err) {
    console.warn("Notification email failed: " + err);
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
