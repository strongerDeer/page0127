/**
 * WCAG 명암비 계산.
 *
 * 색을 눈으로만 고르면 "충분히 진해 보이는데" 기준을 못 넘기는 일이 생긴다.
 * 실제로 `text/subtle` 이 4.496 으로 AA(4.5)에 0.004 모자란 채 오래 쓰이고 있었다
 * (Storybook addon-a11y 가 잡았다). 그래서 팔레트 문서가 수치를 같이 보여준다.
 */

/** sRGB 채널을 선형 값으로 되돌린다 (감마 역보정) */
const toLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** `#rgb` · `#rrggbb` 만 받는다. rgba() 같은 건 계산 대상이 아니다 */
export const parseHex = (value: string): [number, number, number] | null => {
  const hex = value.trim().replace(/^#/, '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

/** 상대 휘도 (WCAG 정의) */
export const luminance = (hex: string): number | null => {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** 두 색의 명암비 (1 ~ 21). 계산할 수 없으면 null */
export const contrastRatio = (fg: string, bg: string): number | null => {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === null || b === null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

export type ContrastGrade = 'AAA' | 'AA' | 'AA Large' | '미달';

/**
 * 일반 텍스트(14px 안팎) 기준 등급.
 * 'AA Large' 는 18.66px+bold 또는 24px 이상에서만 통과라는 뜻이라,
 * 본문에 쓰면 미달이다.
 */
export const gradeOf = (ratio: number): ContrastGrade => {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return '미달';
};
