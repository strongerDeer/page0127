// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import {
  extractEventText,
  isNoiseEvent,
} from '@/shared/config/sentryNoiseFilter';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],

  // 서버 설정과 동일한 노이즈 필터 (미들웨어·엣지 라우트)
  beforeSend(event) {
    return isNoiseEvent(extractEventText(event)) ? null : event;
  },

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1,
});
