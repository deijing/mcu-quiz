/* 简易 Service Worker：静态资源缓存优先，页面网络优先 + 离线回退 */
const ASSET_CACHE = 'mcu-quiz-assets-v1';
const PAGE_CACHE = 'mcu-quiz-page-v1';
const MAX_ASSETS = 40;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('mcu-quiz-') && key !== ASSET_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // AI 接口等其它路径不接管
  const isAsset = url.pathname.startsWith('/assets/');

  if (isAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;

        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          await trimCache(cache, MAX_ASSETS);
        }
        return response;
      })()
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put('/', response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match('/');
          return cached || Response.error();
        }
      })()
    );
  }
});
