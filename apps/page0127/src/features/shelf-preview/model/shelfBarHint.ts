import { FIRST_IMPRESSION_MIN_BOOKS } from '@/entities/taste-analysis/model/firstImpression';

/**
 * 모바일 하단 바의 한 줄 — 고를 때마다 바뀌어 "고른 게 반영되고 있다"를 보여 준다.
 * 세 권 전에는 첫인상까지 남은 권수, 그 뒤에는 첫인상 이름(바의 주인공).
 * 세 권을 넘겼는데 첫인상이 없으면(분류 불명 책뿐) 권수만 말한다 — 없는 이름을 지어내지 않는다.
 */
export const toShelfBarHint = (
  count: number,
  impressionName: string | null
): string | null => {
  if (count < FIRST_IMPRESSION_MIN_BOOKS) {
    return `${FIRST_IMPRESSION_MIN_BOOKS - count}권만 더 고르면 첫인상`;
  }
  return impressionName;
};
