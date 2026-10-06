export type Word = { text: string; key: boolean };

/** 문장 조각을 단어로 쪼갠다. key 가 붙은 조각의 단어는 강조색으로 켜진다 */
export const toWords = (segments: { text: string; key?: boolean }[]): Word[] =>
  segments.flatMap(({ text, key = false }) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({ text: w, key }))
  );

/** 스크롤 진행도(0~1)에 맞춰 켤 단어 수 */
export const litCount = (progress: number, total: number): number =>
  Math.round(Math.min(1, Math.max(0, progress)) * total);
