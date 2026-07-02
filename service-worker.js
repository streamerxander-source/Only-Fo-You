const CACHE_NAME = 'claudia-heart-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./');
          }
        });
    })
  );
});

self.addEventListener('push', event => {
  let payload = { title: 'Mensagem de carinho', body: 'Uma mensagem especial chegou para você.', url: '/' };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch (error) {
    console.warn('Payload de push inválido:', error);
  }

  const options = {
    body: payload.body || 'Uma mensagem especial chegou para você.',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"%3E%3Ccircle cx="60" cy="60" r="60" fill="%23ff4d6d"/%3E%3Ctext x="50%25" y="55%25" fill="%23fff" font-size="72" font-family="Arial, Helvetica, sans-serif" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%92%96%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"%3E%3Ccircle cx="60" cy="60" r="60" fill="%23ff4d6d"/%3E%3Ctext x="50%25" y="55%25" fill="%23fff" font-size="72" font-family="Arial, Helvetica, sans-serif" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%92%96%3C/text%3E%3C/svg%3E',
    data: { url: payload.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'Mensagem de carinho', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  const appUrl = new URL(urlToOpen, self.location.origin).toString();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(appUrl);
    })
  );
});
