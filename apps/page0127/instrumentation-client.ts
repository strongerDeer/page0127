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

  // 사용자 체감 성능 흐름은 소량만 표본 수집한다. 오류 이벤트는 이 비율과
  // 무관하게 전송된다.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1,

  // 세션(Release Health) 보내기를 끈다. 켜 두면 페이지를 열 때마다 세션 봉투 1개를
  // /monitoring 터널로 보내는데, 터널은 우리 서버 함수라 페이지뷰마다 호출이 1번 늘었다
  // (2026-11-11 Vercel Fluid Active CPU 한도 초과 때 확인). 우리는 "크래시 없는 세션 비율"
  // 화면을 보지 않고 오류 이벤트만 쓴다. 오류 전송은 이 설정과 무관하게 그대로다.
  integrations: (defaults) =>
    defaults.filter((integration) => integration.name !== 'BrowserSession'),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
