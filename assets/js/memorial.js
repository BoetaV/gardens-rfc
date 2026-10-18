/* Memorial page for one person (oom-charles.html): fills the tribute, keepsake shelf, photo wall
   and memories from data.js (memorials) and the photo folder list (photos.js, made by
   build_gallery.py). Scrolling, music, the photo viewer and the share form are in memorial-kit.js. */
(function () {
  const data = window.GARDENS || {};
  const kit = window.GardensMemorial;
  const id = document.body.dataset.memorial;
  const m = (data.memorials || {})[id];
  if (!m) return;
  const $ = elId => document.getElementById(elId);
  const files = (window.GARDENS_PHOTOS || {})[m.folder] || [];
  const url = f => `assets/img/${encodeURIComponent(m.folder)}/${encodeURIComponent(f)}`;
  const show = (elId, text) => {
    const el = $(elId);
    if (text) { el.textContent = text; el.hidden = false; }
  };

  /* Tribute */
  $("mem-name").textContent = m.name;
  show("mem-full", m.fullName);
  show("mem-years", m.years);
  show("mem-tribute", m.tribute);
  if (m.verse) {
    const v = $("mem-verse");
    v.querySelector("p").textContent = m.verse;
    v.querySelector("cite").textContent = m.verseRef || "";
    v.hidden = false;
  }
  const portrait = $("mem-portrait");
  const pf = files.includes(m.portrait) ? m.portrait : files[0];
  if (pf) { portrait.src = url(pf); portrait.alt = `Portrait of ${m.name}`; }
  else portrait.closest(".mem-portrait").hidden = true;

  /* Keepsake shelf */
  $("mem-shelf").innerHTML = (m.shelf || []).map(s =>
    `<li><svg viewBox="0 0 120 120" aria-hidden="true"><use href="#item-${s.item}"/></svg>` +
    `<span class="mem-plaque"></span></li>`).join("");
  document.querySelectorAll("#mem-shelf .mem-plaque").forEach((el, i) => el.textContent = m.shelf[i].label);
  if (!(m.shelf || []).length) document.querySelector(".mem-shelf-wrap").hidden = true;

  /* Photo wall: gold frames, hung slightly crooked */
  const view = kit.viewer();
  const photos = files.map((f, i) => ({ src: url(f), alt: `${m.name}, photo ${i + 1} of ${files.length}` }));
  const wall = $("mem-wall");
  photos.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mem-photo";
    b.style.setProperty("--tilt", `${[-1.6, 1.1, -0.6, 1.7, -1.2, 0.7][i % 6]}deg`);
    b.setAttribute("aria-label", `View ${p.alt}`);
    b.innerHTML = `<span class="mem-nail" aria-hidden="true"></span><span class="mem-mat"><img src="${p.src}" alt="" loading="lazy"></span>`;
    b.addEventListener("click", () => view.open(photos, i, b));
    wall.appendChild(b);
  });
  if (!photos.length) wall.innerHTML = '<p class="mem-sub">Photos will be added soon.</p>';

  /* Approved memories */
  const notes = (m.memories || []).filter(n => n && n.text);
  notes.forEach(n => {
    const fig = document.createElement("figure");
    fig.className = "mem-note";
    fig.innerHTML = "<blockquote><p></p></blockquote><figcaption></figcaption>";
    fig.querySelector("p").textContent = n.text;
    fig.querySelector("figcaption").textContent = n.name || "";
    $("mem-notes").appendChild(fig);
  });
  if (notes.length) document.querySelector(".mem-notes-wrap").hidden = false;

  /* Share a memory, scrolling, music, full screen */
  const share = kit.shareForm(() => m.name);
  $("mem-memory").addEventListener("click", () => share.open());
  kit.autoScroll(() => view.isOpen() || share.isOpen());
  kit.music(m.music, "gardens-memorial-music");
  kit.fullScreen();

  $("mem-wa").href = "https://wa.me/?text=" +
    encodeURIComponent(`Gardens RFC remembers ${m.name}: ${location.href.split("#")[0]}`);
})();
