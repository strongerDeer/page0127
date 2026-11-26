// 브라우저 쪽 계측 진입점. Next.js 가 하이드레이션 "전에" 실행한다.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// Sentry 를 여기서 바로 import·init 하지 않는다(2026-11-26). 이 파일에서 쓴 시간은 곧
// 폰에서 "버튼이 안 눌리는 시간(TBT)"이 되기 때문에, 화면이 뜬 뒤 한가할 때 따로 받는다.
// 설정·이유·init 전 오류 대기열 → src/shared/lib/sentry/clientSentry.ts

import {
  onRouterTransitionStart,
  scheduleSentryInit,
} from '@/shared/lib/sentry/clientSentry';

scheduleSentryInit();

export { onRouterTransitionStart };
