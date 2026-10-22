/**
 * Next.js 제어 흐름 신호 판별 — Sentry 로 올리지 않는다.
 *
 * notFound()·redirect()·forbidden()·unauthorized() 는 내부적으로 digest 가 붙은
 * 에러를 throw 해서 렌더를 끊는다. 오류가 아니라 의도한 응답이다.
 * 예: admin 레이아웃은 관리자가 아니면 notFound() 로 404 를 낸다 (assertAdmin).
 *
 * 서버 컴포넌트 래퍼는 이걸 알아서 건너뛰지만, instrumentation.ts 의
 * onRequestError(Sentry.captureRequestError)는 거르지 않고 그대로 캡처한다.
 * 그래서 beforeSend 에서 한 번 더 막는다.
 *
 * 노이즈 필터(sentryNoiseFilter)와 달리 메시지 문자열이 아니라 Next.js 가 붙인
 * digest 로 판별한다 — 우연히 같은 문구를 담은 진짜 오류를 삼킬 위험이 없다.
 */

const MAX_CAUSE_DEPTH = 5;

const isControlFlowDigest = (digest: string): boolean =>
  digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;') || // notFound·forbidden·unauthorized
  digest.startsWith('NEXT_REDIRECT;') ||
  digest === 'NEXT_NOT_FOUND'; // 구버전 notFound()

/** 에러(또는 cause 체인)가 Next.js 제어 흐름 신호인지 */
export const isNextControlFlowError = (error: unknown, depth = 0): boolean => {
  if (!(error instanceof Error)) return false;

  const { digest } = error as Error & { digest?: unknown };
  if (typeof digest === 'string' && isControlFlowDigest(digest)) return true;

  return (
    depth < MAX_CAUSE_DEPTH && isNextControlFlowError(error.cause, depth + 1)
  );
};
