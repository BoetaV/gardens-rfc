/* Sending forms: to the club's Google Sheet (when data.js has backend.googleScriptUrl),
   otherwise to the local test server (server.py) when the site runs on this computer.
   Online without a Google address there is nowhere to save to yet, so the forms say they open soon
   and switch on by themselves once googleScriptUrl is filled in. */
(() => {
  const cfg = (window.GARDENS && window.GARDENS.backend) || {};
  const onThisComputer = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const mode = cfg.googleScriptUrl ? "google" : onThisComputer ? "local" : "closed";
  const SOON = "Online forms open soon - please contact the club.";
  window.GardensBackend = { mode, open: mode !== "closed", soon: SOON };

  window.GardensSend = async function (form, body) {
    if (mode === "closed") throw Object.assign(new Error(SOON), { closed: true });
    const local = { members: "api/members", contributions: "api/contributions", subscribe: "api/subscribe", predictions: "api/predictions", candles: "api/candles" };
    let r;
    try {
      r = mode === "google"
        // text/plain keeps this a "simple" request, which Google Apps Script accepts from other websites
        ? await fetch(cfg.googleScriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...body, form }) })
        : await fetch(local[form], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      throw new Error("Could not reach the club server. Please try again later.");
    }
    const out = await r.json().catch(() => ({}));
    if (!r.ok || out.ok === false) throw new Error(out.error || "That could not be sent. Please try again.");
    return out;
  };

  if (mode !== "closed") return;
  // Say so at the top of each form, and switch off its fields so nobody fills it in for nothing.
  // Buttons that only close a dialog stay working.
  const wa = (window.GARDENS && window.GARDENS.whatsapp) || "";
  ["join-form", "contrib-form", "nl-sub", "mem-form", "pr-form"].forEach(id => {
    const form = document.getElementById(id);
    if (!form) return;
    const note = document.createElement("p");
    note.className = "forms-soon";
    note.setAttribute("role", "note");
    note.append("Online forms open soon - please ");
    const link = document.createElement(wa ? "a" : "span");
    link.textContent = "contact the club";
    if (wa) { link.href = wa; link.target = "_blank"; link.rel = "noopener"; }
    note.append(link, ".");
    form.prepend(note);
    [...form.elements].forEach(el => { if (el.type !== "button" && el.type !== "reset") el.disabled = true; });
  });
})();
