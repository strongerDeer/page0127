import { textWidth } from './theme';

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
