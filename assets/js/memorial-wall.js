/* The Wall of Remembrance (memorial-wall.html): a card for each person in data.js (memorials.memorial.people),
   candles visitors can light (one each per person, counted for everyone by the club server), a name search, the list of names and group photos. Photos come from the
   folder list (photos.js). Scrolling, music, the photo viewer and the share form are in memorial-kit.js. */
(function () {
  const data = window.GARDENS || {};
  const kit = window.GardensMemorial;
  const w = (data.memorials || {})[document.body.dataset.memorial];
  if (!w) return;
  const $ = id => document.getElementById(id);
  const files = (window.GARDENS_PHOTOS || {})[w.folder] || [];
  const url = f => `assets/img/${encodeURIComponent(w.folder)}/${encodeURIComponent(f)}`;
  const plain = s => s.replace(/["“”]/g, "").toLowerCase();
  const slug = s => "p-" + plain(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const view = kit.viewer();

  /* Words of remembrance and the club verse */
  $("wall-title").textContent = w.name;
  $("wall-words").textContent = w.words || "";
  const verse = $("wall-verse");
  verse.querySelector("p").textContent = w.verse || "";
  verse.querySelector("cite").textContent = w.verseRef ? `${w.verseRef} · The Gardens verse` : "";
  verse.hidden = !w.verse;

  /* People: only photos that are really in the folder */
  const people = (w.people || []).map(p => ({ ...p, photos: (p.photos || []).filter(f => files.includes(f)) }));
  const items = [], first = [];  // every notice in one list, so the viewer can go through the whole wall
  people.forEach(p => {
    first.push(items.length);
    p.photos.forEach((f, i) => items.push({ src: url(f), alt: `Notice for ${p.name}`,
      caption: [p.name, p.years, p.photos.length > 1 ? `${i + 1} of ${p.photos.length}` : ""].filter(Boolean).join(" · ") }));
  });

  /* Special days: each person's birthday and the day they passed on (born and passed in data.js),
     and the club's own days of remembrance (specialDays). Dates are South African time.
     Add ?today=2026-03-14 to the address to preview the wall on another day. */
  const TZ = "Africa/Johannesburg";
  const preview = (new URLSearchParams(location.search).get("today") || "").match(/^\d{4}-\d{2}-\d{2}$/);
  const today = preview ? preview[0] : new Date().toLocaleDateString("en-CA", { timeZone: TZ });   // YYYY-MM-DD
  const year = +today.slice(0, 4), md = today.slice(5);
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const sameDay = mmdd => mmdd === md || (mmdd === "02-29" && md === "02-28" && !leap(year));   // 29 Feb falls on 28 Feb
  const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
  const longDate = d => new Date(`${d}T12:00:00+02:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  const firstName = p => (p.name.match(/"([^"]+)"/) || [])[1] || p.name.split(" ")[0];
  const clubDays = (w.specialDays || []).filter(d => /^\d{2}-\d{2}$/.test(d.date || "") && sameDay(d.date));
  function occasion(p) {   // today's special day for this person, or null
    if (isDate(p.born) && sameDay(p.born.slice(5)) && +p.born.slice(0, 4) < year)
      return { key: `birthday-${year}`, badge: "Birthday today", button: "Light a birthday candle",
               text: `Would have turned ${year - p.born.slice(0, 4)} today` };
    if (isDate(p.passed) && sameDay(p.passed.slice(5)) && +p.passed.slice(0, 4) < year) {
      const n = year - p.passed.slice(0, 4);
      return { key: `passed-${year}`, badge: "Remembered today", button: "Light a candle today",
               text: `${n} year${n === 1 ? "" : "s"} since ${firstName(p)} passed on` };
    }
    if (clubDays.length)
      return { key: `day-${md}-${year}`, badge: clubDays[0].name, button: "Light a candle today", text: clubDays[0].name };
    return null;
  }

  /* Candles: any day, a visitor can light one candle for each person, and one more on each of that
     person's special days. This browser remembers which it lit (the person's name, or "name|occasion");
     the club server keeps the count for each person across every visitor. Without a server the counts stay hidden. */
  const KEY = "gardens-wall-candles";
  let lit;
  try { lit = new Set(JSON.parse(kit.store(KEY) || "[]")); } catch { lit = new Set(); }
  const who = entry => entry.split("|")[0];
  let tally = null;   // { name: candles lit by everyone }, once the server answers
  const painters = [];
  const plural = n => `${n.toLocaleString("en-ZA")} candle${n === 1 ? "" : "s"}`;
  const count = () => {
    const total = tally ? people.reduce((s, p) => s + (tally[p.name] || 0), 0) : 0;
    $("wall-count").textContent = `${people.length} names on the wall` +
      (total ? ` · ${plural(total)} lit in their memory` : "") +
      (lit.size ? ` · You have lit ${lit.size}` : "");
  };
  const refresh = () => { painters.forEach(f => f()); count(); };
  const save = counts => { if (counts && typeof counts === "object") { tally = counts; refresh(); } };
  // Candles this browser has added to the shared count. Ones lit before the count existed are sent once now.
  const SENT = "gardens-wall-candles-counted";
  let sent;
  try { sent = new Set(JSON.parse(kit.store(SENT) || "[]")); } catch { sent = new Set(); }
  const send = entry => window.GardensSend("candles", { name: who(entry) }).then(r => {
    sent.add(entry); kit.store(SENT, JSON.stringify([...sent])); save(r.counts);
  });
  const unsent = [...lit].filter(e => !sent.has(e) && people.some(p => p.name === who(e)));
  // Online before the Google Sheet is set up: candles still light in this browser, and the
  // count shared by every visitor waits until the forms open
  if (!window.GardensBackend.open) {
    const note = document.createElement("p");
    note.className = "forms-soon";
    note.textContent = "Candle counts for every visitor start when the online forms open. Your candles are remembered on this device.";
    $("wall-count").after(note);
  }
  if (window.GardensBackend.open) window.GardensSend("candles", {}).then(r => {
    save(r.counts);
    unsent.reduce((chain, e) => chain.then(() => send(e)), Promise.resolve()).catch(() => {});
  }).catch(() => { /* no server: counts stay hidden */ });

  /* The wall */
  const grid = $("wall-grid");
  const todays = [];   // people with a special day today, for "Remembered today"
  people.forEach((p, n) => {
    const li = document.createElement("li");
    li.className = "wall-card";
    li.id = slug(p.name);
    li.style.setProperty("--d", `${(n % 4) * 80}ms`);
    li.innerHTML =
      `<p class="wall-badge" hidden></p>` +
      `<button type="button" class="wall-photo"><span class="wall-flame" aria-hidden="true"></span>` +
      `<span class="wall-oval"><img alt="" loading="lazy"></span></button>` +
      `<h3></h3><p class="wall-years"></p><p class="wall-dates"></p><p class="wall-occasion" hidden></p><p class="wall-about"></p>` +
      `<div class="wall-actions"><button type="button" class="wall-candle" aria-pressed="false"></button>` +
      `<button type="button" class="wall-share">Share a memory</button></div>` +
      `<p class="wall-tally" hidden></p>`;
    const img = li.querySelector("img"), photo = li.querySelector(".wall-photo");
    if (p.photos.length) {
      img.src = url(p.photos[0]);
      if (p.focus) img.style.objectPosition = p.focus;
      photo.setAttribute("aria-label", `View the notice for ${p.name}`);
      photo.addEventListener("click", () => view.open(items, first[n], photo));
    } else {
      photo.disabled = true;
      li.querySelector(".wall-oval").classList.add("wall-oval-empty");
    }
    li.querySelector("h3").textContent = p.name;
    const years = li.querySelector(".wall-years"), about = li.querySelector(".wall-about"), dates = li.querySelector(".wall-dates");
    years.textContent = p.years || ""; years.hidden = !p.years;
    about.textContent = p.about || ""; about.hidden = !p.about;
    dates.textContent = [isDate(p.born) ? `Born ${longDate(p.born)}` : "", isDate(p.passed) ? `Passed on ${longDate(p.passed)}` : ""].filter(Boolean).join(" · ");
    dates.hidden = !dates.textContent;
    if (p.page) {
      const a = document.createElement("a");
      a.className = "wall-page"; a.href = p.page; a.textContent = "Visit the memorial page";
      li.querySelector(".wall-actions").prepend(a);
    }
    const occ = occasion(p);
    if (occ) {
      li.classList.add("special");
      li.querySelector(".wall-badge").textContent = occ.badge;
      li.querySelector(".wall-badge").hidden = false;
      li.querySelector(".wall-occasion").textContent = occ.text;
      li.querySelector(".wall-occasion").hidden = false;
      todays.push({ p, occ });
    }
    const todayKey = occ && `${p.name}|${occ.key}`;
    const next = () => todayKey && !lit.has(todayKey) ? todayKey : !lit.has(p.name) ? p.name : null;   // the candle a click lights
    const candle = li.querySelector(".wall-candle"), tallyEl = li.querySelector(".wall-tally");
    const paint = () => {
      const entry = next(), mine = [...lit].some(e => who(e) === p.name);
      li.classList.toggle("lit", mine);
      candle.setAttribute("aria-pressed", !entry);
      candle.textContent = !entry ? "Candle lit" : entry === todayKey ? occ.button : "Light a candle";
      candle.setAttribute("aria-label", !entry ? `You have lit a candle for ${p.name}` : `${candle.textContent} for ${p.name}`);
      const c = tally ? tally[p.name] || 0 : 0;
      tallyEl.textContent = c ? `${plural(c)} lit` : "No candles lit yet";
      tallyEl.classList.toggle("wall-tally-none", !c);
      tallyEl.hidden = !tally;
    };
    painters.push(paint);
    // One candle per visitor for each person, and one more on each of their special days
    candle.addEventListener("click", () => {
      const entry = next();
      if (!entry) return;
      lit.add(entry);
      kit.store(KEY, JSON.stringify([...lit]));
      if (tally) tally[p.name] = (tally[p.name] || 0) + 1;   // shown at once; the server's answer replaces it
      refresh();
      send(entry).catch(() => {});
    });
    paint();
    li.querySelector(".wall-share").addEventListener("click", () => share.open(p.name));
    grid.appendChild(li);
  });
  count();

  /* Cards rise gently into view as the page scrolls */
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.body.classList.add("wall-reveal");
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("shown"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    grid.querySelectorAll(".wall-card").forEach(c => io.observe(c));
  }

  /* Find a name */
  const find = $("wall-find"), found = $("wall-found");
  find.addEventListener("input", () => {
    const q = plain(find.value.trim());
    let shown = 0;
    grid.querySelectorAll(".wall-card").forEach((c, i) => {
      const hit = !q || plain(people[i].name).includes(q);
      c.hidden = !hit; if (hit) shown++;
    });
    found.textContent = q ? (shown ? `${shown} of ${people.length}` : "No one by that name yet. You can add them below.") : "";
  });

  /* Every name, in one list, with the candles lit for them: select one to go to their card */
  const roll = $("wall-roll");
  people.forEach(p => {
    const li = document.createElement("li"), a = document.createElement("a"), lights = document.createElement("span");
    a.href = `#${slug(p.name)}`;
    a.textContent = p.name;
    lights.className = "wall-roll-count";
    painters.push(() => {
      const n = tally ? tally[p.name] || 0 : 0;
      lights.textContent = n.toLocaleString("en-ZA");
      lights.setAttribute("aria-label", plural(n) + " lit");
      lights.hidden = !n;
    });
    a.addEventListener("click", e => {
      e.preventDefault();
      find.value = ""; find.dispatchEvent(new Event("input"));
      const card = $(slug(p.name));
      card.classList.add("shown");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
      card.querySelector(".wall-candle").focus({ preventScroll: true });
    });
    li.append(a, lights);
    roll.appendChild(li);
  });
  refresh();

  /* Remembered today: birthdays and the days people passed on, at the top of the page */
  const strip = $("wall-today"), personal = todays.filter(t => !t.occ.key.startsWith("day-"));
  if (personal.length || clubDays.length) {
    if (clubDays.length) {
      strip.querySelector(".wall-today-day").textContent = `${clubDays[0].name}: light a candle for everyone on the wall today.`;
      strip.querySelector(".wall-today-day").hidden = false;
    }
    personal.forEach(({ p, occ }) => {
      const li = document.createElement("li"), a = document.createElement("a"), why = document.createElement("span");
      a.href = `#${slug(p.name)}`;
      a.textContent = p.name;
      why.textContent = occ.badge === "Birthday today" ? `Birthday · ${occ.text.toLowerCase()}` : occ.text;
      a.addEventListener("click", e => { e.preventDefault(); roll.querySelector(`a[href="#${slug(p.name)}"]`).click(); });
      li.append(a, why);
      strip.querySelector("ul").appendChild(li);
    });
    strip.hidden = false;
  }
  $("wall-names").innerHTML = people.map(() => "<option>").join("");
  $("wall-names").querySelectorAll("option").forEach((o, i) => { o.value = people[i].name.replace(/"/g, ""); });

  /* Group photos, plus any photo in the folder that is not on a card yet */
  const listed = new Set([...people.flatMap(p => p.photos), ...(w.moments || []).map(m => m.photo)]);
  const moments = [...(w.moments || []).filter(m => files.includes(m.photo)),
    ...files.filter(f => !listed.has(f)).map(f => ({ photo: f, caption: "" }))]
    .map((m, i, all) => ({ src: url(m.photo), alt: m.caption || `From the Gardens family, photo ${i + 1} of ${all.length}`, caption: m.caption }));
  const mwall = $("wall-moments");
  moments.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mem-photo";
    b.style.setProperty("--tilt", `${[-1.6, 1.1, -0.6, 1.7, -1.2, 0.7][i % 6]}deg`);
    b.setAttribute("aria-label", `View ${p.alt}`);
    b.innerHTML = `<span class="mem-nail" aria-hidden="true"></span><span class="mem-mat"><img src="${p.src}" alt="" loading="lazy"></span>`;
    b.addEventListener("click", () => view.open(moments, i, b));
    mwall.appendChild(b);
  });
  mwall.closest("section").hidden = !moments.length;

  /* Approved memories */
  const notes = (w.memories || []).filter(n => n && n.text);
  notes.forEach(n => {
    const fig = document.createElement("figure");
    fig.className = "mem-note";
    fig.innerHTML = "<blockquote><p></p></blockquote><figcaption></figcaption>";
    fig.querySelector("p").textContent = n.text;
    fig.querySelector("figcaption").textContent = [n.name, n.remembering ? `remembering ${n.remembering}` : ""].filter(Boolean).join(", ");
    $("mem-notes").appendChild(fig);
  });
  if (notes.length) document.querySelector(".mem-notes-wrap").hidden = false;

  /* Add to the wall, scrolling, music, full screen */
  // Dates the family adds go at the top of the memory, for the club to add to data.js (born, passed)
  const share = kit.shareForm(form => `${form.elements.remembering.value.trim()} (Wall of Remembrance)`, form => {
    const born = form.elements.born.value, passed = form.elements.passed.value;
    return [isDate(born) ? `Date of birth: ${longDate(born)} (${born})` : "", isDate(passed) ? `Date passed on: ${longDate(passed)} (${passed})` : ""]
      .filter(Boolean).join("\n");
  });
  $("mem-memory").addEventListener("click", () => share.open());
  kit.autoScroll(() => view.isOpen() || share.isOpen());
  kit.music(w.music, "gardens-memorial-music");
  kit.fullScreen();

  $("mem-wa").href = "https://wa.me/?text=" +
    encodeURIComponent(`Gardens RFC remembers the members, families and supporters we have lost: ${location.href.split("#")[0]}`);
})();
