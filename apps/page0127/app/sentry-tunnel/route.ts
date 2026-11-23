/**
 * POST /sentry-tunnel — 브라우저 Sentry 이벤트를 Sentry 로 넘겨 주는 터널 함수
 *
 * 왜 직접 두는가:
 *   `@sentry/nextjs` 11.13 부터 Vercel 빌드에서 이 경로에 같은 내용의 route 파일을 자동으로 만들고,
 *   브라우저가 `/monitoring`(next.config 의 tunnelRoute)으로 보내는 요청을 여기로 rewrite 한다.
 *   (11.12 까지는 엣지 rewrite 로 바로 Sentry 에 넘겨서 함수가 돌지 않았다.)
 *   자동 생성 파일은 함수 제한 시간이 기본값(300초)이라, 브라우저 요청 본문이 끝까지 오지 않으면
 *   300초를 꽉 채우고 타임아웃됐다(2026-11-23 운영, 20분에 37건+).
 *   SDK 는 이 파일이 이미 있으면 자동 생성하지 않고 이걸 쓴다 → 제한 시간만 짧게 건다.
 *
 * 왜 10초인가:
 *   SDK 가 Sentry 로 보내는 fetch 에는 30초 제한이 있지만, 브라우저 본문 읽기에는 제한이 없다.
 *   에러 이벤트 한 건 전송에 10초면 충분하다고 보고, 그보다 오래 걸리면 멈춘 것으로 보고 끊는다.
 */
export { POST } from '@sentry/nextjs/tunnel';

export const maxDuration = 10;
