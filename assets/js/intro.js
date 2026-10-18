/* Home page only: a short crest intro on the first visit of a browser session (about 1.5 seconds).
   Loaded in the <head> so the overlay covers the page from the first paint. It never blocks the page:
   everything loads underneath, and without JavaScript there is no overlay at all.
   Skipped for reduced motion, back/forward navigation, links to a #section, and when sessionStorage
   is unavailable. A click or tap, Escape or the Skip button ends it at once; a failsafe removes it
   after 2.5 seconds whatever happens. While it plays, html.intro-playing holds the hero's entrance
   animations so they start as the curtain lifts. */
(() => {
  const KEY = "gardens-intro-seen";
  try {
    if (location.hash) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (nav && nav.type === "back_forward") return;
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
  } catch {
    return;
  }

  const html = document.documentElement;
  const intro = document.createElement("div");
  intro.className = "intro";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = '<img class="intro-crest" src="assets/img/logo.png" alt="" width="252" height="284">' +
    '<p class="intro-name">Gardens RFC</p><p class="intro-since">Since 1932</p>';
  // Outside the aria-hidden overlay, so it is a real button for keyboard and screen reader users
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "intro-skip";
  skip.textContent = "Skip";

  let done = false, lift, gone;
  const onKey = e => { if (e.key === "Escape") end(); };
  function end() {
    if (done) return;
    done = true;
    clearTimeout(lift); clearTimeout(gone); clearTimeout(failsafe);
    html.classList.remove("intro-playing");
    intro.remove();
    skip.remove();
    document.removeEventListener("keydown", onKey);
  }
  const failsafe = setTimeout(end, 2500);

  html.classList.add("intro-playing");
  html.append(intro, skip);   // the <body> is not parsed yet; it follows these in the page
  intro.addEventListener("click", end);
  skip.addEventListener("click", end);
  document.addEventListener("keydown", onKey);

  // At 1 second the curtain lifts and the hero starts its own entrance; at 1.5 seconds it is gone
  lift = setTimeout(() => {
    html.classList.remove("intro-playing");
    skip.remove();
    intro.classList.add("intro-lift");
  }, 1000);
  gone = setTimeout(end, 1550);
})();
