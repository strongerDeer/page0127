import { getPublicShelfSummary } from '@/entities/book/api/getPublicShelfSummary';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';
import { getPublicTasteHistory } from '@/entities/taste-analysis/api/getPublicTasteHistory';

import { type ReaderCard, toReaderCard } from '../model/readerCard';

export type ReaderShareData = {
  displayName: string;
  totalBooks: number;
  /** 최근 완독 표지 — 최신순, 최대 COVER_LIMIT 장 */
  covers: string[];
  card: ReaderCard;
};

/**
 * 공유 이미지(OG 카드·스토리)에 들어갈 독서 명함 — 없는 사용자면 null.
 *
 * 두 이미지가 각자 조회하면 언젠가 한쪽만 규칙이 바뀐다. 여기 한 곳에서 모아
 * 서재 상단 명함과 같은 toReaderCard 로 만든다.
 * 공개된 칸만 쓴다(공개 프로필·공개 완독 책·공개 취향 이력) — 미리보기는 링크를 받은 사람이 볼 것과 같아야 한다.
 */
export const getReaderShareData = async (
  username: string
): Promise<ReaderShareData | null> => {
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return null;

  const [summary, history] = await Promise.all([
    getPublicShelfSummary(profile.id),
    getPublicTasteHistory(profile.id),
  ]);

  return {
    displayName: toDisplayName(profile),
    totalBooks: summary.totalBooks,
    covers: summary.covers,
    card: toReaderCard({
      latestType: history[0]?.personality_type,
      categories: summary.categories,
      yearBooks: summary.yearBooks,
      totalBooks: summary.totalBooks,
    }),
  };
};
