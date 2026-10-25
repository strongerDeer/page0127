import { UpdatesTimeline } from '@/widgets/about';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공지·업데이트 | page0127.',
  description:
    'page0127.에 새로 생긴 기능과 바뀐 점을 날짜순으로 모아 둔 공지·업데이트 기록이에요.',
};

/**
 * 공지·업데이트 — 소개 페이지 자리를 이어받았다(2026-10-25 홈 개편).
 * 소개(설득)는 홈이 맡고, 여기는 배포 이력만 쌓는다. 메뉴에는 없고 푸터에서 닿는다.
 */
const UpdatesPage = () => (
  // break-keep: 한국어를 단어 단위로 줄바꿈한다
  <div className='break-keep'>
    <UpdatesTimeline headingAs='h1' limit={10} />
  </div>
);

export default UpdatesPage;
