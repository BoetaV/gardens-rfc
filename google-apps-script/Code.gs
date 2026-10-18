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
function doGet() {
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
  SpreadsheetApp.getUi().createMenu("Gardens RFC").addItem("Find the prediction winner", "findWinner").addToUi();
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
