/*
  page0127. 서비스워커

  하는 일은 셋뿐이다. 페이지·API 응답은 캐시하지 않는다 — 로그인 상태가 섞인 화면을
  옛날 것으로 보여 줄 위험이 크고, 이 서비스는 늘 온라인을 전제로 한다.

  1. push              서버(app/api/_helpers/push.ts)가 보낸 알림을 잠금화면에 띄운다
  2. notificationclick 알림을 누르면 이미 열린 창을 앞으로 가져와 그 경로로 보낸다
  3. fetch(navigate)   홈 화면 앱에서 연결이 끊기면 빈 화면 대신 /offline.html 을 보인다

  ⚠️ 이 파일을 고치면 CACHE_VERSION 을 올린다. 브라우저는 sw.js 가 1바이트라도 바뀌면
     새 워커를 설치하고, activate 에서 옛 캐시를 지운다.
  ⚠️ 푸시 내용의 모양(title·body·url)은 entities/notification/lib/pushPayload.ts 와 짝이다.
*/

const CACHE_VERSION = 'v1';
const OFFLINE_CACHE = `page0127-offline-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const ICON_URL = '/icons/192';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      // 기다리지 않고 바로 새 워커로 바꾼다 — 캐시하는 게 오프라인 화면 하나라 옛 탭과 어긋날 것이 없다
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('page0127-offline-') && key !== OFFLINE_CACHE
          )
          .map((key) => caches.delete(key))
      );
      // fetch 핸들러가 있으면 워커가 깨어나는 동안 페이지 이동이 기다린다.
      // navigation preload 는 그동안 요청을 먼저 보내 두어 그 지연을 없앤다
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // 페이지 이동만 다룬다. 이미지·스크립트·API 는 브라우저 기본 동작 그대로
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        const cache = await caches.open(OFFLINE_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return offline ?? Response.error();
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  /** @type {{ title?: string; body?: string; url?: string }} */
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  // iOS 는 푸시를 받고도 알림을 띄우지 않으면 구독을 끊는다 — 내용이 비어도 반드시 띄운다
  event.waitUntil(
    self.registration.showNotification(payload.title || 'page0127.', {
      body: payload.body || '새 알림이 도착했어요',
      icon: ICON_URL,
      badge: ICON_URL,
      lang: 'ko-KR',
      data: { url: payload.url || '/notifications' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(
    (event.notification.data && event.notification.data.url) ||
      '/notifications',
    self.location.origin
  );

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // 이미 열린 page0127. 창이 있으면 새 창을 띄우지 않고 그 창을 데려온다
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin
      );
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(target.href);
        return;
      }
      await self.clients.openWindow(target.href);
    })()
  );
});

// 브라우저가 구독 키를 갈아 끼우면(드물다) 새 구독을 서버에 다시 알린다.
// 같은 출처 요청이라 로그인 쿠키가 함께 간다 — 로그아웃 상태면 401 로 끝나고,
// 다음에 설정 화면을 열 때 다시 맞춰진다.
self.addEventListener('pushsubscriptionchange', (event) => {
  const options = event.oldSubscription && event.oldSubscription.options;
  if (!options) return;

  event.waitUntil(
    self.registration.pushManager.subscribe(options).then((subscription) =>
      fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
    )
  );
});
