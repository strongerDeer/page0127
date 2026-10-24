import { OG_SIZE } from '@/shared/lib/og/theme';

import ShelfImage from '../opengraph-image';

// 배지 책장의 공유 그림 — 서재 그림을 그대로 쓴다.
//
// 상위 [username] 의 opengraph-image 는 이 페이지에도 물려 내려오지만, 이 페이지가
// generateMetadata 에서 openGraph(제목·설명)를 적는 순간 부모의 그림이 함께 지워진다
// (Next 는 openGraph 객체를 통째로 갈아 끼운다). 그래서 이 자리에 같은 그림을 다시 단다.

export const alt = '배지 책장 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default ShelfImage;
