/* Gardens RFC: The club online. Monthly views per platform from data.js (socialViews), shown as
   one total for the latest month, a monthly column chart (stacked by platform) to watch growth,
   a tile per platform (latest month, change on the month before,
   and a 12-month trend you can hover or step through with the arrow keys), and a table view.
   The section stays hidden until the first month is added. */
(() => {
  const sec = document.getElementById("online");
  const rows = ((window.GARDENS || {}).socialViews || [])
    .filter(r => /^\d{4}-\d{2}$/.test(r.month)).sort((a, b) => a.month.localeCompare(b.month));
  if (!rows.length) document.querySelectorAll('a[href$="#online"]').forEach(a => { a.closest("li").hidden = true; });
  if (!sec || !rows.length) return;
  sec.hidden = false;
  if ((window.GARDENS || {}).socialViewsSample) document.getElementById("so-sample").hidden = false;

  const PLATFORMS = [
    { key: "youtube", name: "YouTube", icon: "i-youtube" },
    { key: "facebook", name: "Facebook", icon: "i-facebook" },
    { key: "instagram", name: "Instagram", icon: "i-instagram" },
    { key: "tiktok", name: "TikTok", icon: "i-tiktok" }
  ];
  const has = v => typeof v === "number" && isFinite(v);
  const monthName = (m, short) => new Date(m + "-15T12:00:00").toLocaleDateString("en-ZA", { month: short ? "short" : "long", year: "numeric" });
  const full = n => n.toLocaleString("en-ZA");
  const compact = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M"
    : n >= 1e4 ? Math.round(n / 1e3) + "K" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // Change on the month before, as a signed percentage with an arrow (views going up is good)
  function delta(node, now, before, beforeMonth) {
    node.className = "so-delta";
    if (!has(before) || before === 0) { node.textContent = "First month recorded"; return; }
    const pct = Math.round((now - before) / before * 100);
    node.classList.add(pct > 0 ? "up" : pct < 0 ? "down" : "flat");
    node.textContent = `${pct > 0 ? "▲" : pct < 0 ? "▼" : "■"} ${pct > 0 ? "+" : ""}${pct}% on ${monthName(beforeMonth)}`;
  }

  const last = rows[rows.length - 1], prev = rows[rows.length - 2];
  const live = PLATFORMS.filter(p => rows.some(r => has(r[p.key])));
  const names = live.map(p => p.name);
  document.getElementById("so-lede").textContent = "How many times Gardens videos and posts were viewed each month" +
    (names.length > 1 ? `, across ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}.` : ` on ${names[0]}.`);
  const sum = (r, keys) => keys.reduce((t, k) => t + (has(r[k]) ? r[k] : 0), 0);
  const lastKeys = live.map(p => p.key).filter(k => has(last[k]));
  document.getElementById("so-hero-label").textContent = `Views across all platforms, ${monthName(last.month)}`;
  document.getElementById("so-hero-value").textContent = full(sum(last, lastKeys));
  // Compare like with like: only platforms with a figure in both months
  const both = prev ? lastKeys.filter(k => has(prev[k])) : [];
  delta(document.getElementById("so-hero-delta"), sum(last, both), prev && both.length ? sum(prev, both) : null, prev && prev.month);

  /* Monthly chart: one column per month (last 12), stacked by platform. Colours follow the platform
     (CSS --so-<platform>, validated against the section background) and stack in the same order. */
  const STACK = ["facebook", "youtube", "instagram", "tiktok"].map(k => live.find(p => p.key === k)).filter(Boolean);
  const legend = document.getElementById("so-legend");
  STACK.forEach(p => {
    const li = el("li");
    const sw = el("i");
    sw.style.background = `var(--so-${p.key})`;
    li.append(sw, document.createTextNode(p.name));
    legend.append(li);
  });
  const plot = document.getElementById("so-plot"), tip = document.getElementById("so-tip");
  const months = rows.slice(-12);
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
  // A clean scale just above the highest month: at most five steps of 1, 2, 2.5 or 5 times a power of ten
  function niceScale(v) {
    if (v <= 0) return { top: 4, step: 1 };
    const pow = Math.pow(10, Math.floor(Math.log10(v / 5)));
    const step = [1, 2, 2.5, 5, 10, 20].map(m => m * pow).find(s => Math.ceil(v / s) <= 5);
    return { top: Math.ceil(v / step) * step, step };
  }
  function drawChart() {
    plot.querySelectorAll("svg").forEach(s => s.remove());
    const W = plot.clientWidth;
    if (!W) return;
    const H = 260, L = 46, R = 8, T = 22, B = 30, ph = H - T - B, pw = W - L - R;
    const totals = months.map(r => sum(r, STACK.map(p => p.key)));
    const { top, step } = niceScale(Math.max(...totals));
    const yv = v => T + ph - v / top * ph;
    const band = pw / months.length, cw = Math.min(24, band * .62);
    const svg = svgEl("svg", { class: "so-svg", width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": `Column chart of views per month from ${monthName(months[0].month)} to ${monthName(last.month)}. The same figures are in the table below.` });
    for (let v = 0; v <= top; v += step) {
      svg.append(svgEl("line", { class: v ? "so-grid" : "so-axis", x1: L, x2: W - R, y1: yv(v), y2: yv(v) }));
      const t = svgEl("text", { class: "so-tick", x: L - 8, y: yv(v) + 4, "text-anchor": "end" });
      t.textContent = compact(v);
      svg.append(t);
    }
    const every = band < 34 ? 2 : 1;
    const peak = totals.indexOf(Math.max(...totals));
    const cols = [];
    months.forEach((r, i) => {
      const g = svgEl("g", { class: "so-col" });
      const x = L + band * i + (band - cw) / 2;
      let base = 0;
      const present = STACK.filter(p => has(r[p.key]) && r[p.key] > 0);
      present.forEach((p, k) => {
        const y0 = yv(base), y1 = yv(base + r[p.key]), topSeg = k === present.length - 1;
        base += r[p.key];
        const h = y0 - y1 - (topSeg ? 0 : 2);            // 2px gap of background between segments
        if (h <= 0) return;
        const yt = y0 - h, rad = topSeg ? Math.min(4, h) : 0;
        g.append(svgEl("path", { fill: `var(--so-${p.key})`,
          d: `M${x},${y0}V${yt + rad}Q${x},${yt} ${x + rad},${yt}H${x + cw - rad}Q${x + cw},${yt} ${x + cw},${yt + rad}V${y0}Z` }));
      });
      if (i % every === (months.length - 1) % every) {
        const lab = svgEl("text", { class: "so-tick", x: x + cw / 2, y: H - 10, "text-anchor": "middle" });
        const d = new Date(r.month + "-15T12:00:00");
        lab.textContent = d.toLocaleDateString("en-ZA", { month: "short" }) + (i === 0 || d.getMonth() === 0 ? " " + String(d.getFullYear()).slice(2) : "");
        svg.append(lab);
      }
      // Value on the cap: the latest month and the best month only
      if ((i === months.length - 1 || i === peak) && totals[i] > 0) {
        const cap = svgEl("text", { class: "so-cap", x: x + cw / 2, y: yv(totals[i]) - 6, "text-anchor": "middle" });
        cap.textContent = compact(totals[i]);
        g.append(cap);
      }
      const hit = svgEl("rect", { class: "so-hit", x: L + band * i, y: T, width: band, height: ph, tabindex: 0,
        "aria-label": `${monthName(r.month)}: ${full(totals[i])} views` });
      const showTip = () => {
        cols.forEach((c, k) => c.classList.toggle("dim", k !== i));
        tip.replaceChildren();
        tip.append(el("p", "so-tip-month", monthName(r.month)));
        [...STACK].reverse().forEach(p => {
          if (!has(r[p.key])) return;
          const row = el("p", "so-tip-row");
          const key = el("i");
          key.style.background = `var(--so-${p.key})`;
          row.append(key, el("b", null, full(r[p.key])), el("span", null, p.name));
          tip.append(row);
        });
        const tot = el("p", "so-tip-row so-tip-total");
        tot.append(el("b", null, full(totals[i])), el("span", null, "Total"));
        tip.append(tot);
        tip.hidden = false;
        const tw = tip.offsetWidth;
        tip.style.left = Math.max(0, Math.min(W - tw, x + cw / 2 - tw / 2)) + "px";
        tip.style.top = Math.max(0, yv(totals[i]) - tip.offsetHeight - 12) + "px";
      };
      const hideTip = () => { cols.forEach(c => c.classList.remove("dim")); tip.hidden = true; };
      hit.addEventListener("pointerenter", showTip);
      hit.addEventListener("focus", showTip);
      hit.addEventListener("pointerleave", hideTip);
      hit.addEventListener("blur", hideTip);
      svg.append(g, hit);
      cols.push(g);
    });
    plot.prepend(svg);
  }
  drawChart();
  if ("ResizeObserver" in window) {
    let w = plot.clientWidth;
    new ResizeObserver(() => { if (plot.clientWidth !== w) { w = plot.clientWidth; drawChart(); } }).observe(plot);
  }

  const tiles = document.getElementById("so-tiles");
  live.forEach(p => {
    const series = rows.slice(-12).map(r => ({ month: r.month, v: r[p.key] }));
    const latest = [...rows].reverse().find(r => has(r[p.key]));
    const i = rows.indexOf(latest), before = rows[i - 1];
    const li = el("li", "so-tile");
    const head = el("p", "so-name");
    head.innerHTML = `<svg aria-hidden="true" focusable="false"><use href="#${p.icon}"/></svg>`;
    head.append(document.createTextNode(p.name));
    const value = el("p", "so-value", compact(latest[p.key]));
    value.title = `${full(latest[p.key])} views`;
    const when = el("p", "so-when", latest === last ? `views in ${monthName(latest.month)}` : `views in ${monthName(latest.month)} (latest figure)`);
    const d = el("p");
    delta(d, latest[p.key], before && before[p.key], before && before.month);
    li.append(head, value, when, d);
    if (series.filter(s => has(s.v)).length > 1) li.append(spark(series, p.name));
    tiles.append(li);
  });

  // A 12-month trend line: grey line, gold current month; hover or arrow keys show each month
  function spark(series, name) {
    const W = 240, H = 56, PAD = 6, vals = series.map(s => s.v).filter(has);
    const max = Math.max(...vals), min = Math.min(0, ...vals);
    const x = i => PAD + i * (W - PAD * 2) / Math.max(1, series.length - 1);
    const y = v => H - PAD - (v - min) / (max - min || 1) * (H - PAD * 2);
    const NS = "http://www.w3.org/2000/svg", mk = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
    const wrap = el("div", "so-spark");
    const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", tabindex: "0",
      "aria-label": `${name} views per month, ${monthName(series[0].month)} to ${monthName(series[series.length - 1].month)}. Use the arrow keys to read each month.` });
    let d = "", pen = false;
    series.forEach((s, i) => { if (!has(s.v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(s.v).toFixed(1)}`; pen = true; });
    svg.append(mk("line", { class: "so-base", x1: PAD, x2: W - PAD, y1: y(min), y2: y(min) }));
    svg.append(mk("path", { class: "so-line", d }));
    const lastI = series.map(s => has(s.v)).lastIndexOf(true);
    const cross = mk("line", { class: "so-cross", y1: 0, y2: H, x1: 0, x2: 0 });
    const dot = mk("circle", { class: "so-dot", r: 4, cx: x(lastI), cy: y(series[lastI].v) });
    svg.append(cross, dot);
    const read = el("p", "so-read");
    const show = i => {
      const s = series[i];
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i));
      cross.classList.toggle("on", i !== lastI);
      if (has(s.v)) { dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(s.v)); }
      dot.classList.toggle("past", i !== lastI);
      read.textContent = has(s.v) ? `${monthName(s.month, true)}: ${full(s.v)} views` : `${monthName(s.month, true)}: no figure`;
    };
    const reset = () => { show(lastI); cross.classList.remove("on"); dot.classList.remove("past"); read.textContent = ""; };
    let cur = lastI;
    svg.addEventListener("pointermove", e => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
      cur = Math.max(0, Math.min(series.length - 1, Math.round((px - PAD) / ((W - PAD * 2) / Math.max(1, series.length - 1)))));
      show(cur);
    });
    svg.addEventListener("pointerleave", reset);
    svg.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      cur = Math.max(0, Math.min(series.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
      show(cur);
    });
    svg.addEventListener("blur", reset);
    wrap.append(svg, read);
    return wrap;
  }

  // Table view: every month and platform, newest first
  const table = document.getElementById("so-table");
  const thead = table.createTHead().insertRow();
  ["Month", ...live.map(p => p.name), "Total"].forEach(h => { const th = el("th", null, h); th.scope = "col"; thead.append(th); });
  const tbody = table.createTBody();
  [...rows].reverse().forEach(r => {
    const tr = tbody.insertRow();
    const th = el("th", null, monthName(r.month)); th.scope = "row"; tr.append(th);
    live.forEach(p => tr.insertCell().textContent = has(r[p.key]) ? full(r[p.key]) : "–");
    tr.insertCell().textContent = full(sum(r, live.map(p => p.key)));
  });
})();
