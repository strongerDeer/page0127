// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN은 브라우저에 공개되는 프로젝트 식별자지만, 환경별 분리와 교체를 위해
  // 코드에 고정하지 않고 Vercel 환경변수로 관리한다.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  dataCollection: {
    // 독서 기록·이메일 같은 개인정보가 오류 이벤트에 실리지 않도록 최소 수집한다.
    userInfo: false,
    httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
