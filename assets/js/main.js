/* Birthdays in data.js for one month (1 to 12), by day. Only the day and month are kept, never the year.
   Shown in Announcements and in that month's Gardens Monthly, with the same markup. */
window.GardensBirthdays = {
  inMonth(month) {
    return ((window.GARDENS || {}).birthdays || [])
      .map(b => ({ ...b, m: +String(b.birthday).slice(0, 2), d: +String(b.birthday).slice(3, 5) }))
      .filter(b => b.name && b.m === month && b.d >= 1 && b.d <= 31)
      .sort((a, b) => a.d - b.d || a.name.localeCompare(b.name));
  },
  // today: the day of the month to mark as "Today", or 0
  list(people, monthShort, today) {
    const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const groups = ["Executive", "Coach", "Player", "Supporter"];
    return '<ul class="bday-list">' + people.map(b =>
      `<li class="${b.d === today ? "bday-today" : ""}"><span class="bday-date"><span class="bday-d">${b.d}</span>${esc(monthShort)}</span>` +
      `<b>${esc(b.name)}</b><span class="bday-group">${esc(groups.includes(b.group) ? b.group : "Gardens family")}</span>` +
      (b.d === today || b.sample ? '<span class="bday-tags">' +
        (b.d === today ? '<span class="bday-now">Today</span>' : "") +
        (b.sample ? '<span class="cm-sample">Example</span>' : "") + "</span>" : "") + "</li>").join("") + "</ul>";
  }
};

