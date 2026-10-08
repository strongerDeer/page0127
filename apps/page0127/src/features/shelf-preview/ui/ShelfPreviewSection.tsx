import { getShelfPicks } from '../api/getShelfPicks';
import { ShelfPreview } from './ShelfPreview';

/** 10권은 서버에서 읽고(캐시), 고르기는 클라이언트가 한다 */
export const ShelfPreviewSection = async () => {
  const picks = await getShelfPicks();
  return <ShelfPreview picks={picks} />;
};
