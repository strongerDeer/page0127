/**
 * YES24 표지를 화면 폭에 맞는 크기로 받는 next/image loader.
 *
 * YES24 는 같은 표지를 세 크기로 미리 만들어 둔다(2026-10-07 실측, 상품 13137546):
 *
 *   M    151 x 220    14KB
 *   L    275 x 400    40KB
 *   XL   827 x 1200  249KB   ← 장변 1200 기준이라 폭은 책마다 다르다(760~957)
 *
 * 그래서 Vercel 변환(`/_next/image`, 월 한도 있음)을 태울 필요 없이 **필요한 폭에
 * 맞는 사본의 주소만 고르면 된다.** 이 loader 를 주면 next/image 가 srcset 의 각 폭마다
 * 이 함수를 불러 주소를 만들고, 브라우저가 화면 밀도(1x·2x)에 맞는 것을 고른다.
 *
 * 예전에는 원본(XL) 하나를 `unoptimized` 로 그대로 내보냈다 — 높이 80px 짜리 목록
 * 표지 한 장에 249KB 가 실렸다.
 */

const COVER_PATH = /^\/goods\/(\d+)(?:\/(?:M|L|XL))?$/;
const HOST = 'image.yes24.com';

/** M 사본의 실제 폭. 요청 폭이 이 이하면 M 으로 충분하다 */
const M_WIDTH = 151;

/**
 * 이 폭을 넘는 요청에만 XL 을 준다(큰 표지 자리에서만).
 *
 * next/image 의 srcset 은 정해진 폭 단계(…128, 256, 384, 640…)로만 요청하므로
 * 384 까지는 L(275px)로 덮는다 — 최대 1.4배 확대라 표지에선 눈에 띄지 않는다.
 * 그다음 단계(640)부터 XL 이다.
 */
const XL_FROM_WIDTH = 384;

/**
 * YES24 앞표지 주소면 상품번호를, 아니면 null 을 돌려준다.
 *
 * 크기가 붙은 주소(`/goods/123/XL`)와 크기를 뗀 주소(`/goods/123`)를 모두 받는다.
 * 책등(`/SIDE/XL`)·뒷표지(`/BACK/XL`)는 앞표지와 비율이 달라 여기서 다루지 않는다.
 */
export const parseYes24CoverItemId = (src?: string | null): string | null => {
  if (!src) return null;

  try {
    const { hostname, pathname, protocol } = new URL(src);
    if (protocol !== 'https:' || hostname !== HOST) return null;
    return COVER_PATH.exec(pathname)?.[1] ?? null;
  } catch {
    return null;
  }
};

/**
 * 크기를 뗀 표지 주소. BookCover 는 이것을 next/image 의 src 로 넘긴다.
 *
 * 왜 떼는가: next/image 는 개발 모드에서 `loader(src, 400)` 이 src 와 똑같으면
 * "loader 가 폭을 반영하지 않는다"고 경고한다. DB 에 저장된 `/XL` 을 그대로
 * 넘기면 큰 표지(폭 400 → XL)에서 정확히 그 경우가 된다. 크기 없는 주소를 넘기면
 * loader 결과는 항상 src 와 다르다.
 */
export const toYes24CoverBase = (itemId: string): string =>
  `https://${HOST}/goods/${itemId}`;

/**
 * 요청 폭(px)에 맞는 크기를 고른다.
 *
 * ⚠️ XL 은 `allowXL` 일 때만 준다. 3x 화면에서 격자 표지(CSS 130px)는 390px 이
 * 필요해 srcset 이 640 단계로 올라가는데, 그대로 XL(249KB)을 주면 표지 열여덟 장에
 * 4MB 가 넘는다. Storage 사본(폭 500px, 40~90KB)을 쓰던 때보다 무거워진다.
 * 그래서 목록은 L 에서 멈추고, 상세처럼 표지 한 장을 크게 놓는 자리만 XL 을 연다.
 */
export const pickYes24CoverSize = (
  width: number,
  allowXL = false
): 'M' | 'L' | 'XL' => {
  if (width <= M_WIDTH) return 'M';
  if (allowXL && width > XL_FROM_WIDTH) return 'XL';
  return 'L';
};

type LoaderArgs = { src: string; width: number };

const loadYes24Cover = ({ src, width }: LoaderArgs, allowXL: boolean) => {
  const itemId = parseYes24CoverItemId(src);
  if (!itemId) return src;
  return `${toYes24CoverBase(itemId)}/${pickYes24CoverSize(width, allowXL)}`;
};

/**
 * next/image 의 `loader` — 목록·카드용(최대 L). YES24 표지가 아니면 src 그대로.
 *
 * quality 는 쓰지 않는다 — YES24 가 정해 둔 JPEG 를 그대로 받기 때문이다.
 */
export const yes24CoverLoader = (args: LoaderArgs): string =>
  loadYes24Cover(args, false);

/** next/image 의 `loader` — 상세처럼 표지를 크게 놓는 자리용(XL 허용) */
export const yes24LargeCoverLoader = (args: LoaderArgs): string =>
  loadYes24Cover(args, true);