(function () {
  const data = window.GARDENS;

  /* Mobile nav */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  nav.addEventListener("click", e => {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  /* Galleries + lightbox (only on pages that have photos) */
  const lb = document.getElementById("lightbox");
  const lbImg = lb && lb.querySelector("img");
  let group = [], idx = 0, opener = null;

  function show(i) {
    idx = (i + group.length) % group.length;
    lbImg.src = group[idx].src;
    lbImg.alt = group[idx].alt;
  }
  function open(list, i, btn) {
    group = list; opener = btn;
    show(i);
    lb.hidden = false;
    document.body.classList.add("noscroll");
    lb.querySelector(".lb-close").focus();
  }
  if (lb) window.GardensLightbox = open;
  function close() {
    lb.hidden = true;
    document.body.classList.remove("noscroll");
    if (opener) opener.focus();
  }
  if (lb) {
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
  }
  document.addEventListener("keydown", e => {
    if (!lb || lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });

  function buildGallery(id, list) {
    const el = document.getElementById(id);
    if (!el) return;
    list.forEach((img, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tile";
      b.setAttribute("aria-label", `View photo ${i + 1} of ${list.length}`);
      const im = document.createElement("img");
      im.src = img.src; im.alt = img.alt; im.loading = "lazy";
      b.appendChild(im);
      b.addEventListener("click", () => open(list, i, b));
      el.appendChild(b);
    });
  }
  buildGallery("gameday", data.images.gameday);
  buildGallery("fans", data.images.fans);
  buildGallery("early", data.images.early);
  buildGallery("history", data.images.history);

  /* Fixtures, results, countdown, floating bar */
  const SAST = "+02:00";
  const kick = f => new Date(`${f.date}T${f.time || "15:00"}:00${SAST}`);
  const played = f => f.score && typeof f.score.us === "number";
  const fixtures = (data.fixtures || []).slice().sort((a, b) => kick(a) - kick(b));
  const now0 = Date.now();
  const upcoming = fixtures.filter(f => !played(f));
  const results = fixtures.filter(played);
  const next = upcoming.find(f => kick(f).getTime() + 3 * 3600e3 > now0) || null;
  const dateFmt = f => kick(f).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Johannesburg" });
  const shortDate = f => kick(f).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });
  const outcome = f => f.score.us > f.score.them ? "W" : f.score.us < f.score.them ? "L" : "D";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const setText = (sel, text) => { const el = document.querySelector(sel); if (el) el.textContent = text; };

  /* Next game card */
  if (next) {
    setText("#ng-match", `${next.team || "Gardens"} v ${next.opponent}`);
    setText("#ng-meta", `${dateFmt(next)}, ${next.time || ""}${next.venue ? " at " + next.venue : ""}`);
    setText(".sb-next-text", `${next.team || "Gardens"} v ${next.opponent}, ${shortDate(next)} ${next.time || ""}`);
  }

  /* Floating results bar */
  const sbRes = document.querySelector(".sb-results");
  const word = { W: "Win", L: "Loss", D: "Draw" };
  if (sbRes && results.length) {
    const last = results.slice(-3).reverse();
    sbRes.innerHTML = '<b class="sb-tag sb-tag-alt">Results</b>' + last.map(f =>
      `<span class="sb-res sb-${outcome(f)}"><i>${word[outcome(f)]}</i><strong>${f.score.us} - ${f.score.them}</strong> <em>v ${esc(f.opponent)}</em></span>`).join("");
  }

  /* Last result card */
  if (document.getElementById("lastgame") && results.length) {
    const lr = results[results.length - 1], o = outcome(lr);
    document.getElementById("lg-us").textContent = lr.score.us;
    document.getElementById("lg-them").textContent = lr.score.them;
    document.getElementById("lg-opp").textContent = lr.opponent;
    const badge = document.getElementById("lg-badge");
    badge.textContent = word[o]; badge.classList.add("sb-" + o);
    document.getElementById("lg-date").textContent = `${lr.team || "Gardens"}, ${dateFmt(lr)}${lr.venue ? " at " + lr.venue : ""}`;
    document.getElementById("lastgame").classList.add("lg-" + o);
    document.getElementById("lastgame").hidden = false;
  }

  /* Live stream: badge at the front of the scrolling bar, which then jumps to the player */
  const live = data.live || {};
  if (live.on && (live.url || live.youtubeChannelId) && document.getElementById("scorebar")) {
    const item = document.createElement("span");
    item.className = "sb-live";
    item.innerHTML = '<b class="sb-tag sb-tag-live">Live</b><span class="sb-next-text"></span>';
    item.querySelector(".sb-next-text").textContent = (live.title || (next ? `${next.team || "Gardens"} v ${next.opponent}` : "Gardens RFC")) + " - watch now";
    document.querySelector("#sb-track .sb-group").prepend(item);
    document.getElementById("scorebar").href = "#live";
    document.getElementById("scorebar").setAttribute("aria-label", "Gardens RFC is live now. Watch the stream.");
  }

  /* Ticker: repeat the group until it fills the bar, then double it so it loops seamlessly left to right */
  const sbTrack = document.getElementById("sb-track");
  const sbGroup = sbTrack && sbTrack.querySelector(".sb-group");
  const sbBar = document.getElementById("scorebar");
  const sbItems = sbGroup ? [...sbGroup.children] : [];
  function buildTicker() {
    if (!sbGroup) return;
    sbTrack.querySelectorAll(".sb-group + .sb-group").forEach(g => g.remove());
    sbGroup.querySelectorAll("[data-rep]").forEach(el => el.remove());
    for (let n = 0; sbGroup.scrollWidth < sbBar.clientWidth && n < 12; n++)
      sbItems.forEach(el => { const c = el.cloneNode(true); c.dataset.rep = ""; c.setAttribute("aria-hidden", "true"); sbGroup.append(c); });
    const copy = sbGroup.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    sbTrack.append(copy);
    sbTrack.style.setProperty("--sb-dur", `${Math.max(12, sbGroup.scrollWidth / 70)}s`);
  }
  buildTicker();
  let sbResize;
  if (sbGroup) addEventListener("resize", () => { clearTimeout(sbResize); sbResize = setTimeout(buildTicker, 200); });

  /* Countdown */
  const two = n => String(n).padStart(2, "0");
  const clockEls = {};
  document.querySelectorAll("#ng-clock b").forEach(b => clockEls[b.dataset.u] = b);
  const setCount = t => document.querySelectorAll(".sb-count").forEach(el => el.textContent = t);
  function tick() {
    if (!next) return;
    let diff = kick(next) - Date.now();
    if (diff <= 0) {
      Object.values(clockEls).forEach(b => b.textContent = "00");
      setCount("Kick-off");
      setText("#ng-meta", "Kick-off has passed. The result will appear here after the game.");
      return;
    }
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const hh = Math.floor(diff / 36e5); diff -= hh * 36e5;
    const mm = Math.floor(diff / 6e4); diff -= mm * 6e4;
    const ss = Math.floor(diff / 1000);
    if (clockEls.d) {
      clockEls.d.textContent = d; clockEls.h.textContent = two(hh);
      clockEls.m.textContent = two(mm); clockEls.s.textContent = two(ss);
    }
    setCount(`${d}d ${two(hh)}h ${two(mm)}m ${two(ss)}s`);
  }
  if (next) { tick(); setInterval(tick, 1000); }
  else if (document.getElementById("ng-clock")) document.getElementById("ng-clock").classList.add("idle");

  /* Fixture and result list */
  const fl = document.getElementById("fixture-list");
  if (!fl) { /* not on this page */ }
  else if (!fixtures.length) {
    fl.innerHTML =
      '<div class="coming coming-on-green"><h3>No fixtures posted yet</h3>' +
      "<p>Match dates, kick-off times and results will appear here. For now, the club's Facebook group has the latest.</p></div>";
  } else {
    const rows = [...upcoming.map(f => ({ f, up: true })), ...results.slice().reverse().map(f => ({ f, up: false }))];
    fl.innerHTML = '<ul class="fixtures">' + rows.map(({ f, up }) =>
      `<li class="${up ? "" : "past"}"><time datetime="${f.date}">${shortDate(f)}</time>` +
      `<span class="fx-team">${esc(f.team || "Gardens")}</span><span class="fx-opp">v ${esc(f.opponent)}</span>` +
      `<span class="fx-meta">${up ? esc((f.time || "") + (f.venue ? " " + f.venue : "")) : ""}</span>` +
      `<span class="fx-res">${up ? "" : outcome(f) + " " + f.score.us + " - " + f.score.them}</span></li>`).join("") + "</ul>";
  }

  /* WhatsApp icon, shown once the club link is added in data.js */
  if (data.whatsapp) {
    document.querySelectorAll(".socials").forEach(ul => {
      const li = document.createElement("li");
      li.innerHTML = `<a class="soc soc-whatsapp" href="${esc(data.whatsapp)}" target="_blank" rel="noopener" aria-label="Gardens RFC on WhatsApp" title="WhatsApp"><svg aria-hidden="true" focusable="false"><use href="#i-whatsapp"/></svg></a>`;
      ul.appendChild(li);
    });
  }

  /* Sponsors: section and footer line (the Sponsors menu is filled by site.js) */
  const sponsors = data.sponsors || [];
  const slug = s => "sponsor-" + s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const mark = s => s.logo
    ? `<img src="${esc(s.logo)}" alt="${esc(s.name)}" loading="lazy">`
    : `<span class="wordmark">${esc(s.name)}</span>`;
  const wrap = (s, inner, cls) => s.url
    ? `<a class="${cls}" id="${slug(s)}" href="${esc(s.url)}" target="_blank" rel="noopener">${inner}</a>`
    : `<div class="${cls}" id="${slug(s)}">${inner}</div>`;
  const head = sponsors.filter(s => s.tier === "headline");
  const rest = sponsors.filter(s => s.tier !== "headline");
  if (document.getElementById("sponsor-feature")) document.getElementById("sponsor-feature").innerHTML = head.map(s => `
    <div class="sp-feature" id="${slug(s)}">
      <div class="spf-brand">
        <small>Headline partner</small>
        ${s.logo ? `<img class="spf-logo" src="${esc(s.logo)}" alt="${esc(s.name)}" loading="lazy">` : `<span class="wordmark">${esc(s.name)}</span>`}
        ${s.blurb ? `<p>${esc(s.blurb)}</p>` : ""}
        ${s.url ? `<a class="btn btn-line" href="${esc(s.url)}" target="_blank" rel="noopener">Visit ${esc(s.name)}</a>` : ""}
      </div>
      ${s.photo ? `<figure class="spf-photo"><img src="${esc(s.photo)}" alt="A Gardens player wearing the ${esc(s.name)} logo on his jersey" loading="lazy">${s.photoCaption ? `<figcaption>${esc(s.photoCaption)}</figcaption>` : ""}</figure>` : ""}
    </div>
    ${(s.products || []).length ? `<div class="sp-products"><h3>The ${esc(s.name.split(" ")[0])} range</h3><ul>${s.products.map(p =>
      `<li><img src="${esc(p.img)}" alt="${esc(s.name)} ${esc(p.name)} can" loading="lazy"><span>${esc(p.name)}</span></li>`).join("")}</ul></div>` : ""}`).join("");
  if (document.getElementById("sponsor-grid")) document.getElementById("sponsor-grid").innerHTML = rest.map(s =>
    wrap(s, `<small>${esc(s.tier || "Partner")}</small>${mark(s)}`, "sp-card")).join("") +
    '<div class="sp-card sp-open"><small>Open</small><span class="wordmark">Your business here</span></div>';
  setText("#foot-sponsors", sponsors.length ? "Proudly supported by " + sponsors.map(s => s.name).join(", ") + "." : "");

  /* Menu folders (Gallery, Sponsors): one open at a time */
  const dds = [...document.querySelectorAll(".dropdown")];
  const setDD = (dd, open) => { dd.classList.toggle("open", open); dd.querySelector(".dd-btn").setAttribute("aria-expanded", open); };
  dds.forEach(dd => {
    dd.querySelector(".dd-btn").addEventListener("click", e => {
      e.stopPropagation();
      const open = !dd.classList.contains("open");
      dds.forEach(o => setDD(o, false));
      setDD(dd, open);
    });
    dd.querySelector(".dd-list").addEventListener("click", e => {
      if (e.target.tagName === "A") {
        setDD(dd, false); nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false");
      }
    });
  });
  document.addEventListener("click", e => dds.forEach(dd => { if (!dd.contains(e.target)) setDD(dd, false); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") dds.forEach(dd => setDD(dd, false)); });
})();

/* Solid header after the hero */
(function () {
  const h = document.querySelector(".site-header");
  const on = () => h.classList.toggle("solid", window.scrollY > 40);
  on(); window.addEventListener("scroll", on, { passive: true });
})();

/* Hero video: hold on the poster frame for visitors who prefer reduced motion */
(function () {
  const v = document.querySelector("video.hero-img");
  if (!v) return;
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => { if (mq.matches) v.pause(); else v.play().catch(() => {}); };
  apply(); mq.addEventListener("change", apply);
})();

/* Member registration: opens the form and sends it to the members database */
(function () {
  const dlg = document.getElementById("join-dialog");
  if (!dlg) return;
  const form = document.getElementById("join-form"), done = document.getElementById("join-done");
  const msg = document.getElementById("join-msg"), submit = form.querySelector("[type=submit]");
  const open = () => { form.hidden = false; done.hidden = true; msg.textContent = ""; dlg.showModal(); form.querySelector("input").focus(); };
  const close = () => dlg.close();
  document.getElementById("join-open").addEventListener("click", open);
  ["join-close", "join-cancel", "join-finish"].forEach(id => document.getElementById(id).addEventListener("click", close));
  document.querySelectorAll('a[href="#join"]').forEach(a => a.addEventListener("click", e => { e.preventDefault(); open(); }));
  dlg.addEventListener("click", e => { if (e.target === dlg) close(); });
  form.addEventListener("input", e => e.target.classList.remove("invalid"));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.textContent = "";
    const bad = [...form.elements].filter(el => el.willValidate && !el.checkValidity());
    form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    if (bad.length) {
      bad.forEach(el => el.classList.add("invalid"));
      bad[0].focus();
      msg.textContent = bad[0].name === "consent" ? "Please tick the consent box to register." : "Please complete the highlighted fields.";
      return;
    }
    const body = Object.fromEntries(new FormData(form));
    body.consent = form.consent.checked; body.news_opt_in = form.news_opt_in.checked;
    submit.setAttribute("aria-busy", "true"); submit.disabled = true;
    try {
      await window.GardensSend("members", body);
      form.reset(); form.hidden = true; done.hidden = false;
    } catch (err) {
      msg.textContent = err.message;
    } finally {
      submit.removeAttribute("aria-busy"); submit.disabled = false;
    }
  });
})();

/* Newsletter, community activities and contributions */
(function () {
  const data = window.GARDENS || {};
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TZ = "Africa/Johannesburg";
  const monthName = ym => new Date(`${ym}-01T12:00:00+02:00`).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: TZ });
  const post = (form, body) => window.GardensSend(form, body);

  /* Newsletter issue */
  const issues = (data.newsletter || []).slice().sort((a, b) => b.month.localeCompare(a.month));
  const issueEl = document.getElementById("nl-issue");
  const COLS = [
    { key: "club", name: "From the club", empty: "Club news for this issue is on its way." },
    { key: "fans", name: "Fan voices", empty: "No fan stories in this issue yet. Yours could be the first." },
    { key: "sponsors", name: "Sponsor news", empty: "Sponsors can share news, offers and thanks here." }
  ];
  // Birthdays in the issue's month, marking today's when it is the current issue
  function birthdays(ym) {
    const people = window.GardensBirthdays.inMonth(+ym.slice(5, 7));
    if (!people.length) return "";
    const at = new Date(`${ym}-01T12:00:00+02:00`);
    const month = at.toLocaleDateString("en-ZA", { month: "long", timeZone: TZ });
    const short = at.toLocaleDateString("en-ZA", { month: "short", timeZone: TZ });
    const now = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    return `<div class="nl-bdays"><h4>Birthdays in ${esc(month)}</h4>` +
      `<p>Happy birthday to the members of the Gardens family celebrating this month.</p>` +
      window.GardensBirthdays.list(people, short, now.slice(0, 7) === ym ? +now.slice(8, 10) : 0) + "</div>";
  }
  function showIssue(i) {
    const iss = issues[i];
    if (!iss) {
      issueEl.innerHTML = '<div class="coming"><h3>The first issue is on its way</h3><p>Subscribe above to get it by email.</p></div>';
      return;
    }
    issueEl.innerHTML =
      `<div class="nl-issue-head"><span class="nl-issue-no">Issue ${issues.length - i}</span><h3>${esc(monthName(iss.month))}</h3></div>` +
      (iss.intro ? `<p class="nl-intro">${esc(iss.intro)}</p>` : "") +
      '<div class="nl-cols">' + COLS.map(c => {
        const items = (iss.items || []).filter(it => it.section === c.key);
        return `<div class="nl-col nl-col-${c.key}"><h4>${c.name}</h4>` + (items.length
          ? items.map(it => `<article class="nl-item"><h5>${esc(it.title)}</h5><p>${esc(it.body)}</p><p class="nl-by">${esc(it.author)}${it.role ? `, ${esc(it.role)}` : ""}</p></article>`).join("")
          : `<div class="nl-empty"><p>${c.empty}</p><button class="nl-link" type="button" data-contribute="story">Contribute a story</button></div>`) + "</div>";
      }).join("") + "</div>" + birthdays(iss.month);
    document.querySelectorAll("#nl-archive-list button").forEach(b => b.setAttribute("aria-current", b.dataset.i == i));
  }
  if (issueEl && issues.length > 1) {
    document.getElementById("nl-archive").hidden = false;
    document.getElementById("nl-archive-list").innerHTML = issues.map((iss, i) =>
      `<li><button type="button" data-i="${i}">${esc(monthName(iss.month))}</button></li>`).join("");
    document.getElementById("nl-archive-list").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      showIssue(+b.dataset.i); issueEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (issueEl) showIssue(0);

  /* Deadline for the next issue: the 25th of this month (or of next month after the 25th) */
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const dl = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 25 ? 1 : 0), 25);
  const nextIssue = new Date(dl.getFullYear(), dl.getMonth() + 1, 1);
  const deadline = document.getElementById("nl-deadline");
  if (deadline) deadline.insertAdjacentHTML("beforeend",
    ` <strong>Stories for the ${nextIssue.toLocaleDateString("en-ZA", { month: "long" })} issue close on ${dl.toLocaleDateString("en-ZA", { day: "numeric", month: "long" })}.</strong>`);

  /* Subscribe */
  const sub = document.getElementById("nl-sub"), subMsg = document.getElementById("nl-sub-msg");
  if (sub) sub.addEventListener("submit", async e => {
    e.preventDefault();
    const email = sub.email;
    subMsg.className = "nl-sub-msg";
    if (!email.checkValidity()) {
      email.classList.add("invalid"); subMsg.textContent = "Please enter a valid email address."; subMsg.classList.add("err");
      return;
    }
    email.classList.remove("invalid");
    const btn = sub.querySelector("button"); btn.disabled = true;
    try {
      await post("subscribe", { email: email.value, website: sub.website.value });
      sub.reset(); subMsg.textContent = "You are on the list. The next issue will land in your inbox.";
    } catch (err) { subMsg.textContent = err.message; subMsg.classList.add("err"); }
    finally { btn.disabled = false; }
  });

  /* Community activities */
  const CAT = ["Club", "Youth", "Charity", "Church", "Fundraiser", "Community"];
  const day0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const acts = (data.community || []).filter(a => new Date(`${a.date}T23:59:00`) >= day0)
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  const list = document.getElementById("cm-list"), filters = document.getElementById("cm-filters");
  let current = "All";
  function renderActs() {
    const shown = acts.filter(a => current === "All" || a.category === current);
    list.innerHTML = shown.length ? shown.map(a => {
      const d = new Date(`${a.date}T12:00:00+02:00`);
      const f = o => d.toLocaleDateString("en-ZA", { ...o, timeZone: TZ });
      const cat = CAT.includes(a.category) ? a.category : "Community";
      return `<li class="cm-card cm-${cat.toLowerCase()}">` +
        `<div class="cm-date"><span>${f({ weekday: "short" })}</span><b>${f({ day: "numeric" })}</b><span>${f({ month: "short" })}</span></div>` +
        `<div class="cm-body"><p class="cm-tags"><span class="cm-cat">${esc(cat)}</span>${a.sample ? '<span class="cm-sample">Example</span>' : ""}</p>` +
        `<h3>${esc(a.title)}</h3>` +
        `<p class="cm-meta">${[a.time, a.venue].filter(Boolean).map(esc).join(" · ")}</p>` +
        (a.details ? `<p>${esc(a.details)}</p>` : "") +
        (a.organiser ? `<p class="cm-org">Organised by ${esc(a.organiser)}</p>` : "") + "</div></li>";
    }).join("") : `<li class="cm-none"><p>Nothing listed${current === "All" ? "" : " under " + esc(current)} yet. Running something for the community? List it here.</p></li>`;
  }
  if (list && filters) {
    const cats = ["All", ...CAT.filter(c => acts.some(a => a.category === c))];
    filters.innerHTML = cats.map(c => `<button type="button" aria-pressed="${c === "All"}">${c}</button>`).join("");
    filters.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      current = b.textContent;
      filters.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      renderActs();
    });
    renderActs();
  }

  /* Contribution form: one form for newsletter stories and community activities */
  const dlg = document.getElementById("contrib-dialog");
  if (!dlg) return;
  const form = document.getElementById("contrib-form"), done = dlg.querySelector(".join-done");
  const msg = form.querySelector(".jf-msg"), submit = form.querySelector("[type=submit]");
  const count = document.getElementById("contrib-count");
  function setKind(kind) {
    form.querySelector(`[name=kind][value=${kind}]`).checked = true;
    const act = kind === "activity";
    form.querySelectorAll("[data-kind=activity]").forEach(l => {
      l.hidden = !act;
      const f = l.querySelector("input, select");
      if (f && f.name !== "time") f.required = act;
    });
    form.querySelector("[data-kind-text]").textContent = act ? "The activity" : "Your story";
    form.querySelector("[data-kind-label]").textContent = act ? "What is happening" : "Your story";
    document.getElementById("contrib-h").textContent = act ? "List a community activity" : "Contribute to Gardens Monthly";
  }
  function open(kind) {
    form.hidden = false; done.hidden = true; msg.textContent = "";
    form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    setKind(kind === "activity" ? "activity" : "story");
    dlg.showModal(); form.elements.name.focus();
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-contribute]");
    if (b) open(b.dataset.contribute);
  });
  const memory = location.hash.match(/^#share-memory=(.+)$/);
  if (memory) {
    const who = decodeURIComponent(memory[1]).slice(0, 60);
    open("story");
    form.elements.title.value = `A memory of ${who}`;
    form.elements.body.placeholder = `Share your memory of ${who}.`;
    history.replaceState(null, "", location.pathname + location.search);
  }
  dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  form.addEventListener("change", e => { if (e.target.name === "kind") setKind(e.target.value); });
  form.addEventListener("input", e => {
    e.target.classList.remove("invalid");
    if (e.target.name === "body") count.textContent = `${e.target.value.length} / 2500`;
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.textContent = "";
    const bad = [...form.elements].filter(el => el.willValidate && !el.closest("[hidden]") && !el.checkValidity());
    form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    if (bad.length) {
      bad.forEach(el => el.classList.add("invalid")); bad[0].focus();
      msg.textContent = bad[0].name === "consent" ? "Please tick the box so the club can publish it." : "Please complete the highlighted fields.";
      return;
    }
    const body = Object.fromEntries(new FormData(form));
    body.consent = form.consent.checked;
    if (body.kind !== "activity") ["date", "time", "venue", "category"].forEach(k => delete body[k]);
    submit.disabled = true; submit.setAttribute("aria-busy", "true");
    try {
      await post("contributions", body);
      form.reset(); count.textContent = "0 / 2500"; form.hidden = true; done.hidden = false;
    } catch (err) { msg.textContent = err.message; }
    finally { submit.disabled = false; submit.removeAttribute("aria-busy"); }
  });
})();

