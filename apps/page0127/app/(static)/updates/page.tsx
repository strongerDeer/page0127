import { buildShareMetadata } from '@/shared/lib/seo/shareMetadata';

import { UpdatesTimeline } from '@/widgets/about';

import type { Metadata } from 'next';

const UPDATES_TITLE = '공지·업데이트 | page0127.';
const UPDATES_DESCRIPTION =
  'page0127.에 새로 생긴 기능과 바뀐 점을 날짜순으로 모아 둔 공지·업데이트 기록이에요. 책장, 오늘의 문장, 온라인 필사처럼 써 볼 만한 새 기능을 여기서 먼저 알려 드려요.';

export const metadata: Metadata = {
  title: UPDATES_TITLE,
  description: UPDATES_DESCRIPTION,
  alternates: { canonical: '/updates' },
  ...buildShareMetadata({
    path: '/updates',
    title: UPDATES_TITLE,
    description: UPDATES_DESCRIPTION,
  }),
};

/**
 * 공지·업데이트 — 배포 이력만 쌓는다. 메뉴에는 없고 푸터에서 닿는다.
 * 소개(설득)는 홈이, 평평한 설명은 /about 이 맡는다(2026-11-21 /about 재개설).
 */
const UpdatesPage = () => (
  // break-keep: 한국어를 단어 단위로 줄바꿈한다
  <div className='break-keep'>
    <UpdatesTimeline headingAs='h1' limit={10} />
  </div>
);

export default UpdatesPage;
