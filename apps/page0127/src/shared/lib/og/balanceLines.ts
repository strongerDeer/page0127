import { textWidth } from './theme';
import { wrapLines } from './wrapLines';

/**
 * 한 줄에 안 들어가는 제목을 두 줄로 — 두 줄의 폭이 가장 비슷해지는 띄어쓰기에서 나눈다.
 * CSS text-wrap: balance 와 같은 일을 손으로 한다(satori 에서 확실히 쓸 수 있는 방법).
 * "내일의 나를 준비하는 / 사람"처럼 한 단어만 떨어지는 줄을 막는다.
 *
 * 줄바꿈(\n)이 들어 있으면 그 자리에서만 나눈다 — 슬로건처럼 의미 단위가 정해진 문장은
 * 폭만 보면 "책장을 보면, 그 / 사람이 보인다."처럼 엉뚱한 데서 끊긴다.
 *
 * @param maxWidth 한 줄 최대 폭(한글 글자 수 기준, theme.textWidth)
 */
export const balanceLines = (text: string, maxWidth: number): string[] => {
  if (text.includes('\n')) return text.split('\n');
  if (textWidth(text) <= maxWidth) return [text];

  const words = text.split(' ');
  let best: string[] = [text];
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const widest = Math.max(...lines.map(textWidth));
    if (widest < bestWidth) {
      best = lines;
      bestWidth = widest;
    }
  }
  return best;
};

/**
 * 줄 수는 그대로 두고, 그 줄 수에 들어가는 **가장 좁은 폭**으로 다시 나눈다.
 * CSS text-wrap: balance 와 같은 결과 — 마지막 줄만 한두 어절로 짧게 남지 않는다.
 * 한 어절보다 좁게는 내려가지 않는다(어절이 글자 단위로 쪼개지지 않게).
 */
const narrowest = (text: string, lineCount: number, maxWidth: number) => {
  const longestWord = Math.max(
    ...text
      .trim()
      .split(/\s+/)
      .map((word) => textWidth(word))
  );
  const start = Math.max(longestWord, textWidth(text) / lineCount - 1);
  for (let width = start; width < maxWidth; width += 0.25) {
    const lines = wrapLines(text, width, Infinity);
    if (lines.length <= lineCount) return lines;
  }
  return wrapLines(text, maxWidth, Infinity);
};

/**
 * 여러 줄 문장용 공통 줄 나누기 — 공유 이미지의 모든 여러 줄 글은 이것을 쓴다(HJ 2026-11-27 "전체 text-balance").
 * - maxLines 안에 들어가면: 줄 수는 그대로, 줄 길이를 고르게(narrowest).
 *   "같은 방향을 보며 걷지만, 각자의 속도가 있는 / 사이예요."처럼 마지막 한 단어만 떨어지지 않는다.
 * - 넘치면: 앞에서부터 채운 뒤 maxLines 에서 말줄임한다(wrapLines) — 잘리는 글은 고르게 할 필요가 없다.
 * - 줄바꿈(\n)이 있으면 문단마다 따로 고르게 나눈다(의미 단위로 나눈 줄을 지킨다).
 */
export const balancedWrap = (
  text: string,
  maxWidth: number,
  maxLines: number
): string[] => {
  const paragraphs = text
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const filled = paragraphs.map((p) => wrapLines(p, maxWidth, Infinity));
  const total = filled.reduce((sum, lines) => sum + lines.length, 0);
  if (total > maxLines)
    return wrapLines(paragraphs.join(' '), maxWidth, maxLines);
  return paragraphs.flatMap((p, i) =>
    filled[i].length <= 1 ? filled[i] : narrowest(p, filled[i].length, maxWidth)
  );
};
