/**
 * 늦게 받는 Sentry 청크의 "입구". 쓰는 함수만 이름으로 꺼내 둔다.
 *
 * import('@sentry/nextjs') 를 그대로 하면 webpack 이 패키지의 모든 export(Replay·Feedback 등)를
 * 남겨 둬서 늦게 받는 청크가 gzip 160KB 가 됐다(2026-11-26 운영 측정). 정적 named import
 * 로 바꿔 두면 이 파일 안에서는 tree-shaking 이 다시 동작한다.
 */
export {
  captureException,
  captureRouterTransitionStart,
  init,
} from '@sentry/nextjs';