/* Hero headline gradient: one continuous sweep across each line, not one per word */
(function () {
  const h1 = document.querySelector(".hero-title h1");
  if (!h1) return;
  function size() {
    const lines = [...h1.querySelectorAll(".line")];
    const w = Math.max(...lines.map(l => l.getBoundingClientRect().width));
    h1.style.setProperty("--gw", `${w * 3}px`);
    h1.style.setProperty("--travel", `${w * 2}px`);
    lines.forEach(l => {
      const left = l.getBoundingClientRect().left;
      l.querySelectorAll(".w").forEach(wd => wd.firstElementChild.style.setProperty("--ox", `${wd.getBoundingClientRect().left - left}px`));
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(size);
  addEventListener("resize", size);
})();

/* Videos: only one plays at a time */
(function () {
  const grid = document.getElementById("vid-grid");
  const vids = (window.GARDENS && window.GARDENS.videos) || [];
  if (!grid) return;
  if (!vids.length) { document.getElementById("videos").hidden = true; return; }
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  grid.innerHTML = vids.map(v =>
    `<figure class="vid${v.feature ? " vid-feature" : ""}">` +
    `<div class="vid-frame"><video controls playsinline preload="none" poster="${esc(v.poster)}"><source src="${esc(v.src)}" type="video/mp4"></video>` +
    (v.duration ? `<span class="vid-dur">${esc(v.duration)}</span>` : "") + "</div>" +
    `<figcaption><h3>${esc(v.title)}</h3>${v.subtitle ? `<p>${esc(v.subtitle)}</p>` : ""}${v.credit ? `<p class="vid-credit">${esc(v.credit)}</p>` : ""}</figcaption></figure>`).join("");
  const players = [...grid.querySelectorAll("video")];
  players.forEach(p => p.addEventListener("play", () => {
    players.forEach(o => { if (o !== p) o.pause(); });
    p.closest(".vid").classList.add("played");
  }));
})();

/* Gallery: albums (also listed under Gallery in the menu) and the washing line */
(function () {
  const data = window.GARDENS || {};
  const imgs = data.images || {};
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lightbox = (list, i, btn) => window.GardensLightbox && window.GardensLightbox(list, i, btn);
  const folders = window.GARDENS_PHOTOS || {};   // written by build_gallery.py
  const fromFolder = a => (folders[a.folder] || []).map((f, i, all) => ({
    src: `assets/img/${encodeURIComponent(a.folder)}/${encodeURIComponent(f)}`,
    alt: (a.captions && a.captions[f]) || `${a.alt || a.name}, photo ${i + 1} of ${all.length}`
  }));
  const albums = (data.albums || []).map(a => ({ ...a,
    photos: a.folder ? fromFolder(a) : Array.isArray(a.photos) ? a.photos : (imgs[a.photos] || []) }));
  if (!albums.length) return;

  const memorials = data.memorials || {};
  // The album list in the Media menu is filled by site.js; the rest is the Media page only
  const tabs = document.getElementById("album-tabs"), grid = document.getElementById("album-grid");
  if (!tabs) return;

  /* Album tabs */
  tabs.innerHTML = albums.map(a =>
    `<button type="button" role="tab" id="tab-${a.id}" data-id="${a.id}" aria-selected="false">${esc(a.name)}<span>${a.photos.length || ""}</span></button>`).join("");
  function selectAlbum(id) {
    const a = albums.find(x => x.id === id) || albums[0];
    tabs.querySelectorAll("[role=tab]").forEach(t => {
      const on = t.dataset.id === a.id;
      t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
    });
    document.getElementById("album-title").textContent = a.name;
    document.getElementById("album-lede").textContent = a.lede || "";
    grid.innerHTML = "";
    const mem = memorials[a.id];
    grid.classList.toggle("mosaic-empty", !a.photos.length || Boolean(mem));
    if (mem) {
      const pick = mem.cover || mem.portrait;
      const portrait = a.photos.find(p => p.src.endsWith(encodeURIComponent(pick))) || a.photos[0];
      grid.innerHTML = `<a class="mem-card" href="${esc(mem.page)}">` +
        (portrait ? `<img src="${esc(portrait.src)}" alt="">` : "") +
        `<span><small>In loving memory</small><b>${esc(mem.name)}</b>` +
        `<em>${mem.people ? `${a.photos.length} photos of ${mem.people.length} members, families and supporters` : `${a.photos.length} photos, keepsakes and memories`}</em>` +
        `<i>Open the memorial page</i></span></a>`;
      return;
    }
    if (!a.photos.length) {
      const wa = data.whatsapp ? ` <a href="${esc(data.whatsapp)}" target="_blank" rel="noopener">Send them to the club on WhatsApp.</a>` : "";
      grid.innerHTML = `<div class="coming"><h3>Photos coming soon</h3><p>Have photos for ${esc(a.name)}?${wa}</p></div>`;
      return;
    }
    a.photos.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tile";
      b.setAttribute("aria-label", `View photo ${i + 1} of ${a.photos.length}`);
      b.innerHTML = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">`;
      b.addEventListener("click", () => lightbox(a.photos, i, b));
      grid.appendChild(b);
    });
  }
  tabs.addEventListener("click", e => {
    const t = e.target.closest("[role=tab]"); if (!t) return;
    selectAlbum(t.dataset.id);
    history.replaceState(null, "", `#gallery/${t.dataset.id}`);
  });
  tabs.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const all = [...tabs.querySelectorAll("[role=tab]")];
    const i = all.indexOf(document.activeElement);
    const next = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
    next.focus(); next.click();
  });

  /* Links like #gallery/legends open that album */
  function route(scroll) {
    const m = location.hash.match(/^#gallery\/([\w-]+)/);
    if (!m) return false;
    selectAlbum(m[1]);
    if (scroll) document.getElementById("albums").scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href*="#gallery/"]'); if (!a || a.pathname !== location.pathname) return;
    e.preventDefault();
    history.pushState(null, "", a.hash);
    route(true);
  });
  addEventListener("popstate", () => route(true));
  if (!route(false)) selectAlbum(albums[0].id);
  else requestAnimationFrame(() => document.getElementById("albums").scrollIntoView({ block: "start" }));

  /* Washing line: photos pegged to a sagging rope, drifting right to left */
  const stage = document.getElementById("line"), holder = document.getElementById("line-photos");
  const rope = document.getElementById("line-rope"), paths = rope.querySelectorAll("path");
  const pool = [];
  const per = Math.ceil(16 / albums.filter(a => a.photos.length).length);
  albums.forEach(a => a.photos.slice(0, per).forEach(p => pool.push({ ...p, album: a.name })));
  for (let i = pool.length - 1; i > 0; i--) { const j = (i * 7919) % (i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  if (!pool.length) { stage.hidden = true; return; }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let seen = false;
  let items = [], W = 0, TOP = 0, SAG = 0, SPAN = 0, GAP = 0, LOOP = 0, offset = 0, paused = false, last = 0, visible = true;

  function build() {
    W = stage.clientWidth;
    const small = W < 640;
    GAP = small ? 150 : 215;               // distance between pegs
    TOP = 18; SAG = Math.min(small ? 46 : 95, W * 0.08);
    SPAN = W + 80;                         // rope runs a little past both edges
    const d = `M -40 ${TOP} Q ${W / 2} ${TOP + 2 * SAG} ${W + 40} ${TOP}`;
    rope.setAttribute("viewBox", `0 0 ${W} ${stage.clientHeight}`);
    paths.forEach(p => p.setAttribute("d", d));
    const count = Math.max(pool.length, Math.ceil((W + GAP * 2) / GAP));
    LOOP = count * GAP;
    holder.innerHTML = "";
    items = Array.from({ length: count }, (_, i) => {
      const p = pool[i % pool.length];
      const el = document.createElement("div");
      el.className = "peg-photo";
      el.innerHTML = `<span class="peg" aria-hidden="true"></span><button type="button" class="polaroid" aria-label="View photo: ${esc(p.alt)}">` +
        `<img ${seen ? "src" : "data-src"}="${esc(p.src)}" alt="" draggable="false"><span>${esc(p.album)}</span></button>`;
      el.querySelector("button").addEventListener("click", e => lightbox(pool, i % pool.length, e.currentTarget));
      holder.appendChild(el);
      return { el, phase: i * 1.7 };
    });
    place(performance.now());
  }

  function place(now) {
    items.forEach((it, i) => {
      let x = ((i * GAP - offset) % LOOP + LOOP) % LOOP - GAP;   // wraps round: off the left edge, back in on the right
      const u = (x + 40) / SPAN;
      const y = TOP + 4 * SAG * u * (1 - u);
      const slope = 4 * SAG * (1 - 2 * u) / SPAN;
      const sway = reduce.matches ? 0 : Math.sin(now / 900 + it.phase) * 2.2;
      const tilt = Math.atan(slope) * 180 / Math.PI * 0.8 + sway;
      it.el.style.transform = `translate(${x}px, ${y}px) rotate(${tilt}deg)`;
    });
  }

  function frame(now) {
    const dt = last ? Math.min(now - last, 64) : 0;
    last = now;
    if (!paused && !reduce.matches) offset += dt * 0.045;   // pixels per millisecond
    place(now);
    if (visible) requestAnimationFrame(frame); else last = 0;
  }

  stage.addEventListener("pointerenter", () => paused = true);
  stage.addEventListener("pointerleave", () => paused = false);
  stage.addEventListener("focusin", () => paused = true);
  stage.addEventListener("focusout", () => paused = false);
  new IntersectionObserver(([e]) => {
    const was = visible; visible = e.isIntersecting;
    if (visible && !seen) { seen = true; holder.querySelectorAll("img[data-src]").forEach(im => { im.src = im.dataset.src; im.removeAttribute("data-src"); }); }
    if (visible && !was) requestAnimationFrame(frame);
  }, { rootMargin: "300px 0px" }).observe(stage);
  let rs;
  addEventListener("resize", () => { clearTimeout(rs); rs = setTimeout(build, 150); });
  build();
  requestAnimationFrame(frame);
})();

