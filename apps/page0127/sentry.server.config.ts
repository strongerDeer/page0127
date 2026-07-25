// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // API 라우트가 오류를 잡아 JSON 500으로 바꾸는 경우에도 console.error를
  // Sentry 이슈로 남긴다. 클라이언트 콘솔은 중복·사용자 데이터 위험 때문에
  // 이 통합을 켜지 않는다.
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1,
});
