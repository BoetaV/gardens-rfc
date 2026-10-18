/* Gardens RFC: things every page with the main menu shares.
   - Which page each part of the site lives on, so a link like "#fixtures" (from data.js, an advert
     or a match-day button) still works from any page.
   - Marks the menu item for the page you are on.
   - Fills the Sponsors and Media menus from data.js, and shows "Live" in the menu during a stream.
   Load it after data.js, on every page that has the main menu. */
window.GardensPages = {
  live: "index.html", announcements: "news.html",
  story: "club.html", stand: "club.html", crest: "club.html", honours: "club.html", legends: "club.html", executive: "club.html",
  teams: "teams.html", pathway: "teams.html", coaching: "teams.html", players: "teams.html",
  fixtures: "matches.html", predict: "matches.html",
  family: "supporters.html", jersey: "supporters.html",
  newsletter: "news.html", community: "news.html", "share-memory": "news.html",
  gallery: "media.html", albums: "media.html", videos: "media.html", online: "media.html",
  sponsors: "sponsors.html",
  "find-us": "find-us.html",
  members: "members.html", join: "members.html"
};

(function () {
  const data = window.GARDENS || {};
  const map = window.GardensPages;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const here = location.pathname.split("/").pop() || "index.html";
  const pageOf = id => map[id] || (/^sponsor-/.test(id) ? "sponsors.html" : null);

  /* Old links and bookmarks from when the whole site was one page (index.html#fixtures) */
  const landed = location.hash.slice(1).split(/[/=]/)[0];
  if (landed && !document.getElementById(landed) && pageOf(landed) && pageOf(landed) !== here) {
    location.replace(pageOf(landed) + location.hash);
    return;
  }

  /* "#something" links whose section is on another page go to that page */
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const hash = a.getAttribute("href");
    const id = hash.slice(1).split(/[/=]/)[0];
    if (!id || id === "top" || id === "main" || document.getElementById(id)) return;
    const page = pageOf(id);
    if (page && page !== here) { e.preventDefault(); location.href = page + hash; }
  });

  /* Sponsors menu: all sponsors, then each one */
  const slug = s => "sponsor-" + s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const spList = document.getElementById("sponsor-menu-list");
  if (spList) spList.innerHTML = '<li><a href="sponsors.html#sponsors">All sponsors</a></li>' +
    (data.sponsors || []).map(s => `<li><a href="sponsors.html#${slug(s)}">${esc(s.name)}</a></li>`).join("");

  /* Media menu: each photo album after "All photos" (memorial albums go straight to their memorial page) */
  const memorials = data.memorials || {};
  const allPhotos = document.querySelector('#gallery-menu-list a[href$="#gallery"]');
  if (allPhotos) allPhotos.closest("li").insertAdjacentHTML("afterend", (data.albums || []).map(a =>
    `<li><a href="${memorials[a.id] ? esc(memorials[a.id].page) : `media.html#gallery/${esc(a.id)}`}">${esc(a.name)}</a></li>`).join(""));

  // "The club online" only appears once monthly figures are in data.js
  if (!(data.socialViews || []).length) document.querySelectorAll('#nav a[href$="#online"]').forEach(a => { a.closest("li").hidden = true; });

  /* Live: the menu link shows on every page while a stream is on */
  const live = data.live || {};
  if (live.on && (live.url || live.youtubeChannelId)) document.querySelectorAll(".nav-live").forEach(a => a.hidden = false);

  /* The page you are on: underline its menu folder and mark the link */
  document.querySelectorAll("#nav a[href]").forEach(a => {
    const file = a.getAttribute("href").split("#")[0];
    if (file !== here) return;
    const dd = a.closest(".dropdown");
    if (dd) dd.querySelector(".dd-btn").classList.add("is-current");
    else a.classList.add("is-current");
    if (!a.hash) a.setAttribute("aria-current", "page");
  });
})();