/* Announcements and coaching team */
(function () {
  const data = window.GARDENS || {};
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TZ = "Africa/Johannesburg";
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: TZ });   // YYYY-MM-DD

  /* Announcements: urgent first, then newest; expired ones drop off */
  const TAGS = ["Urgent", "Match", "Club", "Training", "Social"];
  const anns = (data.announcements || []).filter(a => !a.until || a.until >= todayStr)
    .sort((a, b) => (b.tag === "Urgent") - (a.tag === "Urgent") || b.date.localeCompare(a.date));
  const list = document.getElementById("ann-list");
  if (list) list.innerHTML = anns.length ? anns.map(a => {
    const tag = TAGS.includes(a.tag) ? a.tag : "Club";
    const when = new Date(`${a.date}T12:00:00+02:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
    const href = a.link ? esc(a.link) : "";
    const ext = /^https?:/.test(a.link || "") ? ' target="_blank" rel="noopener"' : "";
    return `<li class="ann ann-${tag.toLowerCase()}"><div class="ann-top"><span class="ann-tag">${tag}</span><time datetime="${esc(a.date)}">${when}</time></div>` +
      `<h3>${esc(a.title)}</h3><p>${esc(a.body)}</p>` +
      (a.link ? `<a class="ann-link" href="${href}"${ext}>${esc(a.linkText || "Read more")}</a>` : "") + "</li>";
  }).join("") : '<li class="ann-none"><p>No announcements right now. Check back soon.</p></li>';

  /* Bereavement notices, after any urgent notices. Services with no details yet show "To be confirmed". */
  const losses = (data.bereavements || []).filter(b => b && b.name && (!b.until || b.until >= todayStr))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (list && losses.length) {
    const longDate = d => new Date(`${d}T12:00:00+02:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
    const cards = losses.map(b => {
      const services = (b.services || []).filter(s => s && s.name);
      const waiting = services.some(s => !s.details);
      return `<li class="ann ann-memory"><div class="ann-top"><span class="ann-tag">In memory</span>` +
        (b.date ? `<time datetime="${esc(b.date)}">${longDate(b.date)}</time>` : "") + `</div><div class="memory">` +
        (b.photo ? `<img class="memory-photo" src="${esc(b.photo)}" alt="${esc(b.name)}" loading="lazy">` : "") +
        `<div class="memory-text"><p class="memory-lead">In loving memory of</p><h3>${esc(b.name)}</h3>` +
        (b.years ? `<p class="memory-years">${esc(b.years)}</p>` : "") +
        String(b.message || "").split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p>${esc(p.trim())}</p>`).join("") +
        (services.length ? `<dl class="memory-services">` + services.map(s =>
          `<div><dt>${esc(s.name)}</dt><dd${s.details ? "" : ' class="tbc"'}>${esc(s.details || "To be confirmed")}</dd></div>`).join("") + "</dl>" : "") +
        (waiting ? `<p class="memory-note">Service details will be shared here as soon as they are confirmed.</p>` : "") +
        "</div></div>" + messages(b.messages) + "</li>";
    }).join("");
    const none = list.querySelector(".ann-none");
    if (none) none.remove();
    const urgent = list.querySelectorAll(".ann-urgent");
    urgent.length ? urgent[urgent.length - 1].insertAdjacentHTML("afterend", cards) : list.insertAdjacentHTML("afterbegin", cards);
    list.querySelectorAll(".memory-reel").forEach(reel);
  }

  // Condolence messages under a notice: every message is in the page (screen readers read them all);
  // on screen they take turns, one at a time
  function messages(list) {
    const items = (list || []).filter(m => m && m.text);
    if (!items.length) return "";
    return `<div class="memory-messages"><h4>Messages from the Gardens family</h4><ul class="memory-reel">` +
      items.map((m, i) => `<li${i ? "" : ' class="is-on"'}><blockquote><p>${esc(m.text)}</p></blockquote>` +
        (m.name ? `<p class="memory-from">${esc(m.name)}</p>` : "") + "</li>").join("") + "</ul>" +
      (items.length > 1 ? `<div class="memory-reel-controls" hidden><button type="button" class="memory-prev" aria-label="Previous message">Previous</button>` +
        `<span class="memory-count" aria-hidden="true"></span><button type="button" class="memory-next" aria-label="Next message">Next</button>` +
        `<button type="button" class="memory-pause" aria-pressed="false">Pause</button></div>` : "") + "</div>";
  }
  function reel(ul) {
    const items = [...ul.children];
    const box = ul.parentElement, controls = box.querySelector(".memory-reel-controls");
    if (items.length < 2 || !controls) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { ul.classList.add("is-static"); return; }   // all of them, one under the other
    controls.hidden = false;
    let at = 0, paused = false, held = false, timer = null;
    const count = controls.querySelector(".memory-count"), pause = controls.querySelector(".memory-pause");
    const show = i => {
      at = (i + items.length) % items.length;
      items.forEach((li, n) => li.classList.toggle("is-on", n === at));
      count.textContent = `${at + 1} of ${items.length}`;
    };
    const run = () => { clearInterval(timer); timer = paused || held ? null : setInterval(() => show(at + 1), 6000); };
    controls.querySelector(".memory-prev").addEventListener("click", () => { show(at - 1); run(); });
    controls.querySelector(".memory-next").addEventListener("click", () => { show(at + 1); run(); });
    pause.addEventListener("click", () => {
      paused = !paused;
      pause.textContent = paused ? "Play" : "Pause";
      pause.setAttribute("aria-pressed", String(paused));
      run();
    });
    // Hold still while someone is reading it with the mouse over it, or using the buttons
    box.addEventListener("mouseenter", () => { held = true; run(); });
    box.addEventListener("mouseleave", () => { held = false; run(); });
    box.addEventListener("focusin", () => { held = true; run(); });
    box.addEventListener("focusout", e => { if (!box.contains(e.relatedTarget)) { held = false; run(); } });
    show(0);
    run();
  }

  /* Birthdays this month, at the top after any urgent notices and bereavement notices */
  const [, mm, dd] = todayStr.split("-").map(Number);
  const bdays = window.GardensBirthdays.inMonth(mm);
  if (list && bdays.length) {
    const at = new Date(`${todayStr}T12:00:00+02:00`);
    const month = at.toLocaleDateString("en-ZA", { month: "long", timeZone: TZ });
    const short = at.toLocaleDateString("en-ZA", { month: "short", timeZone: TZ });
    const card = `<li class="ann ann-birthday"><div class="ann-top"><span class="ann-tag">Birthdays</span><time>${esc(month)}</time></div>` +
      `<h3>Happy birthday to our ${esc(month)} Gardens family</h3>` +
      `<p>Executive, coaches, players and supporters celebrating this month. From everyone at Gardens RFC: have a wonderful day.</p>` +
      window.GardensBirthdays.list(bdays, short, dd) + "</li>";
    const urgent = list.querySelectorAll(".ann-urgent, .ann-memory");
    const none = list.querySelector(".ann-none");
    if (none) none.remove();
    urgent.length ? urgent[urgent.length - 1].insertAdjacentHTML("afterend", card) : list.insertAdjacentHTML("afterbegin", card);
  }

  /* Coaching team and club executive */
  const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const people = (id, list) => {
    const grid = document.getElementById(id);
    if (grid) grid.innerHTML = (list || []).map(person).join("");
  };
  const person = c => {
    const named = Boolean(c.name && c.name.trim());
    const pic = c.photo
      ? `<img src="${esc(c.photo)}" alt="${esc(c.name || c.role)}" loading="lazy">`
      : named ? `<span class="coach-initials" aria-hidden="true">${esc(initials(c.name))}</span>`
              : '<img class="coach-crest" src="assets/img/logo.png" alt="" loading="lazy">';
    return `<li class="coach${named ? "" : " coach-tbc"}"><div class="coach-pic">${pic}</div><div class="coach-body">` +
      `<p class="coach-role">${esc(c.role)}</p><h3>${named ? esc(c.name) : "To be confirmed"}</h3>` +
      (c.bio ? `<p class="coach-bio">${esc(c.bio)}</p>` : "") + "</div></li>";
  };
  people("coach-grid", data.coaches);
  people("exec-grid", data.executive);
})();

/* Home and the crest: back to the very top (the header itself is fixed, so a plain #top link would not move) */
document.addEventListener("click", e => {
  const a = e.target.closest('a[href="#top"]');
  if (!a) return;
  e.preventDefault();
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  history.replaceState(null, "", location.pathname + location.search);
});

/* Live stream: Facebook or YouTube player, sponsor and support button */
(function () {
  const data = window.GARDENS || {};
  const live = data.live || {};
  const sec = document.getElementById("live");
  if (!sec || !live.on) return;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Work out which player to use from the link
  function embedFor(url, channel) {
    if (url) {
      if (/(^|\.)facebook\.com\/|fb\.watch\//i.test(url))
        return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=false`, name: "Facebook", out: url };
      const m = url.match(/(?:youtu\.be\/|[?&]v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/);
      if (m) return { src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`, name: "YouTube", out: url };
      return null;
    }
    if (channel) return { src: `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channel)}`, name: "YouTube", out: `https://www.youtube.com/channel/${encodeURIComponent(channel)}/live` };
    return null;
  }
  const emb = embedFor((live.url || "").trim(), (live.youtubeChannelId || "").trim());
  if (!emb) { console.warn("Gardens RFC: live.on is true but the stream link is not a Facebook or YouTube link."); return; }

  // Match name: the given title, or the next fixture
  const fx = (data.fixtures || []).filter(f => !(f.score && typeof f.score.us === "number"))
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))[0];
  const title = live.title || (fx ? `${fx.team || "Gardens"} v ${fx.opponent}` : "Gardens RFC");
  document.getElementById("live-title").textContent = title;

  const frame = document.getElementById("live-frame");
  const ifr = document.createElement("iframe");
  ifr.src = emb.src;
  ifr.title = `Live stream: ${title}`;
  ifr.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen";
  ifr.allowFullscreen = true;
  ifr.loading = "lazy";
  frame.appendChild(ifr);

  // Stream sponsor: "Live stream presented by ..."
  const sp = live.sponsor || {};
  if (sp.name) {
    const el = document.getElementById("live-sponsor");
    const inner = (sp.logo ? `<img src="${esc(sp.logo)}" alt="">` : "") + `<b></b>`;
    el.innerHTML = `<span>Live stream presented by</span>` + (sp.url ? `<a href="#" target="_blank" rel="noopener sponsored">${inner}</a>` : `<span class="live-sp">${inner}</span>`);
    el.querySelector("b").textContent = sp.name;
    if (sp.url) el.querySelector("a").href = sp.url;
    el.hidden = false;
  }

  // Support button (payment or donation link)
  const sup = live.support || {};
  if (sup.url) {
    const b = document.getElementById("live-support");
    b.href = sup.url; b.textContent = sup.label || "Support the stream"; b.hidden = false;
  }

  // Share and "watch on" links
  const page = location.href.split("#")[0] + "#live";
  document.getElementById("live-share").href = "https://wa.me/?text=" + encodeURIComponent(`Gardens RFC is live: ${title}. Watch here: ${page}`);
  const out = document.getElementById("live-out");
  out.href = emb.out; out.textContent = `Open on ${emb.name}`; out.hidden = false;

  sec.hidden = false;
  document.querySelectorAll(".nav-live").forEach(a => a.hidden = false);
})();

/* Footer: useful links */
(function () {
  const ul = document.getElementById("foot-links");
  const links = (window.GARDENS && window.GARDENS.usefulLinks) || [];
  if (!ul) return;
  if (!links.length) { ul.closest(".foot-links").hidden = true; return; }
  links.forEach(l => {
    const li = document.createElement("li"), a = document.createElement("a");
    a.href = l.url; a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = '<span class="fl-name"></span><span class="fl-note"></span>';
    a.querySelector(".fl-name").textContent = l.name;
    a.querySelector(".fl-note").textContent = l.note || "";
    li.appendChild(a); ul.appendChild(li);
  });
})();
