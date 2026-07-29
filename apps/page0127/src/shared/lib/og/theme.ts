/**
 * 공유 카드(OG 이미지) 공통 테마
 *
 * 홈·공개 책장·책 기록이 각자 카드를 그리므로, 색과 책등을 여기 한 곳에 둔다.
 * 같은 서비스의 링크인데 카드가 서로 다른 브랜드처럼 보이면 안 된다.
 *
 * ⚠️ OG 라우트에서 지켜야 할 두 가지 (docs/superpowers/specs/2026-07-28-track-e-share-og-design.md)
 * 1. `export const runtime = 'edge'` 를 쓰지 않는다 — next/og 번들이 ~2.4MB라
 *    Vercel Hobby의 Edge Function 1MB 한도를 넘겨 배포가 실패한다(빌드는 통과한다).
 * 2. 한글 폰트를 번들하지 않는다 — next/og가 Google Fonts에서 등장 글자만 subset으로
 *    받아온다. 다만 그 요청이 실패하면 예외 없이 **글자만 사라지므로**, 텍스트는 짧게
 *    자르고 카드의 뼈대는 색면(책등)이 지도록 짠다.
 */

/** OG 표준 크기 (1.91:1) — 카톡·트위터·슬랙이 공통으로 쓰는 비율 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * 팔레트 — 앱의 시맨틱 토큰에서 그대로 가져온다.
 *
 * 카드는 **공개 서재 헤더와 같은 면**이다(`bg-accent` = blue.50, 흰 배경 위 스카이 틴트).
 * 이전 카드는 배경에 navy.900 을 썼는데, 그건 앱에서 **본문 글자색**이다 —
 * 링크를 눌러 들어온 화면과 톤이 정반대라 같은 서비스로 보이지 않았다.
 *
 * (packages/design-tokens/tokens/semantic.json 기준. 값이 바뀌면 여기도 따라간다)
 */
export const OG_COLORS = {
  /** 카드 배경 — blue.50 = 앱의 `accent`, 공개 서재 헤더와 같은 면 */
  sky: '#e3eefc',
  /** 브랜드·강조 숫자 — blue.700 = 앱의 `accent-foreground` */
  skyDeep: '#0455bf',
  /** 본문 텍스트 — navy.900 = 앱의 `foreground` */
  ink: '#14294e',
  /** 보조 텍스트 — navy.500 = 앱의 `muted-foreground` */
  inkSoft: '#66779a',
  /** 선반·표지 바탕 — gray.0 */
  paper: '#ffffff',
  /** 인생책 — amber.500 = 앱의 `chart-4` */
  gold: '#d9a520',
} as const;

/**
 * 크롤러가 카드를 다시 가져가는 주기.
 *
 * next/og 기본 헤더는 `max-age=0, must-revalidate` 라 부를 때마다 DB 조회와
 * Google Fonts 왕복이 일어난다. 책장 내용은 분 단위로 바뀌지 않으므로 CDN에 붙인다.
 */
export const OG_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600';

/** 카드 안쪽 폭 = 1200 − 좌우 패딩 64×2 (CardFrame 과 맞춰야 한다) */
export const SHELF_WIDTH = 1072;

/** 책등 사이 틈. 실제 책장에서 책은 서로 맞닿아 있다 */
export const SPINE_GAP = 1;

/** 이보다 좁으면 책으로 안 보인다 — 선반 끝을 메울 때의 하한 */
const MIN_SPINE_WIDTH = 30;

/**
 * 책등의 크기와 색을 **서로 다른 주기로** 돌린다.
 *
 * 한 배열을 순환시키면 8권마다 같은 책이 반복되는 게 눈에 보인다.
 * 크기 7종 × 색 8종이라 56권까지 같은 조합이 다시 나오지 않는다
 * (선반에 들어가는 27권보다 넉넉하다).
 */
