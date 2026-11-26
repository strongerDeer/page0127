import { accuracyOf, judgeTyping } from '@/entities/typing';

import { maxCpmFor } from './guestToken';

/**
 * 서버가 필사 기록을 다시 따져 보는 순수 함수(회원·비회원 같이 씀, HJ 2026-11-26 B안)
 *
 * 브라우저가 보낸 "타수·정확도" 숫자를 믿지 않는다:
 *   - 정확도: 브라우저가 보낸 친 글(typed)을 원문과 다시 맞춰 서버가 계산한다.
 *   - 타수: 브라우저 값은 쓰되, 서버 시계로 잰 "첫 글자 ~ 마지막 글자" 안에서 낼 수 있는 최대치로 자른다.
 *     (정상 기록은 늘 이보다 낮아 그대로 남고, 조작한 숫자만 깎인다)
 *   - 서버 시간이 없거나(시작 기록 실패) 자동 입력이 감지되면 타수 0 → 진행도만 남고 랭킹엔 안 오른다.
 */
export const MAX_CPM = 1500;

export type RecordCheckInput = {
  /** 원문 */
  text: string;
  /** 브라우저가 보낸 최종 입력 */
  typed: unknown;
  /** 브라우저가 잰 타수 */
  clientCpm: unknown;
  /** 서버 시계로 잰 첫 글자 ~ 마지막 글자(ms). 모르면 null */
  serverWindowMs: number | null;
  /** 한 번에 여러 글자가 들어오는 등 자동 입력 흔적 */
  assisted: boolean;
};

export type RecordCheck =
  | {
      ok: true;
      accuracy: number;
      cpm: number;
      /** 타수 랭킹에 오를 수 있는 기록인가 */
      rankable: boolean;
      /** 브라우저 타수가 상한에 걸려 깎였는가(로그용) */
      clipped: boolean;
    }
  | { ok: false };

export const checkTypingRecord = ({
  text,
  typed,
  clientCpm,
  serverWindowMs,
  assisted,
}: RecordCheckInput): RecordCheck => {
  // 끝까지 친 기록만 받는다(쪽 길이와 같아야 한다)
  if (typeof typed !== 'string' || typed.length !== text.length)
    return { ok: false };

  const judge = judgeTyping(typed, text, false);
  const accuracy = accuracyOf(judge);

  if (serverWindowMs === null || serverWindowMs < 0 || assisted)
    return { ok: true, accuracy, cpm: 0, rankable: false, clipped: false };

  const cap = Math.min(
    MAX_CPM,
    maxCpmFor(judge.correctStrokes, serverWindowMs)
  );
  const raw =
    typeof clientCpm === 'number' && Number.isFinite(clientCpm)
      ? Math.max(0, Math.round(clientCpm))
      : 0;
  const cpm = Math.min(raw, cap);
  return { ok: true, accuracy, cpm, rankable: cpm > 0, clipped: raw > cap };
};

/**
 * 자동 입력 흔적 — 브라우저에서 입력 한 번마다 본다.
 * 사람이 치면 한 번에 1~2글자(한글 조합이 끝나며 다음 글자가 붙는 경우)만 늘어난다.
 * 스크립트가 만든 가짜 이벤트(isTrusted=false)나 한 번에 3글자 이상 들어오는 입력(자동 완성·매크로 붙여 넣기)은 표시한다.
 */
export const ASSISTED_CHUNK = 3;

export const isAssistedInput = ({
  trusted,
  composing,
  added,
}: {
  trusted: boolean;
  composing: boolean;
  /** 이번 입력으로 늘어난 글자 수 */
  added: number;
}): boolean => !trusted || (!composing && added >= ASSISTED_CHUNK);
