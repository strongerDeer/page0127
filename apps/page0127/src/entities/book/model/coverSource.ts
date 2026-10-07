import { parseYes24CoverItemId, toYes24CoverBase } from '@repo/ui';

/**
 * 표지를 어디서 받을지 정한다 — YES24 주소가 먼저, 우리 Storage 사본은 대체용.
 *
 * 왜 YES24 가 먼저인가:
 * - YES24 Open API 공지가 "응답의 URL 을 이미지 주소로 그대로 사용"하라고 안내한다.
 *   Storage 사본은 백필 때 만든 것으로, 이미지 사본 저장은 약관에 명시가 없다.
 * - YES24 는 크기별 사본(M·L·XL)을 주므로 목록에선 더 작게, 상세에선 더 선명하게
 *   받을 수 있다. Storage 사본은 폭 500px 하나뿐이다.
 *
 * 왜 Storage 사본을 버리지 않는가: YES24 CDN 이 막히거나 느려질 때 표지가 통째로
 * 사라지지 않게 하려는 것이다. BookCover 가 src 실패 시 fallbackSrc 로 넘어간다.
 *
 * 학습 포인트:
 * - DB 는 그대로 두고 **읽는 쪽에서** 주소를 조립한다. 상품번호(provider_item_id)는
 *   영구히 유효하므로 주소를 저장해 둘 필요가 없다.
 */

export type CoverSource = {
  src: string | null;
  fallbackSrc: string | null;
};

type CoverFields = {
  cover_image: string | null | undefined;
  provider_item_id?: string | null;
};

/**
 * ⚠️ `cover_image` 가 비어 있으면 상품번호가 있어도 YES24 를 쓰지 않는다.
 *
 * YES24 는 이미지가 없는 상품에도 404 가 아니라 **HTTP 200 회색 플레이스홀더**를
 * 준다(`yes24Image.ts` 참고). 그러면 onError 가 안 터져서 대체 조판으로 못 넘어가고
 * 회색 네모가 그려진다. `cover_image` 가 있다는 건 등록·백필 때 진짜 표지를
 * 확인했다는 뜻이므로, 그때만 YES24 를 믿는다.
 */
export const toCoverSource = ({
  cover_image,
  provider_item_id,
}: CoverFields): CoverSource => {
  const stored = cover_image || null;
  if (!stored) return { src: null, fallbackSrc: null };

  // 이미 YES24 주소로 저장된 책(백필 이후 새로 등록한 책)은 대체할 사본이 없다
  if (parseYes24CoverItemId(stored)) return { src: stored, fallbackSrc: null };

  if (!provider_item_id) return { src: stored, fallbackSrc: null };

  return { src: toYes24CoverBase(provider_item_id), fallbackSrc: stored };
};
