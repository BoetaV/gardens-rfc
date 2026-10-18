/* Gardens RFC: Know our crest. Numbered markers sit on the crest with a matching list beside it;
   choosing one puts a spotlight on that part of the badge and opens its meaning. While the section
   is on screen the crest shows visitors round by itself, until they choose a part. The parts of
   the flag are listed underneath. The wording comes from data.js (crest and flag). */
(() => {
  const data = window.GARDENS || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const parts = data.crest || [];
  const stage = document.getElementById("cx-stage"), list = document.getElementById("cx-list"), spot = document.getElementById("cx-spot");

  if (stage && list && parts.length) {
    const img = stage.querySelector("img");
    list.innerHTML = parts.map((p, i) =>
      `<li><button type="button" class="cx-item" aria-expanded="false" aria-controls="cx-text-${i}"><b>${i + 1}</b>${esc(p.title)}</button>` +
      `<p class="cx-text" id="cx-text-${i}" hidden>${esc(p.text)}</p></li>`).join("");
    const items = [...list.querySelectorAll(".cx-item")];
    const markers = parts.map((p, i) => {
      const m = document.createElement("button");
      m.type = "button";
      m.className = "cx-marker";
      m.textContent = i + 1;
      m.style.left = p.marker[0] + "%";
      m.style.top = p.marker[1] + "%";
      m.setAttribute("aria-label", `${i + 1}: ${p.title}`);
      m.addEventListener("click", () => { stopTour(); choose(i); });
      stage.append(m);
      return m;
    });

    let current = -1;
    function choose(i) {
      current = i;
      items.forEach((b, k) => {
        b.setAttribute("aria-expanded", String(k === i));
        b.parentElement.classList.toggle("on", k === i);
        document.getElementById("cx-text-" + k).hidden = k !== i;
      });
      markers.forEach((m, k) => m.classList.toggle("on", k === i));
      if (i < 0) { spot.classList.remove("on"); return; }
      // spot = [x, y, half-width, half-height]; both halves are shares of the width,
      // so the height is converted to a share of the picture's height
      const [x, y, rx, ry = rx] = parts[i].spot;
      const wh = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 252 / 284;
      spot.style.left = x - rx + "%";
      spot.style.width = 2 * rx + "%";
      spot.style.top = y - ry * wh + "%";
      spot.style.height = 2 * ry * wh + "%";
      spot.classList.add("on");
    }
    items.forEach((b, i) => b.addEventListener("click", () => { stopTour(); choose(current === i ? -1 : i); }));

    // The tour: one part every few seconds while the crest is on screen, until the visitor takes over
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let touring = !reduce, tour = null;
    const next = () => choose((current + 1) % parts.length);
    function startTour() {
      if (!touring || tour) return;
      if (current < 0) choose(0);
      tour = setInterval(next, 5000);
    }
    function pauseTour() { clearInterval(tour); tour = null; }
    function stopTour() { touring = false; pauseTour(); }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { es[0].isIntersecting ? startTour() : pauseTour(); }, { threshold: .5 }).observe(stage);
    }
  }

  const fl = document.getElementById("fl-list");
  if (fl) fl.innerHTML = (data.flag || []).map(f =>
    `<li><i style="background:${esc(f.swatch)}" aria-hidden="true"></i><div><h4>${esc(f.title)}</h4><p>${esc(f.text)}</p></div></li>`).join("");
})();
