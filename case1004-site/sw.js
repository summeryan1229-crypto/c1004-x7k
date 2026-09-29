/* keeps the whole case playable offline once it has been opened once */
const CACHE = "case1004-v4";
const FILES = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
  "audio/clockwork.mp3", "photos/ange.jpg", "photos/bieber.svg", "photos/famichiki.jpg", "photos/junimo.jpg",
  "photos/marmot.jpg", "photos/rose.jpg", "photos/strongzero.jpg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const range = req.headers.get("range");
  if (range) {                                         /* audio: answer byte-range requests from the cached file */
    e.respondWith(caches.match(req.url, {ignoreSearch: true}).then(async hit => {
      if (!hit) return fetch(req);
      const buf = await hit.arrayBuffer(), size = buf.byteLength;
      const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
      let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
      if (!m[1] && m[2]) { start = size - +m[2]; end = size - 1; }
      end = Math.min(end, size - 1);
      return new Response(buf.slice(start, end + 1), {status: 206, headers: {
        "Content-Type": hit.headers.get("Content-Type") || "audio/mpeg",
        "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes"}});
    }).catch(() => fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
