import { TrackOnMount } from '@/shared/lib/analytics/TrackOnMount';

import { getShelfPicks } from '../api/getShelfPicks';
import { ShelfPreview } from './ShelfPreview';

/** 10권은 서버에서 읽고(캐시), 고르기는 클라이언트가 한다 */
export const ShelfPreviewSection = async () => {
  const picks = await getShelfPicks();
  return (
    <>
      {/* 맛보기 깔때기의 분모 — 히어로를 본 사람 수 */}
      <TrackOnMount event='shelf_preview_view' />
      <ShelfPreview picks={picks} />
    </>
  );
};
