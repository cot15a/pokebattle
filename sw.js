/* ポケバトル Service Worker
   - ページ本体(HTML)はネットワーク優先：更新があれば常に最新を配信し、オフライン時のみキャッシュを使う
   - その他アセットはキャッシュ優先：高速表示＋オフライン対応 */
const CACHE = 'pokebattle-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isDoc = e.request.mode === 'navigate' ||
    (e.request.destination === 'document') ||
    /index\.html($|\?)/.test(e.request.url);

  if (isDoc) {
    // ネットワーク優先（最新を取得、失敗時はキャッシュ）
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // その他はキャッシュ優先＋裏で更新
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
