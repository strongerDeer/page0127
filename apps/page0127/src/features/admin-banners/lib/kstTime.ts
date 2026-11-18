/**
 * 배너 예약 시각은 늘 **한국 시간**으로 입력·표시한다.
 *
 * 왜: datetime-local 칸은 시간대 없는 문자열("2026-12-24T00:00")을 준다. 그대로 저장하면
 * DB(timestamptz)가 UTC 로 읽어 KST 와 9시간 어긋난다. 보여 줄 때도 브라우저 시간대를 쓰면
 * 해외에서 어드민을 열었을 때 값이 달라 보인다. 그래서 양쪽 모두 +09:00 으로 고정한다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** timestamptz(ISO) → datetime-local 값(KST). 비어 있으면 '' */
export const isoToKstInput = (iso: string | null): string => {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  // UTC 시각에 9시간을 더한 뒤 UTC getter 로 읽으면 KST 벽시계 값이 된다
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16);
};

/** datetime-local 값(KST) → +09:00 이 붙은 ISO. 비어 있으면 null(제한 없음) */
export const kstInputToIso = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    throw new Error('시각 형식이 올바르지 않습니다.');
  }
  return `${trimmed}:00+09:00`;
};
