/* Gardens RFC: small crests trailing the mouse. Kept light on purpose: a mouse only (never touch),
   one crest per stretch of movement rather than a stream, each gone in about a second, and none
   over forms, videos or an open photo. Off for visitors who ask for reduced motion. */
(() => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const GAP = 40;            // pixels the mouse must travel before the next crest
  const LIFE = 1300;         // milliseconds each crest lasts
  const POOL = 18;           // most crests on screen at once
  const W = 28, H = 32;      // crest size in pixels
  const SKIP = "input, textarea, select, button, [contenteditable], video, iframe, canvas, .lightbox";
  const layer = document.createElement("div");
  layer.className = "crest-trail";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  const pool = Array.from({ length: POOL }, () => {
    const img = new Image(W, H);
    img.src = "assets/img/logo.png";
    img.alt = "";
    layer.append(img);
    return img;
  });
  let next = 0, lastX = null, lastY = null;

  addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse" || document.body.classList.contains("noscroll")) return;
    if (e.target.closest && e.target.closest(SKIP)) { lastX = null; return; }
    if (lastX !== null && Math.hypot(e.clientX - lastX, e.clientY - lastY) < GAP) return;
    lastX = e.clientX;
    lastY = e.clientY;
    const img = pool[next];
    next = (next + 1) % POOL;
    const spin = (Math.random() - .5) * 60, drift = 26 + Math.random() * 22;
    const x = e.clientX - W / 2, y = e.clientY - H / 2;
    img.getAnimations().forEach(a => a.cancel());
    img.animate([
      { transform: `translate(${x}px, ${y}px) scale(1) rotate(0deg)`, opacity: .9 },
      { transform: `translate(${x}px, ${y + drift * .4}px) scale(.85) rotate(${spin * .4}deg)`, opacity: .7, offset: .35 },
      { transform: `translate(${x}px, ${y + drift}px) scale(.4) rotate(${spin}deg)`, opacity: 0 }
    ], { duration: LIFE, easing: "cubic-bezier(.2, .7, .3, 1)", fill: "forwards" });
  }, { passive: true });
})();
