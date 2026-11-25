// Ikigai Sales: เปิดหน้าเว็บได้เร็วขึ้นและติดตั้งเป็นแอปได้ ข้อมูลลูกค้าโหลดสดจาก Supabase ทุกครั้ง (ไม่เก็บในแคช)
const CACHE = "ikg-sales-v2";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.endsWith("supabase.co") || u.hostname.includes("tile.openstreetmap")) return;
  const isLib = u.hostname === "cdn.jsdelivr.net" || u.hostname.includes("fonts.g");
  if (isLib) { // ไลบรารีที่ระบุเวอร์ชันแล้ว: ใช้จากแคชก่อน
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })));
  } else if (u.origin === location.origin) { // หน้าเว็บ: เอาเวอร์ชันล่าสุดก่อน ถ้าออฟไลน์ใช้ของในแคช
    e.respondWith(fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; }).catch(() => caches.match(e.request)));
  }
});
