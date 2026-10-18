/* Sending forms: to the club's Google Sheet (when data.js has backend.googleScriptUrl),
   otherwise to the local test server (server.py). */
window.GardensSend = async function (form, body) {
  const cfg = (window.GARDENS && window.GARDENS.backend) || {};
  const local = { members: "api/members", contributions: "api/contributions", subscribe: "api/subscribe", predictions: "api/predictions", candles: "api/candles" };
  let r;
  try {
    r = cfg.googleScriptUrl
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
