/* Gardens RFC: sponsor adverts beside the hero.
   Plays every advert in data.js (adverts: [...]) in turn, then starts again.
   One advert on its own simply loops. */
(() => {
  const box = document.getElementById("hero-ad");
  const ads = ((window.GARDENS && window.GARDENS.adverts) || []).filter(a => a.video || a.image);
  if (!box || !ads.length) return;

  const vid = box.querySelector(".hero-ad-video");
  const img = box.querySelector(".hero-ad-img");
  const btn = box.querySelector(".hero-ad-play");
  const soundBtn = box.querySelector(".hero-ad-sound");
  const bar = box.querySelector(".hero-ad-bar i");
  const name = box.querySelector(".hero-ad-name");
  const count = box.querySelector(".hero-ad-count");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Browsers only allow sound after the visitor asks for it, so every advert starts silent
  let i = 0, playing = !reduce, onScreen = true, still = 0, last = 0, failed = 0, soundOn = false;

  box.hidden = false;
  box.closest(".hero-body").classList.add("has-ad");

  const live = () => playing && onScreen && !document.hidden;

  function sync() {
    if (!ads[i].video) return;
    if (live()) vid.play().catch(() => {});
    else vid.pause();
  }

  function show(n) {
    i = (n + ads.length) % ads.length;
    const ad = ads[i];
    name.textContent = ad.sponsor || "Our sponsors";
    name.href = ad.url || "#sponsors";
    if (/^https?:/.test(ad.url || "")) { name.target = "_blank"; name.rel = "noopener"; } else name.removeAttribute("target");
    count.textContent = ads.length > 1 ? `${i + 1} of ${ads.length}` : "";
    bar.style.width = "0";
    still = 0;
    if (ad.video) {
      img.hidden = true;
      vid.hidden = false;
      vid.loop = ads.length === 1;
      soundBtn.hidden = !ad.sound;
      vid.muted = !(ad.sound && soundOn);
      vid.volume = ad.volume || 1;
      vid.poster = ad.poster || "";
      vid.setAttribute("aria-label", ad.alt || `${ad.sponsor} advert`);
      vid.src = ad.video;
      sync();
    } else {
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
      vid.hidden = true;
      soundBtn.hidden = true;
      img.hidden = false;
      img.src = ad.image;
      img.alt = ad.alt || `${ad.sponsor} advert`;
    }
  }

  vid.addEventListener("ended", () => show(i + 1));
  vid.addEventListener("playing", () => { failed = 0; });
  vid.addEventListener("error", () => {
    // Skip an advert whose file is missing; hide the box if none will play
    if (++failed >= ads.length) { vid.removeAttribute("src"); box.hidden = true; box.closest(".hero-body").classList.remove("has-ad"); return; }
    show(i + 1);
  });

  function setPlaying(on) {
    playing = on;
    btn.textContent = on ? "Pause" : "Play";
    btn.setAttribute("aria-pressed", String(!on));
    box.classList.toggle("is-paused", !on);   // the TV's power light turns amber
    sync();
  }
  btn.addEventListener("click", () => setPlaying(!playing));

  function setSound(on) {
    soundOn = on;
    soundBtn.textContent = on ? "Sound off" : "Sound on";
    soundBtn.setAttribute("aria-pressed", String(on));
    vid.muted = !(ads[i].sound && on);
  }
  soundBtn.addEventListener("click", () => {
    setSound(!soundOn);
    if (soundOn && !playing) setPlaying(true);
  });
  document.addEventListener("visibilitychange", sync);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => { onScreen = es[0].isIntersecting; sync(); }).observe(box);
  }

  function tick(now) {
    const dt = last ? Math.min(.25, (now - last) / 1000) : 0;
    last = now;
    const ad = ads[i];
    if (ad.video) {
      // Recorded MP4s often report their length only once fully loaded, so trust  seconds  first
      const d = ad.seconds || (isFinite(vid.duration) && vid.duration) || 30;
      bar.style.width = Math.min(100, vid.currentTime / d * 100) + "%";
    } else if (live()) {
      still += dt;
      const d = ad.seconds || 10;
      bar.style.width = Math.min(100, still / d * 100) + "%";
      if (still >= d) show(i + 1);
    }
    requestAnimationFrame(tick);
  }

  setPlaying(playing);
  show(0);
  requestAnimationFrame(tick);
})();
