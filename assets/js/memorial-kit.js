/* Shared by the memorial pages (oom-charles.html, memorial-wall.html): the photo viewer,
   slow scrolling, music, full screen, and the form that sends memories and photos to the
   club for approval. Each page's own script calls these with its data from data.js. */
window.GardensMemorial = (function () {
  const $ = id => document.getElementById(id);
  const store = (key, value) => {  // remembered per browser; fine if it is blocked
    try { return value === undefined ? localStorage.getItem(key) : localStorage.setItem(key, value); } catch { return null; }
  };

  /* Photo viewer with captions and tap to zoom. open(items, i, button): items are { src, alt, caption } */
  function viewer() {
    const lb = $("lightbox"), img = lb.querySelector("img"), cap = lb.querySelector(".lb-caption");
    let items = [], idx = 0, opener = null;
    const unzoom = () => lb.classList.remove("zoomed");
    const showAt = i => {
      unzoom();
      idx = (i + items.length) % items.length;
      img.src = items[idx].src;
      img.alt = items[idx].alt || "";
      if (cap) { cap.textContent = items[idx].caption || ""; cap.hidden = !items[idx].caption; }
    };
    function close() { unzoom(); lb.hidden = true; document.body.classList.remove("noscroll"); if (opener) opener.focus(); }
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", () => showAt(idx - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => showAt(idx + 1));
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    img.addEventListener("click", e => {
      const r = img.getBoundingClientRect();
      img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      lb.classList.toggle("zoomed");
    });
    document.addEventListener("keydown", e => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showAt(idx - 1);
      if (e.key === "ArrowRight") showAt(idx + 1);
    });
    return {
      open(list, i, btn) {
        items = list; opener = btn;
        lb.querySelectorAll(".lb-nav").forEach(b => { b.hidden = list.length < 2; });
        showAt(i);
        lb.hidden = false; document.body.classList.add("noscroll"); lb.querySelector(".lb-close").focus();
      },
      isOpen: () => !lb.hidden
    };
  }

  /* Slow scrolling: down to the end, a short rest, back up to the top, and again, for as long
     as the page is open. It waits while the visitor scrolls or taps, or while busy() is true
     (photo viewer or form open), and stops for good when they press Pause. Off to start with
     if they prefer less motion. */
  function autoScroll(busy) {
    const btn = $("mem-scroll");
    const SPEED = 30;          // pixels per second
    const REST = 3000;         // pause at the top and bottom
    const AFTER_USER = 8000;   // wait this long after the visitor scrolls or taps before carrying on
    let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let holdUntil = performance.now() + 4000, dir = 1, pos = window.scrollY, last = 0;
    const label = () => { btn.textContent = paused ? "Start scrolling" : "Pause scrolling"; };
    label();
    btn.addEventListener("click", () => { paused = !paused; holdUntil = 0; pos = window.scrollY; label(); });
    const hold = () => { holdUntil = performance.now() + AFTER_USER; };
    ["wheel", "touchstart", "mousedown"].forEach(t => window.addEventListener(t, e => {
      if (!e.target.closest || !e.target.closest("#mem-controls")) hold();
    }, { passive: true }));
    window.addEventListener("keydown", e => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Tab"].includes(e.key)) hold();
    });
    function step(t) {
      const dt = last ? Math.min(t - last, 100) / 1000 : 0;
      last = t;
      const end = document.documentElement.scrollHeight - window.innerHeight;
      if (Math.abs(window.scrollY - pos) > 2) { pos = window.scrollY; if (!paused) hold(); }  // moved by the visitor
      if (!paused && t >= holdUntil && !busy() && end > 0) {
        pos = Math.min(Math.max(pos + dir * SPEED * dt, 0), end);
        if (pos >= end) { dir = -1; holdUntil = t + REST; }
        else if (pos <= 0) { dir = 1; holdUntil = t + REST; }
        window.scrollTo({ top: pos, behavior: "instant" });
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* Music: starts by itself where the browser allows it, otherwise on the first tap or key.
     Visitors can switch it off, and the page remembers that. music is { src, title, credit } */
  function music(cfg, key) {
    if (!cfg || !cfg.src) return;
    const audio = $("mem-audio"), btn = $("mem-music"), song = $("mem-song");
    audio.src = cfg.src;
    audio.volume = .45;
    song.textContent = `♪ ${cfg.title || ""}`;
    song.title = cfg.credit || "";
    song.hidden = btn.hidden = false;
    const credit = $("mem-credit");  // shown at the foot of the page, as some music licences require
    if (credit && cfg.credit) { credit.textContent = cfg.credit; credit.hidden = false; }
    let wanted = store(key) !== "off", hiddenPause = false;
    const play = () => audio.play().catch(() => {});
    const label = () => { btn.textContent = audio.paused ? "Play music" : "Stop music"; };
    audio.addEventListener("play", label);
    audio.addEventListener("pause", label);
    btn.addEventListener("click", () => {
      wanted = audio.paused;
      wanted ? play() : audio.pause();
      store(key, wanted ? "on" : "off");
    });
    const first = e => {
      ["pointerdown", "keydown"].forEach(t => document.removeEventListener(t, first, true));
      if (wanted && audio.paused && !(e.target.closest && e.target.closest("#mem-music"))) play();
    };
    if (wanted) audio.play().catch(() => ["pointerdown", "keydown"].forEach(t => document.addEventListener(t, first, true)));
    // Quiet while the visitor is on another tab, back on when they return
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !audio.paused) { hiddenPause = true; audio.pause(); }
      else if (!document.hidden && hiddenPause) { hiddenPause = false; if (wanted) play(); }
    });
  }

  /* Full screen (not offered where the browser does not support it, such as on iPhones) */
  function fullScreen() {
    const btn = $("mem-full");
    if (!document.fullscreenEnabled) return;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
    });
    document.addEventListener("fullscreenchange", () => {
      btn.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
    });
  }

  /* Add a memory or photos. Goes to the club as "pending" and only appears once approved.
     memorial(form) returns the name it is about, as shown in the Contributions tab. */
  // notes(form): optional lines put in front of the memory, such as dates the family adds
  function shareForm(memorial, notes) {
    const dlg = $("mem-dialog"), form = $("mem-form"), done = dlg.querySelector(".join-done");
    const msg = form.querySelector(".jf-msg"), submit = form.querySelector("[type=submit]");
    const thumbs = $("mem-thumbs"), MAX_PHOTOS = 5;
    let picked = [];  // photos made smaller in the browser, as JPEG data addresses
    function drawThumbs() {
      thumbs.replaceChildren(...picked.map((src, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<img src="${src}" alt="Photo ${i + 1}"><button type="button" aria-label="Remove photo ${i + 1}">&times;</button>`;
        li.querySelector("button").addEventListener("click", () => { picked.splice(i, 1); drawThumbs(); });
        return li;
      }));
    }
    // Long side at most 1600 pixels: sharp on screen, and quick to send from a phone
    async function shrink(file) {
      const src = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = src;
        await img.decode();
        const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", .82);
      } finally {
        URL.revokeObjectURL(src);
      }
    }
    form.elements.photos.addEventListener("change", async e => {
      msg.textContent = "";
      const chosen = [...e.target.files];
      e.target.value = "";
      for (const f of chosen) {
        if (picked.length >= MAX_PHOTOS) { msg.textContent = `You can send up to ${MAX_PHOTOS} photos at a time.`; break; }
        try { picked.push(await shrink(f)); }
        catch { msg.textContent = `"${f.name}" could not be opened. Please choose a JPG or PNG photo.`; }
      }
      drawThumbs();
    });
    dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
    form.addEventListener("input", e => {
      e.target.classList.remove("invalid");
      if (e.target.name === "body") $("mem-count").textContent = `${e.target.value.length} / 2500`;
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      msg.textContent = "";
      form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
      const bad = [...form.elements].filter(el => el.willValidate && el.type !== "file" && !el.checkValidity());
      if (bad.length) {
        bad.forEach(el => el.classList.add("invalid")); bad[0].focus();
        msg.textContent = bad[0].name === "consent" ? "Please tick the box so the club can publish it." : "Please complete the highlighted fields.";
        return;
      }
      const f = form.elements;
      const extra = notes ? notes(form) : "";
      if (!f.body.value.trim() && !picked.length && !extra) {
        f.body.classList.add("invalid"); f.body.focus();
        msg.textContent = "Please write a memory or add at least one photo.";
        return;
      }
      const body = { kind: "memory", memorial: memorial(form), name: f.name.value, role: f.role.value, email: f.email.value,
        phone: f.phone.value, body: (extra ? extra + "\n\n" + f.body.value : f.body.value).trim().slice(0, 2500), photos: picked, consent: f.consent.checked, website: f.website.value };
      submit.disabled = true; submit.setAttribute("aria-busy", "true");
      try {
        await window.GardensSend("contributions", body);
        form.reset(); picked = []; drawThumbs(); $("mem-count").textContent = "0 / 2500";
        form.hidden = true; done.hidden = false;
      } catch (err) { msg.textContent = err.message; }
      finally { submit.disabled = false; submit.removeAttribute("aria-busy"); }
    });
    return {
      open(preset) {
        form.hidden = false; done.hidden = true; msg.textContent = "";
        form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
        if (form.elements.remembering && preset) form.elements.remembering.value = preset;
        dlg.showModal(); form.elements.name.focus();
      },
      isOpen: () => dlg.open
    };
  }

  return { viewer, autoScroll, music, fullScreen, shareForm, store };
})();
