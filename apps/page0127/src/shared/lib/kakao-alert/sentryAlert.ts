import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Sentry 알림 웹훅 → 카톡 문구. (네트워크 없음, 순수 함수)
 *
 * 학습 포인트 — 웹훅 서명:
 * 웹훅 주소는 공개돼 있어서 누구나 POST 할 수 있다. Sentry 는 본문을 "우리 둘만 아는 비밀
 * (Client Secret)"로 HMAC-SHA256 해서 Sentry-Hook-Signature 헤더에 싣는다. 우리도 같은 계산을
 * 해서 값이 같으면 Sentry 가 보낸 것이다. 비밀을 모르는 사람은 맞는 서명을 만들 수 없다.
 */

/** 문자열 비교를 일정 시간에 끝낸다 — 앞글자부터 비교하면 응답 시간으로 서명을 한 글자씩 맞힐 수 있다 */
const safeEqualHex = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
};

const hmacHex = (secret: string, message: string) =>
  createHmac('sha256', secret).update(message, 'utf8').digest('hex');

export const verifySentrySignature = (
  rawBody: string,
  signature: string | null,
  secret: string
): boolean => {
  if (!signature) return false;
  if (safeEqualHex(hmacHex(secret, rawBody), signature)) return true;

  // Sentry 문서의 예시는 JSON.stringify(body) 로 계산한다. 받은 원문과 공백이 다를 수 있어
  // 같은 방식으로 다시 직렬화한 값도 한 번 비교한다(파싱이 실패하면 위조로 본다).
  try {
    return safeEqualHex(hmacHex(secret, JSON.stringify(JSON.parse(rawBody))), signature);
  } catch {
    return false;
  }
};

/** 알림 규칙 액션(Sentry-Hook-Resource: event_alert)의 본문 중 쓰는 부분만 */
export type SentryEventAlertPayload = {
  action?: string;
  data?: {
    triggered_rule?: string;
    event?: {
      title?: string;
      level?: string;
      culprit?: string;
      environment?: string;
    };
  };
};

const LEVEL_ICON: Record<string, string> = { fatal: '🔥', error: '🚨', warning: '⚠️' };

/** 카톡 한 통에 담을 문구. 제목·위치·규칙만 — 스택 전체는 에러 화면에서 본다 */
export const toAlertText = (payload: SentryEventAlertPayload): string => {
  const event = payload.data?.event ?? {};
  const level = event.level ?? 'error';
  const lines = [
    `${LEVEL_ICON[level] ?? '🚨'} [page0127.] ${level}${event.environment ? ` · ${event.environment}` : ''}`,
    event.title ?? '(제목 없음)',
    event.culprit ? `위치: ${event.culprit}` : null,
    payload.data?.triggered_rule ? `규칙: ${payload.data.triggered_rule}` : null,
  ];
  return lines.filter(Boolean).join('\n');
};
