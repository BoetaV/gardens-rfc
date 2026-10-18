/* Website content from the club's Google Sheet.
   api/content (functions/api/content.js on Cloudflare) sets window.GARDENS_CONTENT from the Sheet's content
   tabs; this puts it over data.js before the rest of the site reads it. Lists replace the data.js list
   (an empty tab means an empty list); settings replace one value each. Without the Sheet (not set up yet,
   Google unreachable, or testing on this computer) the site simply shows data.js. */
(() => {
  const c = window.GARDENS_CONTENT, g = window.GARDENS;
  if (!c || typeof c !== "object" || !g) return;
  const plain = v => v && typeof v === "object" && !Array.isArray(v);
  // Links from the Sheet may only go to the site's own pages or to normal web addresses
  const safe = /^(https?:\/\/|mailto:|#|[\w-]+\.html([#?].*)?$|assets\/)/i;
  const clean = v => {
    if (Array.isArray(v)) return v.map(clean);
    if (!plain(v)) return v;
    const out = {};
    for (const k in v) {
      const bad = typeof v[k] === "string" && v[k] && (["link", "file", "url"].includes(k) ? !safe.test(v[k]) : k === "photo" && !/^assets\//.test(v[k]));
      out[k] = bad ? "" : clean(v[k]);
    }
    return out;
  };
  const merge = (into, from) => {
    for (const k in from) {
      if (plain(from[k]) && plain(into[k])) merge(into[k], from[k]);
      else into[k] = from[k];
    }
  };
  const { memories, ...rest } = clean(c);
  merge(g, rest);

  // Approved memories go to their memorial page: "Oom Charles", or "Jan Smith (Wall of Remembrance)" for the wall
  if (Array.isArray(memories) && plain(g.memorials)) {
    const WALL = / \(Wall of Remembrance\)$/;
    Object.values(g.memorials).forEach(m => {
      m.memories = m.kind === "wall"
        ? memories.filter(n => WALL.test(n.memorial)).map(n => ({ name: n.name, remembering: n.memorial.replace(WALL, ""), text: n.text }))
        : memories.filter(n => n.memorial === m.name).map(n => ({ name: n.name, text: n.text }));
    });
  }
})();
