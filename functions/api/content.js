/* Gardens RFC: the website content from the club's Google Sheet, as a script the pages load
   (<script src="api/content">) before assets/js/content.js puts it over data.js.

   Runs on Cloudflare Pages (this functions folder is deployed with `wrangler pages deploy`; it is not part
   of the deploy folder). It uses the same Google Apps Script address as the forms: backend.googleScriptUrl
   in data.js, so there is only one place to set it.

   Google takes a second or two to answer, so the answer is kept at Cloudflare: for FRESH seconds it is
   used as it is; after that the kept copy is still sent straight away while a fresh one is fetched for the
   next visitor. If Google cannot be reached the site shows data.js. */

const FRESH = 60 * 1000;          // how long a fetched copy counts as up to date
const KEEP = 7 * 24 * 60 * 60;    // how long a copy is kept in case Google is unreachable (seconds)
const WAIT = 5000;                // how long a visitor waits for Google when there is no copy yet

const NONE = "window.GARDENS_CONTENT = null;";

export async function onRequestGet(context) {
  try {
    return await content(context);
  } catch (err) {
    console.warn("Gardens RFC content: " + (err && err.message));
    return script(NONE);  // whatever went wrong, the site still works from data.js
  }
}

async function content(context) {
  const { request, env } = context;
  const cache = caches.default;
  const key = new Request(new URL("/api/content", request.url).toString());
  const kept = await cache.match(key).catch(() => undefined);  // no copy if the cache is unavailable
  const age = kept ? Date.now() - Number(kept.headers.get("x-fetched-at") || 0) : Infinity;
  if (kept && age < FRESH) return script(await kept.text());

  const refresh = fetchContent(request, env).then(async body => {
    await cache.put(key, new Response(body, { headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": `public, max-age=${KEEP}`,
      "x-fetched-at": String(Date.now())
    } })).catch(err => console.warn("Gardens RFC content: could not keep a copy: " + err.message));
    return body;
  });
  if (kept) {
    context.waitUntil(refresh.catch(() => {}));  // the next visitor gets the fresh copy
    return script(await kept.text());
  }
  let timer;
  const slow = new Promise(resolve => { timer = setTimeout(() => resolve(null), WAIT); });
  const body = await Promise.race([refresh.catch(err => { console.warn("Gardens RFC content: Google: " + err.message); return null; }), slow]);
  clearTimeout(timer);
  if (body === null) context.waitUntil(refresh.catch(() => {}));  // still fetching: keep it for the next visitor
  return script(body || NONE);
}

async function fetchContent(request, env) {
  // The Google address from data.js, read from the site's own files
  const data = await env.ASSETS.fetch(new URL("/assets/js/data.js", request.url));
  const m = /googleScriptUrl:\s*"([^"]+)"/.exec(await data.text());
  if (!m) return NONE;  // not set up yet: data.js only
  const url = new URL(m[1]);
  url.searchParams.set("content", "1");
  const r = await fetch(url.toString(), { redirect: "follow" });
  const out = await r.json();
  if (!r.ok || !out || out.ok !== true || typeof out.content !== "object") throw new Error("Google did not answer");
  return "window.GARDENS_CONTENT = " + JSON.stringify(out.content) + ";";
}

function script(body) {
  return new Response(body, { headers: {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": "no-cache",
    "x-content-type-options": "nosniff"
  } });
}
