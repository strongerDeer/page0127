import { CheerOgCard } from '@/shared/lib/og/CheerOgCard';
import { renderOg } from '@/shared/lib/og/render';
import { OG_SIZE } from '@/shared/lib/og/theme';

import { CHEER_YEAR } from '@/entities/year-cheer';

// 연말 응원 카드(/아이디/cheer) 링크 미리보기 그림 (2026-11-27)
//
// 자기 그림이 없으면 위 폴더의 공개 책장 그림을 물려받아, 친구가 카톡으로 받은 선물 링크가
// 그냥 책장 링크처럼 보였다. 응원 카드 화면과 같은 디자인(CheerOgCard)으로 그린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = `${CHEER_YEAR} 연말 응원 | page0127.`;
export const size = OG_SIZE;
export const contentType = 'image/png';

const Image = () => renderOg(<CheerOgCard year={CHEER_YEAR} />);

export default Image;
