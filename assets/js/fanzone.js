/* Gardens RFC fan zone: match-day mode in the hero, Predict the Score, and the jersey maker. */
(() => {
  const data = window.GARDENS || {};
  const SAST = "+02:00", TZ = "Africa/Johannesburg";
  const kick = f => new Date(`${f.date}T${f.time || "15:00"}:00${SAST}`);
  const played = f => f.score && typeof f.score.us === "number";
  const outcome = f => f.score.us > f.score.them ? "W" : f.score.us < f.score.them ? "L" : "D";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const two = n => String(n).padStart(2, "0");
  const $ = id => document.getElementById(id);
  const fixtures = (data.fixtures || []).slice().sort((a, b) => kick(a) - kick(b));
  // Same rule as the countdown in main.js: a game stays "next" until three hours after kick-off
  const next = fixtures.find(f => !played(f) && kick(f).getTime() + 3 * 3600e3 > Date.now()) || null;
  const timeOf = f => kick(f).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const dayOf = f => kick(f).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  const matchKey = f => `${f.date} ${f.team || "First team"} v ${f.opponent}`;
  const predictOpen = f => !!(data.predict && data.predict.on && f && !played(f) && Date.now() < kick(f).getTime());
  const HOME_GROUND = "https://www.google.com/maps/search/?api=1&query=Gardens+Rugby+Club+20+Seagull+Crescent+Rosedale+Kariega";
  const directions = f => !f.venue || /rosedale|gardens/i.test(f.venue)
    ? HOME_GROUND : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(f.venue);
  const pageUrl = () => location.href.split(/[?#]/)[0];
  const whatsapp = text => "https://wa.me/?text=" + encodeURIComponent(`${text} ${pageUrl()}`);
  function countdown(ms) {
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1000) % 60;
    return d ? `${d}d ${two(h)}h ${two(m)}m ${two(s)}s` : `${two(h)}:${two(m)}:${two(s)}`;
  }

  /* Match day: the hero becomes a match card on the day of a fixture (or with ?matchday to preview) */
  const md = $("matchday");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const preview = new URLSearchParams(location.search).has("matchday");
  let game = fixtures.find(f => f.date === today && !played(f)) || fixtures.find(f => f.date === today);
  if (!game && preview) game = next || fixtures.filter(played).pop();
  if (md && game) {
    md.closest(".hero-body").classList.add("is-matchday");
    md.hidden = false;
    const live = data.live || {}, isLive = !!(live.on && (live.url || live.youtubeChannelId));
    const venue = game.venue ? ` at ${game.venue}` : "";
    $("md-opp").textContent = game.opponent;
    $("md-when").textContent = `${game.team || "First team"}  ·  ${game.date === today ? "Today" : dayOf(game)}`;
    const btn = (href, label, cls = "btn-line", ext = false) =>
      `<a class="btn ${cls}" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
    let state = "";
    function render() {
      const left = kick(game).getTime() - Date.now();
      const now = played(game) ? "result" : left > 0 ? "before" : "during";
      if (now === "before") $("md-clock").textContent = `Kick-off in ${countdown(left)}`;
      if (now === state) return;
      state = now;
      const tag = $("md-tag"), acts = [];
      tag.classList.toggle("md-live", now === "during" && isLive);
      $("md-board").hidden = now !== "result";
      $("md-clock").hidden = now === "result";
      if (now === "result") {
        const o = outcome(game);
        tag.textContent = "Full time";
        $("md-us").textContent = game.score.us;
        $("md-them").textContent = game.score.them;
        $("md-badge").textContent = { W: "Win", L: "Loss", D: "Draw" }[o];
        $("md-badge").className = "lg-badge sb-" + o;
        $("md-meta").textContent = `Kick-off was at ${timeOf(game)}${venue}.`;
        acts.push(btn("#fixtures", "Fixtures and results", "btn-red"),
          btn(whatsapp(`Full time: Gardens RFC ${game.score.us} - ${game.score.them} ${game.opponent}.`), "Share the result", "btn-line", true));
      } else if (now === "before") {
        tag.textContent = "Match day";
        $("md-meta").textContent = `Kick-off ${timeOf(game)}${venue}. Come early and bring the family.`;
        acts.push(btn(directions(game), "Directions", "btn-red", true));
        if (predictOpen(game)) acts.push(btn("#predict", "Predict the score"));
        if (isLive) acts.push(btn("#live", "Watch live"));
        acts.push(btn(whatsapp(`Match day! Gardens RFC v ${game.opponent}, kick-off ${timeOf(game)}${venue}. Come and support the green, white and red.`), "Share on WhatsApp", "btn-line", true));
      } else {
        tag.textContent = isLive ? "Live now" : "Game on";
        $("md-clock").textContent = `Kick-off was at ${timeOf(game)}`;
        $("md-meta").textContent = "The result will appear here after the final whistle.";
        if (isLive) acts.push(btn("#live", "Watch live", "btn-red"));
        acts.push(btn("#fixtures", "Fixtures and results"));
      }
      $("md-actions").innerHTML = acts.join("");
    }
    render();
    if (!played(game)) setInterval(render, 1000);
  }

  /* Predict the Score */
  const cfg = data.predict || {};
  const pr = $("predict");
  if (pr && cfg.on) {
    pr.hidden = false;
    const form = $("pr-form"), msg = $("pr-msg"), closed = $("pr-closed");
    $("pr-prize").textContent = cfg.prize ? `Prize: ${cfg.prize}` : "Prize to be announced.";
    const w = (cfg.winners || [])[0];
    if (w) {
      $("pr-winner").innerHTML = `<b>Last winner: ${esc(w.name)}</b><br>Guessed ${esc(w.guess)} for ${esc(w.match)}` +
        `${w.result ? ` (final score ${esc(w.result)})` : ""}. Well done!`;
      $("pr-winner").hidden = false;
    }
    const storeKey = next && "gardens-prediction " + matchKey(next);
    let mine = null;
    try { mine = storeKey && JSON.parse(localStorage.getItem(storeKey)); } catch { mine = null; }
    function close(text) {
      form.hidden = true;
      closed.innerHTML = text;
      closed.hidden = false;
    }
    if (next) {
      $("pr-match").textContent = `${next.team || "First team"}: Gardens RFC v ${next.opponent}, ${dayOf(next)}, kick-off ${timeOf(next)}`;
      $("pr-opp").textContent = next.opponent;
    } else {
      $("pr-match").textContent = "The next game opens as soon as the club posts the fixture.";
    }
    const closedText = () => `<h3>Entries are closed</h3><p>Predictions for Gardens RFC v ${esc(next.opponent)} closed at kick-off. The winner will be announced here after the game.</p>`;
    if (!next) close("<h3>No game open yet</h3><p>Check back when the next fixture is posted.</p>");
    else if (!predictOpen(next)) close(closedText());
    else if (mine) close(`<h3>You're in!</h3><p>Your prediction: <b>Gardens RFC ${esc(mine.us)} - ${esc(mine.them)} ${esc(next.opponent)}</b>. Good luck!</p>`);
    else {
      const left = kick(next).getTime() - Date.now();
      if (left < 2 ** 31 - 1) setTimeout(() => close(closedText()), left);  // close the form at kick-off
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      msg.className = "pr-msg";
      const f = form.elements, name = f.namedItem("name");
      [f.us, f.them, name, f.phone].forEach(i => i.classList.remove("invalid"));
      const score = i => /^\d{1,3}$/.test(i.value.trim()) && +i.value <= 150;
      const bad = !score(f.us) ? f.us : !score(f.them) ? f.them
        : name.value.trim().length < 2 ? name : !/^\+?[0-9 ()-]{9,20}$/.test(f.phone.value.trim()) ? f.phone : null;
      if (bad) {
        bad.classList.add("invalid");
        bad.focus();
        msg.textContent = bad === f.phone ? "Please enter a valid cell number." : bad === name ? "Please enter your name." : "Please enter a score from 0 to 150.";
        msg.classList.add("err");
        return;
      }
      if (!f.consent.checked) {
        msg.textContent = "Please tick the box so the club can contact you if you win.";
        msg.classList.add("err");
        return;
      }
      if (!predictOpen(next)) { close(closedText()); return; }
      const button = form.querySelector("button");
      button.disabled = true;
      const entry = { us: +f.us.value, them: +f.them.value };
      try {
        await window.GardensSend("predictions", {
          match: matchKey(next), kickoff: kick(next).toISOString(), ...entry,
          name: name.value.trim(), phone: f.phone.value.trim(), consent: true, website: f.website.value
        });
        try { localStorage.setItem(storeKey, JSON.stringify(entry)); } catch { /* private browsing */ }
        close(`<h3>You're in!</h3><p>Your prediction: <b>Gardens RFC ${entry.us} - ${entry.them} ${esc(next.opponent)}</b>. Good luck!</p>`);
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.add("err");
      } finally {
        button.disabled = false;
      }
    });
  }

  /* Jersey maker: name and number on a Gardens jersey, saved as a square picture for sharing */
  const cv = $("jm-canvas");
  if (cv) {
    const ctx = cv.getContext("2d"), jf = $("jm-form");
    const DISPLAY = '"Big Shoulders Display", Impact, sans-serif';
    const KITS = {
      home: { body: ["#16784f", "#0a4a2f"], swirl: "rgba(198,2,4,.6)", edge: "#c60204", stripe: "#c60204", sleeve: ["#0f5a3a", "#f5f6f1", "#c60204"] },
      away: { body: ["#d81b1e", "#930103"], swirl: "rgba(10,61,40,.55)", edge: "#0a3d28", stripe: "#0f5a3a", sleeve: ["#c60204", "#f5f6f1", "#0f5a3a"] }
    };
    const pic = src => { const i = new Image(); i.onload = draw; i.src = src; return i; };
    const crest = pic("assets/img/logo.png"), sponsor = pic("assets/img/sponsors/score-logo.jpg");
    // Flames rising from the hem, after the red flame pattern on the real jersey (same every time)
    const FLAMES = Array.from({ length: 9 }, (_, i) => {
      const r = n => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
      return { x: 330 + i * 52 + r(1) * 20, h: 150 + r(2) * 190, w: 70 + r(3) * 40, lean: (r(4) - .5) * 50 };
    });

    function jerseyPath() {
      const p = new Path2D();
      p.moveTo(455, 195);
      p.quadraticCurveTo(540, 222, 625, 195);
      p.lineTo(772, 232);
      p.quadraticCurveTo(852, 292, 905, 410);
      p.lineTo(828, 470);
      p.quadraticCurveTo(790, 432, 745, 398);
      p.lineTo(748, 925);
      p.quadraticCurveTo(540, 948, 332, 925);
      p.lineTo(335, 398);
      p.quadraticCurveTo(290, 432, 252, 470);
      p.lineTo(175, 410);
      p.quadraticCurveTo(228, 292, 308, 232);
      p.closePath();
      return p;
    }
    const PATH = jerseyPath();

    // Three bands along a sleeve end, from point a to point b, stepping towards the shoulder
    function cuff(ax, ay, bx, by, toward, colours) {
      const nx = -(by - ay), ny = bx - ax, len = Math.hypot(nx, ny), ux = nx / len * toward, uy = ny / len * toward;
      colours.forEach((c, i) => {
        const o1 = 6 + i * 14, o2 = o1 + 14;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(ax + ux * o1, ay + uy * o1);
        ctx.lineTo(bx + ux * o1, by + uy * o1);
        ctx.lineTo(bx + ux * o2, by + uy * o2);
        ctx.lineTo(ax + ux * o2, ay + uy * o2);
        ctx.closePath();
        ctx.fill();
      });
    }

    function fitText(str, max, size, weight = 900) {
      ctx.font = `${weight} ${size}px ${DISPLAY}`;
      const w = ctx.measureText(str).width;
      if (w > max) ctx.font = `${weight} ${Math.floor(size * max / w)}px ${DISPLAY}`;
    }

    function values() {
      const name = jf.elements.namedItem("name").value.toUpperCase().replace(/[^A-ZÀ-Ý' .-]/g, "").slice(0, 12).trim();
      const n = jf.number.value.trim();
      const number = /^\d{1,2}$/.test(n) ? String(+n) : "";
      return { name, number, kit: KITS[jf.kit.value] || KITS.home };
    }

    function draw() {
      const { name, number, kit } = values();
      const bg = ctx.createRadialGradient(540, 520, 60, 540, 540, 760);
      bg.addColorStop(0, "#14704a");
      bg.addColorStop(1, "#06140e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.save();
      ctx.globalAlpha = .06;
      ctx.fillStyle = "#fff";
      ctx.translate(540, 540);
      ctx.rotate(-.5);
      for (let x = -1100; x < 1100; x += 70) ctx.fillRect(x, -1100, 26, 2200);
      ctx.restore();

      ctx.textAlign = "center";
      ctx.letterSpacing = "8px";
      ctx.font = `900 70px ${DISPLAY}`;
      ctx.fillStyle = "#f5f6f1";
      ctx.fillText("I'M GARDENS", 540, 112);
      ctx.letterSpacing = "6px";
      ctx.font = `800 34px ${DISPLAY}`;
      ctx.fillStyle = "#ffc62b";
      ctx.fillText("GARDENS RFC  ·  UITENHAGE  ·  SINCE 1932", 540, 1012);
      ctx.letterSpacing = "0px";
      ["#0f5a3a", "#f5f6f1", "#c60204"].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, 1044 + i * 12, 1080, 12); });

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 24;
      const body = ctx.createLinearGradient(0, 195, 0, 945);
      body.addColorStop(0, kit.body[0]);
      body.addColorStop(1, kit.body[1]);
      ctx.fillStyle = body;
      ctx.fill(PATH);
      ctx.restore();

      ctx.save();
      ctx.clip(PATH);
      ctx.fillStyle = kit.swirl;
      [1, .6].forEach(k => FLAMES.forEach(f => {
        const h = f.h * k, w = f.w * k, y = 950;
        ctx.beginPath();
        ctx.moveTo(f.x - w / 2, y);
        ctx.quadraticCurveTo(f.x - w * .65, y - h * .55, f.x + f.lean * k, y - h);
        ctx.quadraticCurveTo(f.x + w * .1, y - h * .45, f.x + w / 2, y);
        ctx.closePath();
        ctx.fill();
      }));
      cuff(905, 410, 828, 470, 1, kit.sleeve);
      cuff(175, 410, 252, 470, -1, kit.sleeve);
      const shade = ctx.createLinearGradient(170, 0, 910, 0);
      shade.addColorStop(0, "rgba(0,0,0,.35)");
      shade.addColorStop(.3, "rgba(0,0,0,0)");
      shade.addColorStop(.5, "rgba(255,255,255,.07)");
      shade.addColorStop(.7, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,.35)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.restore();

      ctx.lineCap = "round";
      ctx.strokeStyle = "#f5f6f1";
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(458, 199);
      ctx.quadraticCurveTo(540, 226, 622, 199);
      ctx.stroke();
      ctx.strokeStyle = kit.stripe;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(462, 199);
      ctx.quadraticCurveTo(540, 226, 618, 199);
      ctx.stroke();
      if (crest.complete && crest.naturalWidth) ctx.drawImage(crest, 516, 230, 48, 54);

      ctx.lineJoin = "round";
      ctx.textAlign = "center";
      const label = name || "YOUR NAME";
      ctx.letterSpacing = "5px";
      fitText(label, 390, 92);
      ctx.globalAlpha = name ? 1 : .55;
      ctx.strokeStyle = kit.edge;
      ctx.lineWidth = 8;
      ctx.strokeText(label, 540, 368);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, 540, 368);
      ctx.globalAlpha = 1;
      ctx.letterSpacing = "0px";
      if (number) {
        ctx.font = `900 330px ${DISPLAY}`;
        ctx.lineWidth = 16;
        ctx.strokeText(number, 540, 706);
        ctx.fillText(number, 540, 706);
      }
      if (sponsor.complete && sponsor.naturalWidth) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(434, 744, 212, 122);
        ctx.drawImage(sponsor, 40, 195, 640, 360, 440, 750, 200, 110);
      }
    }

    const fileName = () => {
      const { name, number } = values();
      return `gardens-jersey-${(name || "fan").toLowerCase().replace(/[^a-z0-9]+/g, "-")}${number ? "-" + number : ""}.png`;
    };
    const blob = () => new Promise(r => cv.toBlob(r, "image/png"));
    $("jm-save").addEventListener("click", async () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await blob());
      a.download = fileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
    // Phones can share the picture straight to WhatsApp or Instagram
    const share = $("jm-share");
    const probe = new File([new Blob(["x"], { type: "image/png" })], "x.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [probe] })) {
      share.hidden = false;
      share.addEventListener("click", async () => {
        const file = new File([await blob()], fileName(), { type: "image/png" });
        try {
          await navigator.share({ files: [file], title: "My Gardens RFC jersey", text: `I'm Gardens! Make your own jersey: ${pageUrl()}#jersey` });
        } catch { /* the visitor closed the share sheet */ }
      });
    }
    jf.addEventListener("input", draw);
    jf.addEventListener("submit", e => e.preventDefault());
    draw();
    if (document.fonts) document.fonts.load(`900 100px ${DISPLAY}`).then(draw, () => {});
  }
})();
