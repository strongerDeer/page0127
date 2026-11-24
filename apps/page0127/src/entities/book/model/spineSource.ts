import { toYes24SpineDisplaySrc } from '@repo/ui';

import { buildYes24SpineUrl } from '@/shared/api/book-provider';

/**
 * 책장에 꽂을 책등을 어디서 받을지 정한다 — 표지(toCoverSource)와 같은 규칙.
 * YES24 작은 사본(SIDE/L, 높이 400px · 3~5KB)이 먼저, 우리 Storage 사본은 대체용.
 *
 * 왜 바꿨나(2026-11-24):
 * 표지는 #490 에서 YES24 작은 사본으로 돌렸지만, 책장 책등은 DB 값을 그대로 썼다.
 * - Storage 사본(`{isbn}/spine.jpg`, 높이 600px JPEG)을 그대로 받고
 * - YES24 로 저장된 책등은 가장 큰 `/SIDE/XL`(높이 1200px, 8~51KB)을 받았다.
 * 책장 책등은 높이 240px 로 그려지므로 둘 다 필요보다 크다(프로필 이미지 무게의 일부).
 *
 * 왜 Storage 사본을 버리지 않는가: YES24 가 막히거나, 그 상품에 책등이 없어
 * 회색 대체 그림(420x600)을 주면 원래 보이던 사본으로 돌아가야 한다.
 * PublicBookShelf 가 onError 와 "책등 모양이 아님"(isSpineShaped) 두 경우에 fallbackSrc 로 넘긴다.
 *
 * ⚠️ 2배 화면에선 240px 칸에 400px 그림이라 아주 살짝(1.2배) 확대된다. 폭 10~20px 짜리
 * 책등이라 눈에 띄지 않는다고 봤다. 거슬리면 이 함수에서 L → XL 만 바꾸면 된다.
 */

export type SpineSource = {
  src: string | null;
  fallbackSrc: string | null;
};

type SpineFields = {
  spine_image: string | null | undefined;
  provider_item_id?: string | null;
};

/**
 * 백필 스크립트가 YES24 책등을 옮겨 둔 자리(`book-covers/{isbn}/spine.jpg`)만 YES24 로 바꾼다.
 * 알라딘에서 건진 책등(`book-covers/aladin/...`)이나 직접 올린 그림은 YES24 에 같은
 * 책등이 있다는 보장이 없어서 그대로 둔다.
 */
const MIRRORED_SPINE_PATH =
  /\/storage\/v1\/object\/public\/book-covers\/[^/]+\/spine\.jpg$/;

const isMirroredSpine = (url: string): boolean => {
  try {
    return MIRRORED_SPINE_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

export const toSpineSource = ({
  spine_image,
  provider_item_id,
}: SpineFields): SpineSource => {
  const stored = spine_image || null;
  if (!stored) return { src: null, fallbackSrc: null };

  // 1) YES24 주소로 저장된 책등 → 같은 책등의 작은 사본(L). 대체는 원래 주소(XL).
  const display = toYes24SpineDisplaySrc(stored);
  if (display !== stored) return { src: display, fallbackSrc: stored };

  // 2) 백필이 옮겨 둔 Storage 사본 + 상품번호 → YES24 작은 사본, 대체는 Storage 사본.
  if (provider_item_id && isMirroredSpine(stored)) {
    return {
      src: buildYes24SpineUrl(provider_item_id, 'L'),
      fallbackSrc: stored,
    };
  }

  // 3) 나머지(알라딘 사본·상품번호 없음 등)는 저장된 그대로
  return { src: stored, fallbackSrc: null };
};
