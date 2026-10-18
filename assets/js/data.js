/* Gardens RFC content data.
   Edit this file to add fixtures and photos. Later this will be replaced by
   the club administration back end. */

window.GARDENS = {
  // Fixtures and results. Times are South African time.
  // Upcoming match:  { date: "2026-10-24", time: "15:00", team: "First team",
  //                    opponent: "Opponent name", venue: "Rosedale" }
  // Played match:    add  score: { us: 24, them: 17 }  and it moves to results.
  // The floating bar and the countdown pick the next upcoming match on their own.
  fixtures: [
    { date: "2026-10-17", time: "15:00", team: "First team", opponent: "Harlequins Rugby Club", venue: "" },
    { date: "2026-10-10", time: "15:00", team: "First team", opponent: "Progress", score: { us: 34, them: 21 } }
  ],

  // Match day: on the day of a fixture the top of the home page turns into a match card with a
  // countdown, directions, the live stream and a share button, then the result once it is added.
  // To preview it on any day, open the site with  ?matchday  on the end (index.html?matchday).

  // Predict the Score, presented by Score Energy Drink. Fans guess the score of the next match.
  //   on: false hides the game.
  //   prize: what the winner gets. Leave "" to show "Prize to be announced".
  //   Entries close at kick-off. After the game, find the winner in the Google Sheet
  //   (menu Gardens RFC > Find the prediction winner) or with  python server.py --winner,
  //   then add them to winners, newest first. Only first name and surname initial, please:
  //     { match: "Gardens v Progress", result: "34 - 21", name: "Thandi M.", guess: "30 - 20" }
  predict: {
    on: true,
    sponsor: "Score Energy Drink",
    prize: "",
    winners: []
  },

  // Where the forms (member registration, newsletter stories, community activities and
  // newsletter sign-ups) are saved. Paste the Google Apps Script web app address here
  // (see SETUP-GOOGLE-AND-CLOUDFLARE.md). Leave it empty to use the local test server.
  backend: {
    googleScriptUrl: ""
  },

  // Live streaming. On match day: set on: true and paste the stream link. Afterwards set on: false.
  //   url: a public Facebook Page video link (facebook.com/.../videos/... or fb.watch/...)
  //        or a YouTube link (youtube.com/watch?v=..., youtube.com/live/..., youtu.be/...)
  //   youtubeChannelId: the club channel's "UC..." id. Used when url is empty: YouTube then
  //        shows whatever the channel is streaming, so nobody has to paste a link each week.
  //   sponsor: shown as "Live stream presented by ..." (a paid spot you can sell per match or per season).
  //   support: a payment or donation link (SnapScan, Zapper, PayFast, bank details page, etc.).
  live: {
    on: false,
    url: "",
    youtubeChannelId: "",
    title: "",
    sponsor: { name: "", logo: "", url: "" },
    support: { label: "Support the stream", url: "" }
  },

  // Announcements. Newest first is not needed: urgent ones go to the top, then by date.
  // tag: "Urgent", "Match", "Club", "Training" or "Social".
  // "until" (optional) hides the notice after that date. "link" and "linkText" add a button.
  announcements: [
    { date: "2026-10-14", tag: "Match", title: "Harlequins on Saturday",
      body: "The first team plays Harlequins Rugby Club on Saturday 17 October. Kick-off is at 15:00. Come early and bring the family.",
      until: "2026-10-17", link: "#fixtures", linkText: "Fixtures and results" },
    { date: "2026-10-14", tag: "Club", title: "Member registration is open",
      body: "Players, supporters, juniors, veterans, coaches and volunteers can now register as Gardens RFC members online.",
      link: "#members", linkText: "Register now" },
    { date: "2026-10-14", tag: "Club", title: "Write for the November newsletter",
      body: "Stories for the November issue of Gardens Monthly close on 25 October. Fans, officials, players, parents and sponsors are all welcome.",
      until: "2026-10-25", link: "#newsletter", linkText: "Contribute a story" }
  ],

  // Birthdays. Everyone with a birthday this month is congratulated in Announcements, and in the
  // Gardens Monthly issue for that month. birthday is "MM-DD" (month, then day). The year and age
  // are never shown. Ask each person before adding them (POPIA).
  // group: "Executive", "Coach", "Player" or "Supporter".
  // Entries marked  sample: true  are examples to show the design. Delete them.
  birthdays: [
    { name: "Example executive member", birthday: "10-03", group: "Executive", sample: true },
    { name: "Example coach", birthday: "10-11", group: "Coach", sample: true },
    { name: "Example first-team player", birthday: "10-16", group: "Player", sample: true },
    { name: "Example junior player", birthday: "10-22", group: "Player", sample: true },
    { name: "Example supporter", birthday: "10-29", group: "Supporter", sample: true },
    { name: "Example supporter", birthday: "11-05", group: "Supporter", sample: true },
    { name: "Example coach", birthday: "11-18", group: "Coach", sample: true }
  ],

  // Know our crest: each part of the badge, in the order the tour shows them.
  //   spot:   the highlight oval, [x, y, width, height]: its centre as percentages of the crest
  //           picture (x of its width, y of its height), then its half-width and half-height,
  //           both as percentages of the picture's width
  //   marker: where the numbered button sits, [x, y] as percentages
  crest: [
    { title: "The shield", spot: [50, 50, 62, 62], marker: [6, 30],
      text: "A shield is the classic shape of a rugby club badge. Ours is filled with the red of the jersey and edged in gold, so it stands out on a green jersey or a green flag." },
    { title: "Gardens", spot: [50, 19, 38, 11], marker: [90, 15],
      text: "Uitenhage is known as the Garden Town. The founders named the club after the character of the place, and the name sits at the top of the shield." },
    { title: "The oak leaves", spot: [31, 42, 18, 16], marker: [12, 46],
      text: "Two sprigs of oak leaves cross in the middle of the crest. They honour the oaks that once lined the streets of the town." },
    { title: "The acorns", spot: [50, 44, 8, 8], marker: [66, 57],
      text: "Where the two sprigs cross sit the acorns, the seed every oak grows from. A fitting picture for a club that has grown generation after generation." },
    { title: "RFC", spot: [50, 66, 17, 8], marker: [73, 66],
      text: "Rugby Football Club. Since 1932 Gardens has been a rugby club first: two principles, discipline and respect, and fifteen players in green." },
    { title: "1932", spot: [50, 74.5, 13, 5.5], marker: [28, 75],
      text: "The year a small group of men founded the club, with \"Oom Basie\" Daniels as first president. Four years later came the first major trophy, the Kippler's Shield." },
    { title: "Uitenhage", spot: [50, 88, 48, 12], marker: [7, 84],
      text: "Home, on the scroll at the foot of the shield. The town has been called Kariega since 2021. The crest keeps the name the club was born with, and the ground is still at Rosedale." },
    { title: "The colours", spot: [50, 50, 62, 62], marker: [94, 50],
      text: "Green, white and red together look like a flower, which is why the jersey blooms in all three. The crest carries the red and the green; the white comes in on the jersey and the flag." }
  ],

  // The club flag, as it flies beside the headline at the top of the home page.
  flag: [
    { swatch: "#0f5a3a", title: "The green field",
      text: "Gardens green, the colour of the club's first jerseys: long-sleeved vests, dyed green by hand in 1932." },
    { swatch: "#c60204", title: "The crest at the centre",
      text: "The badge in full, large enough to read from across the field: Gardens, the oak leaves, 1932 and Uitenhage." },
    { swatch: "#f5f6f1", title: "The red and white stripes",
      text: "Red and white stripes run down both sides of the crest, so green, white and red fly together, the way the club wears them." },
    { swatch: "#ffc62b", title: "The gold finial",
      text: "The gold ball at the top of the pole picks up the gold edge of the crest." }
  ],

  // Club executive, shown under Club > Club executive. Leave name empty to show "To be confirmed".
  // Add  photo: "assets/img/executive/name.jpg"  and a short  bio  when the club confirms them.
  executive: [
    { role: "President", name: "" },
    { role: "Vice-president", name: "" },
    { role: "Chairperson", name: "" },
    { role: "Vice-chairperson", name: "" },
    { role: "Secretary", name: "" },
    { role: "Treasurer", name: "" },
    { role: "Fixtures secretary", name: "" },
    { role: "Additional member", name: "" }
  ],

  // Coaching team. Leave name empty to show "To be confirmed".
  // Add  photo: "assets/img/coaches/name.jpg"  and a short  bio  when the club confirms them.
  coaches: [
    { role: "Head coach", name: "" },
    { role: "Assistant coach", name: "" },
    { role: "Forwards coach", name: "" },
    { role: "Backs coach", name: "" },
    { role: "Strength and conditioning", name: "" },
    { role: "Team manager", name: "" },
    { role: "Physio and medical", name: "" },
    { role: "Junior coaching coordinator", name: "" }
  ],

  // Monthly newsletter. Newest issue first. Each item goes in one column:
  //   section "club" (club officials), "fans" (supporters) or "sponsors".
  // Contributions sent through the website arrive in members.db as "pending";
  // copy approved ones in here (later the back end will do this).
  newsletter: [
    {
      month: "2026-10",
      intro: "A win over Progress, Harlequins up next, and member registration is now open online. Welcome to the first issue of Gardens Monthly.",
      items: [
        { section: "club", title: "34 - 21 over Progress", author: "Gardens RFC", role: "Club",
          body: "The first team beat Progress 34 - 21 in our last outing. Thank you to everyone who came out to support the boys in green, white and red." },
        { section: "club", title: "Harlequins next, Saturday 17 October", author: "Gardens RFC", role: "Club",
          body: "Next up is Harlequins Rugby Club on Saturday 17 October, kick-off 15:00. The countdown is on the site. Come early and bring the family." },
        { section: "club", title: "Member registration is open", author: "Gardens RFC", role: "Club",
          body: "Players, supporters, juniors, veterans, coaches and volunteers can now register as Gardens RFC members on the website, in the Members area." },
        { section: "sponsors", title: "Score Energy Drink on the jersey", author: "Gardens RFC", role: "Sponsor news",
          body: "Score Energy Drink is the official energy drink partner of Gardens RFC, and the Score name is on the Gardens jersey. Please support the people who support the club." }
      ]
    }
  ],

  // Community activities. Upcoming ones are listed by date; past ones drop off.
  // category: "Club", "Youth", "Charity", "Church", "Fundraiser" or "Community".
  // Entries marked  sample: true  are examples to show the design. Delete them.
  community: [
    { date: "2026-10-24", time: "09:00", title: "Example: junior rugby open day", category: "Youth",
      venue: "Gardens Rugby Club, Rosedale", organiser: "Gardens RFC juniors",
      details: "Example listing to show how an activity appears. Replace with a real event.", sample: true },
    { date: "2026-11-07", time: "08:00", title: "Example: community clean-up", category: "Community",
      venue: "Rosedale, Kariega", organiser: "Local residents",
      details: "Example listing to show how an activity appears. Replace with a real event.", sample: true }
  ],

  // Videos on the page. Put the file in assets/video/ and a cover image in assets/img/video/.
  // Use short names with no spaces. "feature: true" shows a video large.
  videos: [
    { src: "assets/video/grand-challenge-final-2025.mp4", poster: "assets/img/video/grand-challenge-final-2025.jpg",
      title: "2025 EPRU Grand Challenge final", subtitle: "Gardens v PE Harlequins", duration: "4:14", feature: true },
    { src: "assets/video/fans-grandstand.mp4", poster: "assets/img/video/fans-grandstand.jpg",
      title: "The Gardens faithful", subtitle: "Supporters in full voice in the grandstand", duration: "0:48",
      credit: "Video: @moniquebakers on TikTok" }
  ],

  // Social media views, one line per month, oldest first. Shown in "The club online" on the home page
  // (the section stays hidden until the first month is added). Copy each figure from the app:
  //   youtube:   YouTube Studio > Analytics > Overview > Views (choose the month)
  //   facebook:  a Facebook Page's Professional dashboard > Insights > Views.
  //              A Facebook Group has no view count, so leave facebook out until the club has a Page.
  //   instagram: Profile > Professional dashboard > Views
  //   tiktok:    Profile > menu > TikTok Studio > Analytics > Video views
  // Leave out any platform with no figure for that month. Example:
  //   { month: "2026-09", youtube: 1520, facebook: 8400, instagram: 3100, tiktok: 12000 },
  // SAMPLE FIGURES (made up, to show how the chart works). While socialViewsSample is true the
  // section is labelled "Sample figures, not real". Before going live, replace these lines with
  // the club's real figures and set socialViewsSample to false (or delete the lines to hide the section).
  socialViewsSample: true,
  socialViews: [
    { month: "2026-04", youtube: 640, facebook: 2900, instagram: 1500, tiktok: 2200 },
    { month: "2026-05", youtube: 780, facebook: 3400, instagram: 1850, tiktok: 3900 },
    { month: "2026-06", youtube: 910, facebook: 3200, instagram: 2100, tiktok: 5600 },
    { month: "2026-07", youtube: 1250, facebook: 4100, instagram: 2600, tiktok: 7400 },
    { month: "2026-08", youtube: 1180, facebook: 4800, instagram: 3050, tiktok: 9800 },
    { month: "2026-09", youtube: 1620, facebook: 5300, instagram: 3400, tiktok: 12600 }
  ],

  // Useful links in the footer (right-hand column). They open in a new tab.
  usefulLinks: [
    { name: "Eastern Province Rugby Union", url: "https://www.eprugby.co.za/", note: "Fixtures, logs and union news" },
    { name: "Eastern Cape Sport, Recreation, Arts and Culture", url: "https://www.ecsrac.gov.za/", note: "Provincial sport and recreation department" },
    { name: "SA Rugby", url: "https://springboks.rugby/", note: "The Springboks and South African rugby" },
    { name: "BokSmart", url: "https://springboks.rugby/general/boksmart", note: "Rugby safety for players and coaches" },
    { name: "World Rugby", url: "https://www.world.rugby/", note: "Laws of the game and world rugby news" },
    { name: "All Blacks", url: "https://www.allblacks.com/", note: "New Zealand's national rugby team" }
  ],

  // WhatsApp: add the club's link to show the WhatsApp icon beside the other social icons.
  // Use  https://wa.me/27XXXXXXXXX  (number, no plus or spaces) or a WhatsApp channel/group invite link.
  whatsapp: "https://wa.me/27710811812",

  // Join as a player page (join-as-a-player.html).
  // Anything left empty shows "To be confirmed by the club".
  //   whatsapp: number for player enquiries, written 27XXXXXXXXX (no plus or spaces)
  players: {
    contactName: "",
    contactRole: "Club registrar",
    whatsapp: "27710811812",
    email: "",
    training: "",           // e.g. "Tuesdays and Thursdays, 17:30 at Rosedale"
    preseason: "",          // e.g. "Pre-season training starts on 13 January 2027"
    transferCutoff: "",     // e.g. "The union's transfer cut-off for 2027 is 31 May"
    fees: [
      { label: "Senior men", amount: "" },
      { label: "Under 21", amount: "" },
      { label: "Women", amount: "" }
    ]
  },

  // Club documents page (club-documents.html).
  // Put the PDF in assets/docs/ and set  file: "assets/docs/constitution.pdf".
  // A document with no file shows as "Being prepared".  updated: "2026-10" (year and month).
  // category: "Governance", "Codes of conduct", "Policies", "Player welfare", "Players" or "Meetings".
  documents: [
    { title: "Club constitution", category: "Governance", file: "", updated: "",
      summary: "How Gardens RFC is run: membership, the executive committee, general meetings, elections and the club's finances." },
    { title: "Membership fees and subscriptions", category: "Governance", file: "", updated: "",
      summary: "Fees for players, supporters, juniors and veterans, when they are due and how to pay." },
    { title: "Code of conduct: players", category: "Codes of conduct", file: "", updated: "",
      summary: "What the club expects from every player at training, on match day, in the clubhouse and online." },
    { title: "Code of conduct: supporters and parents", category: "Codes of conduct", file: "", updated: "",
      summary: "Behaviour in the stands, at home and away games, and on Supporters Club trips." },
    { title: "Code of conduct: coaches and officials", category: "Codes of conduct", file: "", updated: "",
      summary: "Standards for everyone who coaches, manages or represents the club." },
    { title: "Disciplinary procedure", category: "Policies", file: "", updated: "",
      summary: "How complaints and breaches of the codes of conduct are heard, and the right to appeal." },
    { title: "Child protection and safeguarding policy", category: "Policies", file: "", updated: "",
      summary: "How the club keeps under-18 players and young supporters safe, and who to speak to." },
    { title: "Privacy notice (POPIA)", category: "Policies", file: "privacy.html", updated: "2026-10",
      summary: "What personal information the club keeps, why, and how to ask to see or remove it." },
    { title: "Social media and communications policy", category: "Policies", file: "", updated: "",
      summary: "Posting about the club, team news and match footage." },
    { title: "Concussion and player welfare policy", category: "Player welfare", file: "", updated: "",
      summary: "Recognising concussion, removal from play and the return-to-play steps, in line with BokSmart." },
    { title: "Player registration and transfer guidelines", category: "Players", file: "", updated: "",
      summary: "The full procedure for new players and players moving from another club." },
    { title: "Annual general meeting minutes", category: "Meetings", file: "", updated: "",
      summary: "Minutes of the most recent AGM, including the election of the executive committee." }
  ],

  // Outside rules that apply to every club. Shown under the documents.
  rulebooks: [
    { name: "World Rugby laws of the game", url: "https://www.world.rugby/the-game/laws/home", note: "The laws every match is played under" },
    { name: "BokSmart", url: "https://springboks.rugby/general/boksmart", note: "SA Rugby's safety and concussion programme" },
    { name: "SA Institute for Drug-Free Sport", url: "https://www.drugfreesport.org.za/", note: "Anti-doping rules and the prohibited list" },
    { name: "Eastern Province Rugby Union", url: "https://www.eprugby.co.za/", note: "Union competitions, registrations and notices" }
  ],

  // Supporters Club page (supporters-club.html).
  //   whatsapp: the Supporters Club organiser's number, 27XXXXXXXXX (no plus or spaces)
  //   trips: away-game transport. seats = seats on the bus, booked = seats taken so far.
  //   functions: braais, dinners, fundraisers. Past trips and functions drop off by themselves.
  // Entries marked  sample: true  are examples to show the design. Delete them.
  supporters: {
    whatsapp: "27710811812",
    membership: "",          // e.g. "R150 a year, family R300"
    meets: "",               // e.g. "First Sunday of the month at the clubhouse"
    committee: [
      { role: "Chairperson", name: "" },
      { role: "Secretary", name: "" },
      { role: "Treasurer", name: "" },
      { role: "Transport coordinator", name: "" },
      { role: "Functions coordinator", name: "" }
    ],
    trips: [
      { date: "2026-10-31", opponent: "Example: away opponent", venue: "Away ground, Gqeberha",
        departs: "11:30", from: "Gardens clubhouse, Rosedale", returns: "About 19:00",
        price: "R120 return", seats: 60, booked: 22, sample: true }
    ],
    functions: [
      { date: "2026-11-14", time: "18:00", title: "Example: end-of-season braai", venue: "Gardens clubhouse, Rosedale",
        price: "R100 a plate", details: "Example listing to show how a function appears. Replace with a real event.", sample: true }
    ],
    rules: [
      "Be at the pick-up point 15 minutes before the bus leaves. It will not wait.",
      "Pay before the trip to keep your seat. Unpaid seats go to the waiting list.",
      "Children under 16 travel with a parent or guardian.",
      "Wear the colours, sing loud, and respect the home club, the referee and the driver.",
      "The Supporters Club code of conduct applies on the bus and at the ground."
    ]
  },

  // Sponsors. tier "headline" is shown large; everything else goes in the grid.
  // To show a logo, put the file in assets/img/sponsors/ and set  logo: "assets/img/sponsors/name.png"
  // Add  url: "https://..."  to link a sponsor to its website.
  sponsors: [
    {
      name: "Score Energy Drink", tier: "headline",
      blurb: "Official energy drink partner of Gardens RFC.",
      logo: "assets/img/sponsors/score-logo.jpg",
      photo: "assets/img/sponsors/score-jersey.jpg",
      photoCaption: "The Score name on the Gardens jersey.",
      products: [
        { name: "Retromelon", img: "assets/img/sponsors/score-can-retromelon.webp" },
        { name: "Mexican Mango", img: "assets/img/sponsors/score-can-mexican-mango.webp" },
        { name: "Passion", img: "assets/img/sponsors/score-can-passion.webp" },
        { name: "Original", img: "assets/img/sponsors/score-can-original.webp" }
      ],
      url: ""
    }
  ],

  // Adverts in the box beside the hero. They play one after another, then start again.
  //   video:  an .mp4 in assets/video/ads/ (plays muted, so no sound is needed; keep it under about 6 MB)
  //   poster: a picture shown while the video loads and for visitors who turn motion off
  //   sound:  true when the video has sound worth hearing; a "Sound on" button appears while it plays
  //           (browsers start every video silent until the visitor presses it)
  //   seconds: how long the advert runs (for a picture advert, how long it is shown; 10 if left out)
  //   image:  a still advert instead of a video
  //   url:    where the sponsor's name under the advert links to (leave out to link to Sponsors)
  // The videos are made by the _make-score-, _make-gardens- and _make-charles-advert.html pages;
  // run  python _record_advert.py score  (or gardens, or charles) to remake one.
  adverts: [
    {
      sponsor: "Score Energy Drink",
      video: "assets/video/ads/score-energy-30s.mp4",
      poster: "assets/video/ads/score-energy-30s.jpg",
      seconds: 30,
      alt: "Score Energy Drink advert: the Score logo, the Retromelon, Mexican Mango, Passion and Original cans, and the Score name on the Gardens jersey."
    },
    {
      sponsor: "Gardens RFC",
      url: "#story",
      video: "assets/video/ads/gardens-rfc-40s.mp4",
      sound: true,
      poster: "assets/video/ads/gardens-rfc-40s.jpg",
      seconds: 40,
      alt: "Gardens RFC club video: the crest, the club's history since 1932, its honours, game-day action, the supporters, and Born in the Garden Town. Built on respect."
    },
    {
      sponsor: "In memory of Oom Charles",
      url: "oom-charles.html",
      video: "assets/video/ads/oom-charles-30s.mp4",
      poster: "assets/video/ads/oom-charles-30s.jpg",
      seconds: 30,
      alt: "In loving memory of Oom Charles: a candle is lit, his portrait and photos from the touchline and trophy nights, Romans 8:31, and Forever Gardens."
    }
  ],

  // Memorial pages. The album with the same id opens this page instead of a photo grid.
  //   fullName, years: shown under the name when filled in (for example years: "1941 - 2025")
  //   portrait: the file in the folder used for the framed portrait
  //   tribute: a few words from the club or the family
  //   music: plays softly while the page is open (visitors can switch it off). To change the song,
  //          copy an MP3 the club may use into assets/audio and change src, title and credit.
  //   memories: approved memories from the Contributions tab, shown on the page,
  //          for example { name: "Jan Smith", text: "He never missed a home game." }
  //          Approved photos go into the album's folder in assets/img.
  memorials: {
    "oom-charles": {
      page: "oom-charles.html",
      name: "Oom Charles",
      fullName: "",
      years: "",
      folder: "Oom Charles",
      portrait: "29026252_947865558699490_3600639623048462336_n.jpg",
      verse: "If God be for us, who can be against us?",
      verseRef: "Romans 8:31",
      tribute: "In his green blazer and Gardens beanie, on the touchline and in the trophy photos, Oom Charles was part of the Gardens story. The club remembers him with love and gratitude.",
      shelf: [
        { item: "blazer", label: "His blazer" },
        { item: "beanie", label: "His beanie" },
        { item: "ball", label: "The game" },
        { item: "trophy", label: "The silverware" }
      ],
      music: { src: "assets/audio/amazing-grace-strings.mp3", title: "Amazing Grace",
               credit: "Played by the United States Air Force Band Strolling Strings (public domain)" },
      memories: []
    },

    // The Wall of Remembrance (memorial-wall.html): members, families and supporters the club remembers.
    //   people: one card each, in this order. photos are files in the folder; the first is shown on
    //           the card (focus moves it within the frame: "0% 50%" left, "100% 50%" right).
    //           page: a memorial page of their own, if they have one.
    //   moments: group photos from the folder, with a caption each.
    //   Photos copied into the folder that are not listed here show under "Together" by themselves.
    //   memories: approved memories, for example { name: "Jan Smith", remembering: "Chesley Kriel", text: "..." }
    //   born, passed: optional dates for a person, as "YYYY-MM-DD", for example
    //           { name: "Jan Smith", years: "1950 - 2026", born: "1950-03-14", passed: "2026-02-02", photos: [...] }
    //           On their birthday and on the day they passed on, their card is marked "Birthday today" or
    //           "Remembered today", they are listed at the top of the wall, and visitors can light another candle.
    //           Families can send the dates with the "Add to the wall" form.
    //   specialDays: the club's own days of remembrance, when everyone on the wall gets another candle,
    //           as "MM-DD", for example { date: "11-02", name: "Gardens Day of Remembrance" }
    "memorial": {
      page: "memorial-wall.html",
      kind: "wall",
      name: "Wall of Remembrance",
      folder: "memorial",
      cover: "489635205_10221711161727266_3087661885605385232_n.jpg",
      verse: "If God be for us, who can be against us?",
      verseRef: "Romans 8:31",
      words: "They wore the green and red, filled the grandstand, made the tea, washed the jerseys and carried Gardens in their hearts. Players, officials, members, families and supporters: each one is part of our story. We remember them with love and give thanks for every life.",
      music: { src: "assets/audio/it-is-well-with-my-soul-piano.mp3", title: "It Is Well with My Soul",
               credit: "Music: It Is Well with My Soul (P. P. Bliss, 1876), piano by Jeremy Westcott, licensed CC BY 2.5" },
      people: [
        { name: "John Henry Albrecht", photos: ["676735121_26513750058245375_6634709405672558334_n.jpg"], focus: "50% 25%" },
        { name: "Jakob Baartman", photos: ["671284273_26479550414998673_8500484670565192523_n.jpg"], focus: "0% 50%" },
        { name: "Achmat Bassier", years: "1965 - 2026", photos: ["656074313_26202283362725381_1650392835165379201_n.jpg"], focus: "0% 50%" },
        { name: "Kutazwa Miranda Binda", years: "1971 - 2026", photos: ["674066206_26472862275667487_7133206931835421850_n.jpg"], focus: "0% 50%" },
        { name: "Nothemba Dingaan", years: "1939 - 2023", photos: ["490126912_9540458376001142_7985440757208849908_n.jpg"], focus: "50% 20%" },
        { name: "Greg \"Paps\" Hendricks", photos: ["487506516_9469856756394638_5070308824341161742_n.jpg"] },
        { name: "Sophie Karools", years: "1953 - 2026", photos: ["669735330_26468862726067442_4145208107554270281_n.jpg", "673676106_26483984624555252_2597675058066337723_n.jpg"], focus: "0% 50%" },
        { name: "James Kayster", years: "1956 - 2023", born: "1956-11-05", passed: "2023-09-15", photos: ["490822159_9551919584855021_7367140634775878077_n.jpg"], focus: "50% 40%" },
        { name: "Nolan \"Whitey\" Ketteldas", years: "1971 - 2023", born: "1971-09-16", passed: "2023-06-14", photos: ["490678965_9527385563975090_4678257834754631666_n.jpg"] },
        { name: "Flekkie Klaasen", photos: ["674540622_26485951761025205_5551334206258108901_n.jpg"], focus: "0% 50%" },
        { name: "Chesley Kriel", years: "1985 - 2026", about: "A former rugby player of our club.", photos: ["673855625_26458428007110914_2437479740309652077_n.jpg", "676777767_26561745500112497_6058818867734682116_n.jpg"], focus: "50% 30%" },
        { name: "Beauline \"Baba\" Louw", years: "1986 - 2022", photos: ["485634850_9385991454781169_3213644752366459656_n.jpg"] },
        { name: "Charles Lovemore", about: "Oom Charles, part of the Gardens story on the touchline and in the trophy photos.", photos: ["514401335_23896508446636229_2720682684596891407_n.jpg"], focus: "50% 15%", page: "oom-charles.html" },
        { name: "John Tom Maarman", about: "A former rugby player of our club.", photos: ["678564134_26525116380442076_3948651533338486219_n.jpg"], focus: "50% 10%" },
        { name: "Abraham \"Takooza\" Meyers", years: "1956 - 2023", born: "1956-01-21", passed: "2023-03-01", photos: ["488816439_9490001677713479_1291565875979918765_n.jpg", "489168980_9490015464378767_1106535021256993493_n.jpg"], focus: "50% 60%" },
        { name: "Monica Myburgh", photos: ["485149784_9388863564493958_7138889396840695547_n.jpg"] },
        { name: "Judy Oersen", photos: ["490792197_9531123330267980_9021820600401053803_n.jpg"] },
        { name: "Regi Peterse", photos: ["126251658_3482433185137055_3777392765930056098_n.jpg"], focus: "100% 60%" },
        { name: "Eric Colin Sauls", years: "1956 - 2023", born: "1956-03-27", passed: "2023-10-05", about: "A Gardens legend who wore the Springbok jersey.", photos: ["490834316_9557828250930821_7094082138681251683_n.jpg", "491467726_9558428294204150_337915281953012204_n.jpg"], focus: "50% 10%" },
        { name: "Leslie Simons", photos: ["36028986_1751641691549555_198232042293428224_n.jpg"], focus: "0% 40%" },
        { name: "Nellie Swartbooi", photos: ["490441865_9507868969260083_55031101832747827_n.jpg"] },
        { name: "Niklaas \"Njama\" Swartz", photos: ["486046249_9388871681159813_7548884301833894563_n.jpg"] },
        { name: "Edwin Theron", years: "1989 - 2022", born: "1989-05-25", passed: "2022-12-25", about: "A great and loving husband.", photos: ["487506923_9469858963061084_6354438906750442596_n.jpg", "487503636_9469852369728410_4662887889604630567_n.jpg"], focus: "50% 20%" },
        { name: "Brumilda Uithaler", years: "1983 - 2026", photos: ["647009831_26042507285369657_9061508346035739113_n.jpg"], focus: "0% 50%" },
        { name: "Elizabeth \"Aunty Lysa\" Uithaler", photos: ["672021054_26486333594320355_4930442581326328220_n.jpg", "678291788_26530874556532925_5602948029151913743_n.jpg"], focus: "0% 50%" },
        { name: "Sydney Bonile Williams", years: "1962 - 2023", photos: ["488657669_9477287182318262_3876284526634242768_n.jpg"], focus: "0% 50%" },
        { name: "Hendry \"Biela\" Zeekoei", photos: ["490514767_9536897363023910_6688947620512101335_n.jpg", "490593127_9536864353027211_8464398949530763696_n.jpg"] }
      ],
      moments: [
        { photo: "489635205_10221711161727266_3087661885605385232_n.jpg", caption: "Gardens members in club blazers" },
        { photo: "480733131_2438028443199451_1165337774706295204_n.jpg", caption: "Gardens members together in club blazers" },
        { photo: "654862867_26172996815654036_1509254653965588993_n.jpg", caption: "The Gardens family together at a gathering" },
        { photo: "491453536_9553688544678125_8604438526169096329_n.jpg", caption: "Newspaper report: Gardens crowned Kings of Kariega" }
      ],
      memories: [],
      specialDays: []
    }
  },

  // Gallery albums, shown under Gallery in the menu.
  // Each album shows every photo in its folder inside assets/img. To add photos,
  // copy them into the folder: they appear by themselves (build_gallery.py lists them).
  //   alt:      describes the photos for people using screen readers
  //   captions: optional, a better description for one photo, by file name
  albums: [
    { id: "team", name: "The Team", folder: "teams", lede: "The squads that carry the crest.",
      alt: "Gardens RFC team photo",
      captions: { "03.jpg": "Gardens first team in green jerseys, posed on the field",
                  "04.jpg": "Gardens first reserve team in red jerseys, posed on the field" } },
    { id: "game-day", name: "Game Day", folder: "gameday", lede: "The grandstand, the touchline and the noise.",
      alt: "Gardens RFC on match day" },
    { id: "family", name: "The Gardens Family", folder: "dardensfamily", lede: "Supporters who come as families and sing from the stands.",
      alt: "Gardens RFC supporters" },
    { id: "legends", name: "The Legends", folder: "Gardens legends", lede: "Springboks, trophy nights and the players who made the crest mean something.",
      alt: "From the Gardens RFC archive",
      captions: { "06.jpg": "Portrait of Eric Sauls in a Springbok jersey",
                  "07.jpg": "Portrait of Ronnie Korkee in a Springbok jersey",
                  "09.jpg": "Early Gardens team photograph from the club's archive",
                  "20.jpg": "A Gardens official with the club's trophies",
                  "21.jpg": "A Gardens official holding a trophy" } },
    { id: "memorial", name: "Wall of Remembrance", folder: "memorial", lede: "Remembering the players, officials and supporters we have lost.",
      alt: "In memory" },
    { id: "oom-charles", name: "Oom Charles", folder: "Oom Charles", lede: "Photos and memories of Oom Charles.",
      alt: "Oom Charles" },
    { id: "community", name: "The Community", folder: "community", lede: "The club out in Kariega and Uitenhage.",
      alt: "Gardens RFC in the community" }
  ],

  images: {
    team: [
      { src: "assets/img/teams/03.jpg", alt: "Gardens first team in green jerseys, posed on the field" },
      { src: "assets/img/teams/04.jpg", alt: "Gardens first reserve team in red jerseys, posed on the field" }
    ],
    legends: [
      { src: "assets/img/history/06.jpg", alt: "Portrait of Eric Sauls in a Springbok jersey" },
      { src: "assets/img/history/07.jpg", alt: "Portrait of Ronnie Korkee in a Springbok jersey" },
      { src: "assets/img/history/04.jpg", alt: "A profile card for Ronnie Korkee, scrumhalf, showing him mid-pass" },
      ...[0, 1, 2, 3, 5, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(n => ({
        src: `assets/img/history/${String(n).padStart(2, "0")}.jpg`,
        alt: "Archive photograph from the Gardens RFC albums"
      }))
    ],
    gameday: [0,1,2,3,4,5,6,7,8,9].map(n => ({
      src: `assets/img/gameday/${String(n).padStart(2,"0")}.jpg`,
      alt: "Gardens RFC on match day"
    })),
    fans: [0,1,2,3,4,5,6,7,8,9,10].map(n => ({
      src: `assets/img/dardensfamily/${String(n).padStart(2,"0")}.jpg`,
      alt: "Gardens RFC supporters"
    })),
    early: [0,1,2,3].map(n => ({
      src: `assets/img/history/${String(n).padStart(2,"0")}.jpg`,
      alt: "Early Gardens team photograph from the club's archive"
    })),
    history: [5,8,9,10,11,13,14,15,16,17,18,19,20,21,22].map(n => ({
      src: `assets/img/history/${String(n).padStart(2,"0")}.jpg`,
      alt: "Archive photograph from the Gardens RFC albums"
    }))
  }
};
