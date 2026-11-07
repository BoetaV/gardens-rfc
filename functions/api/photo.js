/* Gardens RFC: a photo from the club's Google Drive, for the Wall of Remembrance (api/photo?id=<Drive file id>).

   The photos stay in a private Drive folder ("Website - Wall of Remembrance"). The club's Google Apps Script hands
   one over only if it is an image in that folder; this function turns it into a normal picture of the website,
   so the security rules (pictures from the site itself only) still hold and visitors never touch Google Drive.
   Each photo is kept at Cloudflare for a day, so Google is asked rarely. Uses the same Google address as the
   forms: backend.googleScriptUrl in data.js. */

const KEEP = 24 * 60 * 60;   // seconds a photo is kept at Cloudflare and in browsers

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[\w-]{10,100}$/.test(id)) return notFound();
  const cache = caches.default;
  const key = new Request(new URL(`/api/photo?id=${id}`, request.url).toString());
  const kept = await cache.match(key).catch(() => undefined);
  if (kept) return kept;
  try {
    const data = await env.ASSETS.fetch(new URL("/assets/js/data.js", request.url));
    const m = /googleScriptUrl:\s*"([^"]+)"/.exec(await data.text());
    if (!m) return notFound();
    const url = new URL(m[1]);
    url.searchParams.set("photo", id);
    const r = await fetch(url.toString(), { redirect: "follow" });
    const out = await r.json();
    if (!out || out.ok !== true || !/^image\/[\w.+-]+$/.test(out.type || "")) return notFound();
    const bytes = Uint8Array.from(atob(out.data), c => c.charCodeAt(0));
    const res = new Response(bytes, { headers: {
      "content-type": out.type,
      "cache-control": `public, max-age=${KEEP}`,
      "x-content-type-options": "nosniff"
    } });
    context.waitUntil(cache.put(key, res.clone()).catch(() => {}));
    return res;
  } catch (err) {
    console.warn("Gardens RFC photo: " + (err && err.message));
    return notFound();
  }
}

function notFound() {
  return new Response("Photo not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
