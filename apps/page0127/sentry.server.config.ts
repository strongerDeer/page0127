// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { isNextControlFlowError } from '@/shared/config/sentryControlFlowFilter';
import {
  extractEventText,
  isNoiseEvent,
} from '@/shared/config/sentryNoiseFilter';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // API 라우트가 오류를 잡아 JSON 500으로 바꾸는 경우에도 console.error를
  // Sentry 이슈로 남긴다. 클라이언트 콘솔은 중복·사용자 데이터 위험 때문에
  // 이 통합을 켜지 않는다.
  //
  // 주의: 이 통합 때문에 console.error 는 곧 Sentry 이슈다. 정상적으로 거절한
  // 요청(4xx)까지 error 로 찍으면 장애 목록이 노이즈로 찬다
  // (app/api/_helpers/response.ts 가 상태 코드로 레벨을 가르는 이유).
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],

  // 우리가 고칠 수 없고 장애도 아닌 것은 올리지 않는다 (Node 실험 기능 경고 등)
  // notFound()·redirect() 같은 Next.js 제어 흐름은 의도한 응답이라 오류가 아니다
  // (onRequestError 는 이걸 거르지 않는다 — sentryControlFlowFilter 참고)
  beforeSend(event, hint) {
    if (isNextControlFlowError(hint.originalException)) return null;
    return isNoiseEvent(extractEventText(event)) ? null : event;
  },

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1,
});
