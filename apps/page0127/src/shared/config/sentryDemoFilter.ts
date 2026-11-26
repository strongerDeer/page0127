import { DEMO_READ_ONLY_CODE } from '@/shared/lib/demo/demoAccount';

/**
 * 체험 계정 쓰기 거절(proxy 403 + code: DEMO_READ_ONLY)은 Sentry 로 올리지 않는다.
 *
 * 체험 계정은 "읽기만" 되도록 일부러 막아 둔 것이라 오류가 아니다. 그런데 화면 코드가
 * 실패를 끝까지 받지 않으면(예: mutateAsync 를 catch 없이 await) 처리 안 된 Promise 거절이
 * 되어 Sentry 이슈 + 카톡 알림으로 올라온다(2026-11-26 알림 삭제에서 실제로 겪음).
 * 그런 실수는 화면에서 고치되, 의도된 거절로 알림이 울리지 않게 여기서 한 번 더 거른다.
 *
 * 메시지 문자열이 아니라 응답의 status·code 로 가른다 — 다른 403(권한 없음 등)은 그대로 올라간다.
 * axios 를 import 하지 않는 이유: Sentry 로더(clientSentry)는 모든 페이지가 받는 코드라 가볍게 둔다.
 */
export const isDemoReadOnlyRejection = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const response = (error as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null) return false;
  const { status, data } = response as { status?: unknown; data?: unknown };
  return (
    status === 403 &&
    typeof data === 'object' &&
    data !== null &&
    (data as { code?: unknown }).code === DEMO_READ_ONLY_CODE
  );
};
