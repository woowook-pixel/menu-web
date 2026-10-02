// 최소 서비스워커: 페이지·식단 목록은 네트워크 우선(오프라인이면 마지막 본 내용), 사진·정적 파일은 캐시 우선
const CACHE = 'menu-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // GitHub API 등은 건드리지 않음

  const put = (key) => (res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(key, copy));
    }
    return res;
  };

  // 식단 목록: 쿼리(?t=)를 떼고 캐시해 오프라인에서도 마지막 목록을 보여줌
  if (url.pathname.endsWith('/data/index.json')) {
    const key = url.origin + url.pathname;
    e.respondWith(fetch(req).then(put(key)).catch(() => caches.match(key)));
    return;
  }
  // 사진(?v=버전)·아이콘 등: 캐시 우선
  if (/\.(jpg|png|svg)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put(req))));
    return;
  }
  // HTML/JS/CSS: 네트워크 우선 (배포 즉시 새 버전)
  e.respondWith(fetch(req).then(put(req)).catch(() => caches.match(req, { ignoreSearch: true })));
});
