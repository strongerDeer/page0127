/**
 * 공유 카드(OG 이미지) 공통 테마
 *
 * 홈·공개 책장·책 기록이 각자 카드를 그리므로, 색과 책등을 여기 한 곳에 둔다.
 * 같은 서비스의 링크인데 카드가 서로 다른 브랜드처럼 보이면 안 된다.
 *
 * ⚠️ OG 라우트에서 지켜야 할 두 가지 (docs/superpowers/specs/2026-07-28-track-e-share-og-design.md)
 * 1. `export const runtime = 'edge'` 를 쓰지 않는다 — next/og 번들이 ~2.4MB라
 *    Vercel Hobby의 Edge Function 1MB 한도를 넘겨 배포가 실패한다(빌드는 통과한다).
 * 2. 폰트는 render.tsx 의 renderOg 로만 붙인다 — Pretendard woff 를 런타임에 받는다.
 *    받기에 실패하면 next/og 기본 폰트로 떨어지고, 그 기본 폰트 요청까지 실패하면 예외
 *    없이 **글자만 사라진다.** 그래서 텍스트는 짧게 자르고 카드의 뼈대는 색면·표지가 지게 짠다.
 */

/** OG 표준 크기 (1.91:1) — 카톡·트위터·슬랙이 공통으로 쓰는 비율 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * 팔레트 — 디자인 시스템의 시맨틱 토큰을 그대로 가져온다.
 *
 * 흰 면 위에 가운데 정렬이다. 이전 카드는 스카이 배경(blue.50)에 좌측 정렬이었는데
 * 두 가지 문제가 있었다:
 * - 좌측 정렬은 **정사각 크롭에서 잘린다.** 일부 플랫폼이 1.91:1 카드를 정사각으로
 *   잘라 쓰는데, 그때 오른쪽에 있던 숫자("157권")가 통째로 사라졌다.
 * - 배경 색면이 카드의 절반을 차지해 정작 내용이 들어갈 자리를 좁혔다.
 *
 * (packages/design-tokens 와 Figma `page0127-Design-System` 의 Semantic 컬렉션 기준)
 */
export const OG_COLORS = {
  /** 카드 배경 — background = gray/0 */
  paper: '#ffffff',
  /** 제목·본문 — text/strong = navy/900 */
  ink: '#14294e',
  /** 보조 텍스트 — text/subtle = navy/600 */
  inkSoft: '#5f6f8f',
  /** 강조 숫자 — accent-foreground = blue/700 */
  accentDeep: '#0455bf',
  /** 브랜드 심볼 바탕·별점 — brand/symbol-bg = blue/600 */
  brand: '#1e69cb',
  /** 심볼 북마크와 강조 책등 — brand/accent = mint/300. 유일한 비(非)블루 요소 */
  mint: '#6ee7b7',
  /** 선반 널·빈 별 — line = gray/300 */
  line: '#dfe3e8',
} as const;

/**
 * 크롤러가 카드를 다시 가져가는 주기.
 *
 * next/og 기본 헤더는 `max-age=0, must-revalidate` 라 부를 때마다 DB 조회와
 * Google Fonts 왕복이 일어난다. 책장 내용은 분 단위로 바뀌지 않으므로 CDN에 붙인다.
 */
export const OG_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600';

/**
 * 글자가 차지하는 **폭**을 근사한다 (1 = 한글 한 글자).
 *
 * 글자 수만 세면 라틴 이름이 억울하게 잘린다 — `stronger_deer`(13자)는 한글 8자 정도
 * 폭인데도 "10자 초과"로 걸려 `stronger_d…` 가 됐다. 한글·CJK·이모지는 정폭에 가깝고,
 * 라틴 글자·숫자·기호는 그 절반 남짓이다.
 */
const isWide = (ch: string): boolean => {
  const code = ch.codePointAt(0) ?? 0;

  return (
    (code >= 0x1100 && code <= 0x115f) || // 한글 자모
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK 부수 ~ 한글 음절 앞
    (code >= 0xac00 && code <= 0xd7a3) || // 한글 음절
    (code >= 0xf900 && code <= 0xfaff) || // CJK 호환
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK 호환 기호
    (code >= 0xff00 && code <= 0xff60) || // 전각
    (code >= 0xffe0 && code <= 0xffe6) ||
    code >= 0x1f000 // 이모지
  );
};

/** 좁은 글자(라틴·숫자·공백)가 한글 한 글자에 대해 차지하는 비율 */
const NARROW_RATIO = 0.55;

/** 문자열이 한글 몇 글자만큼의 폭인지 */
export const textWidth = (text: string): number =>
  [...text].reduce((sum, ch) => sum + (isWide(ch) ? 1 : NARROW_RATIO), 0);

/**
 * **폭** 기준으로 자른다 — 넘치면 말줄임표를 붙인다.
 *
 * 코드포인트 단위로 도는 이유: 이모지가 든 닉네임·책 제목을 `slice` 로 자르면
 * 서로게이트 쌍이 반토막 나 깨진 문자가 만들어지고, 그 깨진 코드포인트가
 * 폰트 subset 요청에까지 실려 간다.
 *
 * @param maxWidth 한글 글자 수로 센 최대 폭
 */
export const truncate = (text: string, maxWidth: number): string => {
  if (textWidth(text) <= maxWidth) return text;

  let width = 0;
  const kept: string[] = [];

  for (const ch of text) {
    // 말줄임표도 폭을 차지한다
    if (width + (isWide(ch) ? 1 : NARROW_RATIO) > maxWidth - NARROW_RATIO)
      break;
    width += isWide(ch) ? 1 : NARROW_RATIO;
    kept.push(ch);
  }

  return `${kept.join('')}…`;
};
