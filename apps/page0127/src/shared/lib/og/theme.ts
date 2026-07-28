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

export const OG_COLORS = {
  /** 배경 — 잉크 */
  ink: '#14294e',
  /** 본문 텍스트 — 종이 */
  paper: '#f4f8fd',
  /** 강조 — 인생책 배지·별 */
  gold: '#d9a520',
} as const;

/**
 * 크롤러가 카드를 다시 가져가는 주기.
 *
 * next/og 기본 헤더는 `max-age=0, must-revalidate` 라 부를 때마다 DB 조회와
 * Google Fonts 왕복이 일어난다. 책장 내용은 분 단위로 바뀌지 않으므로 CDN에 붙인다.
 * (1시간 신선 + 24시간까지는 갱신하는 동안 옛 카드를 그대로 내보낸다)
 */
export const OG_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

/**
 * 책등 — 높이·두께를 조금씩 달리해 실제 책장처럼 들쭉날쭉하게 세운다.
 * 책은 서로 맞닿아 꽂히므로 간격을 거의 주지 않는다(벌리면 막대그래프로 보인다).
 * 색은 브랜드 램프(블루) + 포인트(코랄) + 중성색을 섞는다.
 */
export const BOOK_SPINES = [
  { h: 300, w: 44, c: '#1e69cb' },
  { h: 352, w: 34, c: '#d9480f' },
  { h: 272, w: 52, c: '#31405f' },
  { h: 330, w: 38, c: '#d9a520' },
  { h: 288, w: 30, c: '#74b0ff' },
  { h: 364, w: 46, c: '#0455bf' },
  { h: 312, w: 36, c: '#5b6b8c' },
  { h: 262, w: 42, c: '#438ef2' },
] as const;

/**
 * 실제 권수만큼 책등을 세운다 — 카드가 "이 사람의 책장"임을 텍스트 없이 전달하는 부분.
 * 0권이면 빈 선반이 남고(그것도 정보다), 8권을 넘으면 8개에서 멈춘다.
 */
export const spinesFor = (bookCount: number) =>
  BOOK_SPINES.slice(0, Math.max(0, Math.min(bookCount, BOOK_SPINES.length)));

/**
 * 아직 한 권도 없는 책장에 세우는 빈 자리.
 *
 * 선반 선만 남기면 카드 오른쪽에 흰 줄 하나가 떠 있어 렌더가 깨진 것처럼 보인다.
 * 옅은 윤곽으로 자리를 그려 두면 "아직 비었다"가 의도로 읽힌다.
 */
export const GHOST_SPINES = [
  { h: 240, w: 44 },
  { h: 288, w: 36 },
  { h: 216, w: 50 },
  { h: 264, w: 40 },
  { h: 232, w: 46 },
] as const;

/**
 * 이름 줄의 글자 크기 — 선반을 밀어내지 않는 선에서 최대한 크게.
 *
 * 카드 좌측에 쓸 수 있는 폭은 약 690px 다(1200 − 좌우 패딩 144 − 선반 ~330 − 여백 40).
 * 한글 글리프는 폰트 크기와 거의 같은 폭을 차지하므로 64px 로는 10자가 한계고,
 * 넘으면 줄이 접히면서 "책장" 이 셋째 줄로 밀린다.
 */
export const shelfTitleFontSize = (lineChars: number): number =>
  lineChars <= 10 ? 64 : 48;

/**
 * 글자 수로 자른다 — 넘치면 말줄임표를 붙인다.
 *
 * `slice` 가 아니라 코드포인트 단위로 세는 이유: 이모지가 든 닉네임·책 제목을
 * `slice` 로 자르면 서로게이트 쌍이 반토막 나 깨진 문자가 만들어지고,
 * 그 깨진 코드포인트가 폰트 subset 요청에까지 실려 간다.
 */
export const truncate = (text: string, max: number): string => {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : text;
};
