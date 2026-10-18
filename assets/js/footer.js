/* Gardens RFC footer: the copyright year, and the visitor counter.
   Each visit adds one to the club's count (kept by the Google Sheet script, or by server.py
   when testing locally). Moving between pages in the same visit keeps the same number.
   Online before the Google Sheet is set up there is nothing to count with, so the counter stays hidden. */
(() => {
  document.querySelectorAll(".foot-year").forEach(y => { y.textContent = new Date().getFullYear(); });

  const cfg = (window.GARDENS && window.GARDENS.backend) || {};
  const out = document.getElementById("visit-counter");
  const KEY = "gardens-visitor-number";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Show the number as digits in boxes; roll the last few up once it comes into view
  function show(n) {
    if (!out || !(n > 0)) return;
    const digits = out.querySelector(".fc-digits");
    const paint = v => {
      digits.replaceChildren(...[...v.toLocaleString("en-ZA")].map(ch => {
        const s = document.createElement("span");
        s.textContent = ch;
        if (!/\d/.test(ch)) s.className = "fc-sep";
        return s;
      }));
    };
    digits.setAttribute("aria-label", n.toLocaleString("en-ZA"));
    out.hidden = false;
    if (reduce || !("IntersectionObserver" in window)) { paint(n); return; }
    const from = Math.max(1, n - 30);
    paint(from);
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      (function step(now) {
        const p = Math.min(1, (now - t0) / 1200), eased = 1 - Math.pow(1 - p, 3);
        paint(Math.round(from + (n - from) * eased));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
    io.observe(out);
  }

  let known = null;
  try { known = Number(sessionStorage.getItem(KEY)); } catch { known = null; }
  if (known > 0) { show(known); return; }   // another page in the same visit
  const onThisComputer = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (!cfg.googleScriptUrl && !onThisComputer) return;

  const request = cfg.googleScriptUrl
    // text/plain keeps this a "simple" request, which Google Apps Script accepts from other websites
    ? fetch(cfg.googleScriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ form: "visit" }) })
    : fetch("api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  request.then(r => r.json()).then(d => {
    if (!d || !d.ok || !(d.count > 0)) return;
    try { sessionStorage.setItem(KEY, d.count); } catch { /* private browsing */ }
    show(d.count);
  }).catch(() => { /* no counter today; the rest of the page is unaffected */ });
})();
