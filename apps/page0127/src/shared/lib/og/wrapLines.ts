import { textWidth, truncate } from './theme';

/**
 * 긴 문장을 줄 수 제한 안에서 나눈다 — 넘치면 마지막 줄 끝에 말줄임표.
 *
 * satori 도 글자를 감싸 주지만 "몇 줄까지"를 정할 수 없다. 한줄평은 300자까지라
 * 그대로 두면 카드 아래로 흘러넘친다. 그래서 줄을 손으로 나누고 각 줄을 따로 그린다.
 *
 * 띄어쓰기에서 나눈다(한글 어절이 중간에 끊기지 않게). 한 어절이 한 줄보다 길면
 * (URL·띄어쓰기 없는 문장) 그 어절만 글자 단위로 자른다.
 *
 * @param maxWidth 한 줄 최대 폭(한글 글자 수 기준, theme.textWidth)
 * @param maxLines 최대 줄 수
 */
export const wrapLines = (
  text: string,
  maxWidth: number,
  maxLines: number
): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  const push = (line: string) => {
    lines.push(line);
    current = '';
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) push(current);

    // 한 줄보다 긴 어절 — 글자 단위로 잘라 줄을 채운다
    let rest = word;
    while (textWidth(rest) > maxWidth) {
      let width = 0;
      let cut = 0;
      const chars = [...rest];
      while (cut < chars.length && width + textWidth(chars[cut]) <= maxWidth) {
        width += textWidth(chars[cut]);
        cut += 1;
      }
      push(chars.slice(0, cut).join(''));
      rest = chars.slice(cut).join('');
    }
    current = rest;
  }
  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;

  // 넘친 줄은 버리고 마지막 줄에 말줄임표 — 남은 말이 있다는 것을 알린다
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] =
    textWidth(`${last}…`) <= maxWidth ? `${last}…` : truncate(last, maxWidth);
  return kept;
};
