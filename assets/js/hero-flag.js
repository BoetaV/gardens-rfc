/* Gardens RFC: the club flag flying from a flagpole (beside the hero headline, and in Know our crest).
   Every <canvas class="club-flag"> gets one. The flag (the crest on green, between red and white
   stripes on either side) is drawn once, then redrawn each frame in thin vertical strips that ripple further from
   the pole, so the crest stays clear. */
(() => {
  const canvases = [...document.querySelectorAll("canvas.club-flag")];
  if (!canvases.length) return;
  const W = 260, H = 300;                                // drawing units; each canvas scales to fit
  const FX = 20, FY = 22, FW = 232, FH = 155, STRIPS = 116;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const crest = new Image();
  const tex = document.createElement("canvas");
  const pole = document.createElement("canvas");
  const flags = canvases.map(cv => ({ cv, ctx: cv.getContext("2d"), onScreen: true }));
  const t0 = performance.now();
  let ready = false;

  // The flag itself, drawn flat at three times size so it stays crisp when stretched
  function paintFlag() {
    const s = 3, w = FW * s, h = FH * s, g = tex.getContext("2d");
    tex.width = w;
    tex.height = h;
    const field = g.createLinearGradient(0, 0, 0, h);
    field.addColorStop(0, "#137049");
    field.addColorStop(1, "#0b4a30");
    g.fillStyle = field;
    g.fillRect(0, 0, w, h);
    // Red then white down each side, the green field and crest between them
    const red = w * .13, white = w * .07;
    g.fillStyle = "#c60204";
    g.fillRect(0, 0, red, h);
    g.fillRect(w - red, 0, red, h);
    g.fillStyle = "#f5f6f1";
    g.fillRect(red, 0, white, h);
    g.fillRect(w - red - white, 0, white, h);
    g.fillStyle = "rgba(0,0,0,.25)";                    // the sleeve the pole runs through
    g.fillRect(0, 0, w * .035, h);
    const ch = h * .64, cw = ch * crest.naturalWidth / crest.naturalHeight;
    g.shadowColor = "rgba(0,0,0,.35)";
    g.shadowBlur = 18;
    g.shadowOffsetY = 6;
    g.drawImage(crest, w / 2 - cw / 2, h / 2 - ch / 2, cw, ch);
    ready = true;
  }

  // The pole, fading out towards the bottom, drawn once on its own canvas so the fade cannot touch the flag
  function paintPole() {
    const s = 3, p = pole.getContext("2d");
    pole.width = 30 * s;
    pole.height = H * s;
    p.scale(s, s);
    const metal = p.createLinearGradient(11, 0, 21, 0);
    metal.addColorStop(0, "#8d8f8a");
    metal.addColorStop(.45, "#f4f5f0");
    metal.addColorStop(1, "#6d706b");
    p.fillStyle = metal;
    p.fillRect(11, 10, 10, H - 10);
    const fade = p.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0, "#000");
    fade.addColorStop(.8, "#000");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    p.globalCompositeOperation = "destination-in";
    p.fillStyle = fade;
    p.fillRect(0, 0, 30, H);
  }

  function fit(f) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.round(f.cv.clientWidth * dpr), h = Math.round(f.cv.clientHeight * dpr);
    if (!w || !h) return;
    if (f.cv.width !== w || f.cv.height !== h) { f.cv.width = w; f.cv.height = h; }
    f.ctx.setTransform(w / W, 0, 0, h / H, 0, 0);
  }

  function draw(f, t) {
    const ctx = f.ctx;
    ctx.clearRect(0, 0, W, H);
    if (ready) {
      // Gusts: the wind rises and falls, never strong enough to fold the crest
      const gust = 5.5 + 2.2 * Math.sin(t * .55) + 1.3 * Math.sin(t * 1.63);
      const sw = FW / STRIPS, tw = tex.width / STRIPS;
      for (let i = 0; i < STRIPS; i++) {
        const u = i / STRIPS, ph = u * 7.2 - t * 4.4, amp = gust * Math.pow(u, 1.15);
        const dy = Math.sin(ph) * amp, x = FX + i * sw;
        ctx.drawImage(tex, i * tw, 0, tw + 1, tex.height, x, FY + dy, sw + .7, FH);
        const shade = Math.cos(ph) * Math.min(1, u * 4) * .2;
        ctx.fillStyle = shade > 0 ? `rgba(0,0,0,${shade})` : `rgba(255,255,255,${-shade * .55})`;
        ctx.fillRect(x, FY + dy, sw, FH);   // exactly one strip wide, so seams are not shaded twice
      }
    }
    ctx.drawImage(pole, 0, 0, 30, H);
    const ball = ctx.createRadialGradient(13, 5, 1, 16, 8, 9);
    ball.addColorStop(0, "#fff3c4");
    ball.addColorStop(.5, "#ffc62b");
    ball.addColorStop(1, "#a8790a");
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(16, 8, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(now) {
    if (!document.hidden) flags.forEach(f => { if (f.onScreen) draw(f, (now - t0) / 1000); });
    requestAnimationFrame(frame);
  }

  paintPole();
  crest.onload = () => {
    paintFlag();
    flags.forEach(fit);
    if (reduce) flags.forEach(f => draw(f, 1.2));       // a still flag, gently rippled
    else requestAnimationFrame(frame);
  };
  crest.src = "assets/img/logo.png";
  flags.forEach(f => {
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { f.onScreen = es[0].isIntersecting; }).observe(f.cv);
    if ("ResizeObserver" in window) new ResizeObserver(() => { fit(f); if (reduce) draw(f, 1.2); }).observe(f.cv);
  });
})();