const SPINE_SIZES = [
  { h: 172, w: 42 },
  { h: 208, w: 34 },
  { h: 156, w: 46 },
  { h: 192, w: 38 },
  { h: 164, w: 32 },
  { h: 216, w: 44 },
  { h: 180, w: 36 },
] as const;

/**
 * 책등 색 — 밝은 스카이 배경에서 또렷하게 읽히도록 **진한 쪽**으로 모았다.
 * 이전 팔레트의 blue.300(#74b0ff)은 배경과 명도가 가까워 흐릿하게 뭉갠다.
 * 앰버와 오렌지는 리듬을 만드는 포인트라 비중을 낮게 둔다.
 */
const SPINE_COLORS = [
  '#1e69cb',
  '#3b4e70',
  '#0455bf',
  '#d9a520',
  '#2d78db',
  '#66779a',
  '#438ef2',
  '#d9480f',
] as const;

export type Spine = { h: number; w: number; c: string };

/**
 * 실제 권수만큼 책등을 세운다 — 카드가 "이 사람의 책장"임을 텍스트 없이 전달하는 부분.
 *
 * 상한을 "몇 권"이 아니라 **선반 폭**으로 잡는다. 개수로 자르면 남는 자리가 생겨
 * 선반 오른쪽이 휑하게 비고(24권일 때 174px 이 남았다) 카드 좌우가 비대칭이 된다.
 * 폭으로 자르면 다 읽은 사람의 선반이 양끝까지 꽉 찬다.
 */
export const spinesFor = (bookCount: number): Spine[] => {
  const count = Math.max(0, Math.floor(bookCount));
  const spines: Spine[] = [];
  let x = 0;

  for (let i = 0; i < count; i++) {
    const size = SPINE_SIZES[i % SPINE_SIZES.length];
    if (x + size.w > SHELF_WIDTH) break;

    spines.push({ ...size, c: SPINE_COLORS[i % SPINE_COLORS.length] });
    x += size.w + SPINE_GAP;
  }

  // 남은 자리가 책 한 권만큼 되는데 다음 책등 폭이 딱 안 맞아 비는 경우가 있다
  // (26권을 세우고 39px 이 남았다). 아직 못 세운 책이 있으면 그 자리를 마지막 한 권으로
  // 채워 선반이 양끝까지 이어지게 한다 — 오른쪽만 비면 카드 좌우가 어긋나 보인다.
  const remain = SHELF_WIDTH - x;
  const i = spines.length;

  if (i < count && remain >= MIN_SPINE_WIDTH) {
    spines.push({
      h: SPINE_SIZES[i % SPINE_SIZES.length].h,
      w: remain - SPINE_GAP,
      c: SPINE_COLORS[i % SPINE_COLORS.length],
    });
  }

  return spines;
};

/** 브랜드 카드(홈·폴백)에서 쓰는 꽉 찬 선반 */
export const BRAND_SPINES = spinesFor(Number.MAX_SAFE_INTEGER);

/**
 * 아직 한 권도 없는 책장에 그리는 빈 자리.
 * 선반 선만 남기면 렌더가 깨진 것처럼 보이므로, 옅은 윤곽으로 자리를 그려 둔다.
 */
export const GHOST_SPINES = [
  { h: 172, w: 44 },
  { h: 208, w: 34 },
  { h: 156, w: 52 },
  { h: 192, w: 38 },
  { h: 164, w: 30 },
] as const;

/**
 * 글자가 차지하는 **폭**을 근사한다 (1 = 대문자 한글 한 글자).
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

/**
 * 제목 줄의 글자 크기 — 한 줄에 담기는 선에서 최대한 크게.
 *
 * 카드 안쪽 폭은 SHELF_WIDTH(1072px)이고 한글 글리프는 폰트 크기와 거의 같은 폭을
 * 차지한다. 폭 기준이라 라틴 이름은 자연히 더 여유가 생긴다.
 */
export const titleFontSize = (width: number): number => {
  if (width <= 13) return 68;
  if (width <= 17) return 56;
  return 46;
};
