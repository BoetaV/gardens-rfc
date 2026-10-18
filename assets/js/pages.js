/* Inner pages: Join as a player, Club documents, Supporters Club and Privacy.
   The home page and the section pages (Club, Teams, Matches...) use main.js; these pages only need
   the menu, the footer and their own content. */
(function () {
  const data = window.GARDENS || {};
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TZ = "Africa/Johannesburg";
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: TZ });   // YYYY-MM-DD
  const day = (d, o) => new Date(`${d}T12:00:00+02:00`).toLocaleDateString("en-ZA", { ...o, timeZone: TZ });
  const wa = (num, text) => num ? `https://wa.me/${String(num).replace(/\D/g, "")}?text=${encodeURIComponent(text)}` : (data.whatsapp || "");
  const tbc = v => v ? esc(v) : '<span class="tbc">To be confirmed by the club</span>';
  const $ = id => document.getElementById(id);

  /* Mobile menu and menu folders */
  const toggle = document.querySelector(".nav-toggle"), nav = $("nav");
  const closeNav = () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", () => toggle.setAttribute("aria-expanded", nav.classList.toggle("open")));
  const dds = [...document.querySelectorAll(".dropdown")];
  const setDD = (dd, open) => { dd.classList.toggle("open", open); dd.querySelector(".dd-btn").setAttribute("aria-expanded", open); };
  dds.forEach(dd => dd.querySelector(".dd-btn").addEventListener("click", e => {
    e.stopPropagation();
    const open = !dd.classList.contains("open");
    dds.forEach(o => setDD(o, false));
    setDD(dd, open);
  }));
  nav.addEventListener("click", e => { if (e.target.tagName === "A") { dds.forEach(o => setDD(o, false)); closeNav(); } });
  document.addEventListener("click", e => dds.forEach(dd => { if (!dd.contains(e.target)) setDD(dd, false); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") dds.forEach(dd => setDD(dd, false)); });

  // The Media and Sponsors menu lists are filled by site.js

  /* Footer: WhatsApp icon and useful links */
  if (data.whatsapp) document.querySelectorAll(".socials").forEach(ul => ul.insertAdjacentHTML("beforeend",
    `<li><a class="soc soc-whatsapp" href="${esc(data.whatsapp)}" target="_blank" rel="noopener" aria-label="Gardens RFC on WhatsApp" title="WhatsApp"><svg aria-hidden="true" focusable="false"><use href="#i-whatsapp"/></svg></a></li>`));
  const fl = $("foot-links");
  if (fl) fl.innerHTML = (data.usefulLinks || []).map(l =>
    `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span class="fl-name">${esc(l.name)}</span><span class="fl-note">${esc(l.note)}</span></a></li>`).join("");

  /* ---------- Join as a player ---------- */
  const p = data.players;
  if ($("player-facts") && p) {
    const contact = [p.contactName, p.contactRole].filter(Boolean).join(", ");
    $("player-facts").innerHTML =
      `<div><dt>Speak to</dt><dd>${tbc(contact)}</dd></div>` +
      (p.email ? `<div><dt>Email</dt><dd><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></dd></div>` : "") +
      `<div><dt>Training</dt><dd>${tbc(p.training)}</dd></div>` +
      `<div><dt>Pre-season</dt><dd>${tbc(p.preseason)}</dd></div>` +
      `<div><dt>Season fees</dt><dd>${(p.fees || []).map(f => `${esc(f.label)}: ${tbc(f.amount)}`).join("<br>")}</dd></div>`;
    $("transfer-cutoff").innerHTML = p.transferCutoff
      ? esc(p.transferCutoff) + "."
      : "The union sets a cut-off date for transfers each season. Ask the club for this season's date before you apply.";
    document.querySelectorAll("[data-wa]").forEach(a => {
      a.href = wa(p.whatsapp, a.dataset.wa);
      a.target = "_blank"; a.rel = "noopener";
    });
  }

  /* ---------- Club documents ---------- */
  const docs = data.documents || [];
  const docWrap = $("doc-groups");
  if (docWrap) {
    const ORDER = ["Governance", "Codes of conduct", "Policies", "Player welfare", "Players", "Meetings"];
    const cats = [...new Set([...ORDER.filter(c => docs.some(d => d.category === c)), ...docs.map(d => d.category || "Other")])];
    let current = "All", query = "";
    const ext = f => (f.match(/\.([a-z0-9]+)$/i) || [, "PDF"])[1].toUpperCase();
    const updated = ym => /^\d{4}-\d{2}/.test(ym || "") ? "Updated " + day(ym.slice(0, 7) + "-15", { month: "long", year: "numeric" }) : "";
    const card = d => {
      const ready = Boolean(d.file);
      const meta = [d.category, updated(d.updated)].filter(Boolean).map(esc).join(" · ");
      return `<li class="doc${ready ? "" : " doc-pending"}"><div class="doc-icon" aria-hidden="true"><span>${ready ? esc(ext(d.file)) : "..."}</span></div>` +
        `<div class="doc-body"><h3>${esc(d.title)}</h3><p>${esc(d.summary)}</p>` +
        `<p class="doc-meta">${ready ? "" : '<span class="doc-status">Being prepared</span>'}<span>${meta}</span></p>` +
        (ready ? `<p class="doc-actions"><a href="${esc(d.file)}" target="_blank" rel="noopener">Read online<span class="sr-only">: ${esc(d.title)}</span></a>` +
                 `<a href="${esc(d.file)}" download>Download<span class="sr-only">: ${esc(d.title)}</span></a></p>` : "") +
        "</div></li>";
    };
    function render() {
      const q = query.trim().toLowerCase();
      const shown = docs.filter(d => (current === "All" || d.category === current) &&
        (!q || `${d.title} ${d.summary} ${d.category}`.toLowerCase().includes(q)));
      docWrap.innerHTML = shown.length ? cats.map(c => {
        const inCat = shown.filter(d => (d.category || "Other") === c);
        return inCat.length ? `<section class="doc-group" aria-labelledby="dg-${c.replace(/\W+/g, "-")}"><h2 id="dg-${c.replace(/\W+/g, "-")}">${esc(c)}</h2><ul class="doc-list">${inCat.map(card).join("")}</ul></section>` : "";
      }).join("") : `<p class="doc-none">No documents match${q ? ` "${esc(query.trim())}"` : ""}. Try another word or show all.</p>`;
      $("doc-count").textContent = `${shown.length} of ${docs.length} documents`;
    }
    const chips = $("doc-chips");
    chips.innerHTML = ["All", ...cats].map(c => `<button type="button" aria-pressed="${c === "All"}">${esc(c)}</button>`).join("");
    chips.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      current = b.textContent;
      chips.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      render();
    });
    $("doc-q").addEventListener("input", e => { query = e.target.value; render(); });
    render();

    const ready = docs.filter(d => d.file).length;
    $("doc-ready").textContent = ready === docs.length ? "Every document is available to read and download."
      : `${ready} of ${docs.length} documents are online. The rest are being prepared by the executive committee.`;
    const rb = $("rulebooks");
    if (rb) rb.innerHTML = (data.rulebooks || []).map(l =>
      `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span class="fl-name">${esc(l.name)}</span><span class="fl-note">${esc(l.note)}</span></a></li>`).join("");
    const ask = $("doc-ask");
    if (ask) ask.href = wa(String(data.whatsapp || "").replace(/\D/g, ""), "Hi Gardens RFC, please can I have a copy of the following club document: ");
  }

  /* ---------- Supporters Club ---------- */
  const sc = data.supporters;
  if ($("trips") && sc) {
    const upcoming = list => (list || []).filter(x => x.date >= todayStr).sort((a, b) => (a.date + (a.time || a.departs || "")).localeCompare(b.date + (b.time || b.departs || "")));
    const sample = x => x.sample ? '<span class="sample-tag">Example</span>' : "";

    /* Away-game transport */
    const trips = upcoming(sc.trips);
    $("trips").innerHTML = trips.length ? trips.map(t => {
      const seats = +t.seats || 0, booked = Math.min(+t.booked || 0, seats), left = seats - booked;
      const when = day(t.date, { weekday: "long", day: "numeric", month: "long" });
      const msg = `Hi Gardens Supporters Club, I would like to book seats on the bus to ${t.opponent} on ${when}.\nName:\nNumber of seats:\nPick-up point: ${t.from || ""}`;
      const facts = [["Bus leaves", t.departs], ["From", t.from], ["Back", t.returns], ["Cost", t.price]].filter(([, v]) => v);
      return `<li class="trip"><div class="trip-date"><span>${day(t.date, { weekday: "short" })}</span><b>${day(t.date, { day: "numeric" })}</b><span>${day(t.date, { month: "short" })}</span></div>` +
        `<div class="trip-body"><h3>v ${esc(t.opponent)}${sample(t)}</h3><p class="trip-venue">${esc(t.venue || "Venue to be confirmed")}</p>` +
        `<dl class="trip-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>` +
        `<div class="trip-book${seats && left <= seats * .2 ? " seats-low" : ""}">` +
        (seats ? `<div class="seats"><span class="seats-label"><span>${left > 0 ? `${left} seats left` : "Bus full"}</span><span>${booked} / ${seats}</span></span>` +
                 `<span class="seats-bar" role="img" aria-label="${booked} of ${seats} seats booked"><i style="--fill:${Math.round(booked / seats * 100)}%"></i></span></div>` : "") +
        (seats && left <= 0
          ? `<a class="btn btn-ghost" href="${esc(wa(sc.whatsapp, msg.replace("book seats", "go on the waiting list")))}" target="_blank" rel="noopener">Join the waiting list</a>`
          : `<a class="btn btn-red" href="${esc(wa(sc.whatsapp, msg))}" target="_blank" rel="noopener">Book a seat</a>`) +
        "</div></li>";
    }).join("") : '<li class="trips-none"><p>No away trips are booking right now. Trips are posted here as soon as the fixtures and buses are confirmed.</p></li>';

    /* Functions: same cards as the home page's community list */
    const fns = upcoming(sc.functions);
    $("sc-functions").innerHTML = fns.length ? fns.map(f =>
      `<li class="cm-card cm-club"><div class="cm-date"><span>${day(f.date, { weekday: "short" })}</span><b>${day(f.date, { day: "numeric" })}</b><span>${day(f.date, { month: "short" })}</span></div>` +
      `<div class="cm-body"><p class="cm-tags"><span class="cm-cat">Supporters Club</span>${f.sample ? '<span class="cm-sample">Example</span>' : ""}</p>` +
      `<h3>${esc(f.title)}</h3><p class="cm-meta">${[f.time, f.venue, f.price].filter(Boolean).map(esc).join(" · ")}</p>` +
      (f.details ? `<p>${esc(f.details)}</p>` : "") +
      `<p><a class="ann-link" href="${esc(wa(sc.whatsapp, `Hi Gardens Supporters Club, I would like to book for ${f.title} on ${day(f.date, { day: "numeric", month: "long" })}.\nName:\nNumber of people:`))}" target="_blank" rel="noopener">Book your place</a></p></div></li>`).join("")
      : '<li class="cm-none"><p>No functions on the calendar yet. Watch this space.</p></li>';

    /* Travel rules, committee, membership */
    $("sc-rules").innerHTML = (sc.rules || []).map(r => `<li>${esc(r)}</li>`).join("");
    const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    $("sc-committee").innerHTML = (sc.committee || []).map(c => {
      const named = Boolean(c.name && c.name.trim());
      const pic = c.photo ? `<img src="${esc(c.photo)}" alt="${esc(c.name || c.role)}" loading="lazy">`
        : named ? `<span class="coach-initials" aria-hidden="true">${esc(initials(c.name))}</span>`
        : '<img class="coach-crest" src="assets/img/logo.png" alt="" loading="lazy">';
      return `<li class="coach${named ? "" : " coach-tbc"}"><div class="coach-pic">${pic}</div><div class="coach-body">` +
        `<p class="coach-role">${esc(c.role)}</p><h3>${named ? esc(c.name) : "To be confirmed"}</h3></div></li>`;
    }).join("");
    $("sc-facts").innerHTML =
      `<div><dt>Membership</dt><dd>${tbc(sc.membership)}</dd></div>` +
      `<div><dt>Meetings</dt><dd>${tbc(sc.meets)}</dd></div>`;
    document.querySelectorAll("[data-sc-wa]").forEach(a => {
      a.href = wa(sc.whatsapp, a.dataset.scWa);
      a.target = "_blank"; a.rel = "noopener";
    });
  }
})();
