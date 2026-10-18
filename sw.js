// Offline support: precache the whole game, then serve cache-first.
const VERSION = 'dame-v12';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'css/style.css',
  'js/app.js', 'js/rules.js', 'js/moves.js', 'js/rigs.js', 'js/ai.js', 'js/ai-worker.js', 'js/characters.js', 'js/sketch.js', 'js/sound.js',
  'js/config.js', 'js/protocol.js', 'js/realtime.js', 'js/online.js', 'js/profile.js', 'js/progress.js',
  'js/puzzles.js', 'js/leaderboard.js', 'js/replay.js', 'js/analytics.js', 'js/days.js', 'js/push.js', 'js/recap.js', 'data/puzzles.json', 'data/groups.json',
  'privacy.html', 'terms.html', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: sameOrigin });
    const network = fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached || (e.request.mode === 'navigate' ? cache.match('index.html') : Response.error()));
    return cached || network;
  }));
});

// "Your turn" notifications for games played over days.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: 'Dame', body: e.data?.text() || 'Your turn!' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Dame', {
    body: d.body || 'It’s your turn.',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: d.tag || 'dame',
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    for (const w of wins) if ('focus' in w) { w.navigate(url); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
