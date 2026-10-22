/**
 * 해결한 오류 기록.
 *
 * /admin/errors 는 Sentry 의 "미해결" 이슈만 보여주므로, Resolve 하고 나면 무슨 일이
 * 있었는지 화면에서 사라진다. 원인과 해결을 여기 남겨 같은 일이 다시 생겼을 때 찾아본다.
 *
 * 해결 PR 에서 이 배열 맨 앞에 한 건을 추가한다 — 최신이 위로 온다.
 */
export type Resolution = {
  /** Sentry 이슈 ID (예: PAGE0127-1G). 같은 이슈가 다시 올라오면 이걸로 찾는다 */
  shortId: string;
  /** 오류 메시지 그대로 */
  title: string;
  /** 발생 위치 (Sentry culprit) */
  culprit: string;
  /** 해결한 날 (YYYY-MM-DD) */
  resolvedAt: string;
  /** 왜 발생했나 */
  cause: string;
  /** 어떻게 해결했나 */
  fix: string;
  /** 해결 PR 번호 */
  prs: number[];
};

export const RESOLUTIONS: Resolution[] = [
  {
    shortId: 'PAGE0127-1G',
    title: 'NEXT_HTTP_ERROR_FALLBACK;404',
    culprit: 'Layout Server Component (/(admin)/admin)',
    resolvedAt: '2026-10-22',
    cause:
      '버그가 아닌 의도된 동작. admin 레이아웃은 관리자가 아니면(비로그인 포함) notFound() 로 404 를 내 admin 존재를 숨긴다. ' +
      'Sentry SDK 의 서버 컴포넌트 래퍼는 이 404 를 건너뛰지만 instrumentation.ts 의 onRequestError(captureRequestError)는 거르지 않아 이슈로 올라왔다. ' +
      '어드민 판정의 노이즈 패턴도 옛 이름(NEXT_NOT_FOUND)만 알고 있어 "지금 고치세요"로 분류됐다.',
    fix:
      'sentry.server/edge.config 의 beforeSend 에서 Next.js 제어 흐름 digest(notFound·redirect 등)를 걸러 Sentry 로 보내지 않는다. ' +
      '어드민 노이즈 패턴에 NEXT_HTTP_ERROR_FALLBACK 을 추가했다.',
    prs: [221],
  },
];
