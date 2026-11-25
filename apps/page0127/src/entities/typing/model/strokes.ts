/**
 * 타수 계산 — 한글 자판을 몇 번 눌렀는가
 *
 * 옛날 타자 연습 프로그램처럼 "분당 타수"를 보여 주려면 글자 수가 아니라 키를 누른 횟수를 세야 한다.
 * 완성형 한글 한 글자를 초성·중성·종성으로 풀어서 센다.
 *   - 초성: 1타 (ㄲ·ㄸ 같은 쌍자음도 Shift 와 함께 한 번 → 1타)
 *   - 중성: 1타, 단 ㅘ·ㅙ·ㅚ·ㅝ·ㅞ·ㅟ·ㅢ 처럼 두 모음을 이어 치는 것은 2타
 *   - 종성: 없으면 0, 있으면 1타, 단 ㄳ·ㄵ 같은 겹받침은 2타
 * 한글이 아닌 글자(공백·문장부호·숫자)는 1타.
 */

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** 두 번 치는 중성 인덱스: ㅘ(9) ㅙ(10) ㅚ(11) ㅝ(14) ㅞ(15) ㅟ(16) ㅢ(19) */
const DOUBLE_MEDIALS = new Set([9, 10, 11, 14, 15, 16, 19]);
/** 두 번 치는 종성 인덱스: ㄳ(3) ㄵ(5) ㄶ(6) ㄺ~ㅀ(9~15) ㅄ(18) */
const DOUBLE_FINALS = new Set([3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 18]);

export const strokesOf = (char: string): number => {
  const code = char.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return 1;
  const syllable = code - HANGUL_START;
  const medial = Math.floor((syllable % 588) / 28);
  const final = syllable % 28;
  const medialStrokes = DOUBLE_MEDIALS.has(medial) ? 2 : 1;
  const finalStrokes = final === 0 ? 0 : DOUBLE_FINALS.has(final) ? 2 : 1;
  return 1 + medialStrokes + finalStrokes;
};

export type TypingJudge = {
  /** 판정이 끝난 글자 수 — 한글 조합 중인 마지막 글자는 아직 판정하지 않는다 */
  settled: number;
  /** 맞게 친 글자의 타수 합 */
  correctStrokes: number;
  /** 판정한 글자 중 틀린 위치 */
  wrong: number[];
};

/**
 * 입력과 원문을 글자 단위로 견준다.
 * composing 이면 마지막 글자는 아직 조합 중("ㄱ" → "가" → "각")이라 판정에서 뺀다 —
 * 그러지 않으면 치는 도중 계속 빨갛게 깜빡인다.
 */
export const judgeTyping = (
  input: string,
  target: string,
  composing: boolean
): TypingJudge => {
  const typed = Math.min(input.length, target.length);
  const settled = composing ? Math.max(0, typed - 1) : typed;
  let correctStrokes = 0;
  const wrong: number[] = [];
  for (let i = 0; i < settled; i++) {
    if (input[i] === target[i]) correctStrokes += strokesOf(target[i]);
    else wrong.push(i);
  }
  return { settled, correctStrokes, wrong };
};

/** 분당 타수. 3초 이전엔 값이 널뛰므로 0 으로 둔다 */
export const strokesPerMinute = (strokes: number, elapsedMs: number): number =>
  elapsedMs < 3000 ? 0 : Math.round(strokes / (elapsedMs / 60_000));
