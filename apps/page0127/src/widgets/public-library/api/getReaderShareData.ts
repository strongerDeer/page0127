import { getCurrentLibraryYear } from '@/entities/book';
import {
  getPublicShelfSummary,
  type PublicShelfBook,
} from '@/entities/book/api/getPublicShelfSummary';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';
import { getPublicTasteHistory } from '@/entities/taste-analysis/api/getPublicTasteHistory';

import { type ReaderCard, toReaderCard } from '../model/readerCard';

import type { ReadingGoal } from '@/entities/profile/types';

export type ReaderShareData = {
  /** 서재 주인 id — 스토리 라우트가 더 읽을 것이 있을 때(읽는 중 표지) */
  userId: string;
  displayName: string;
  photoUrl: string | null;
  /** 연간 독서 목표 — 목표 달성 스토리용. 정한 적 없으면 null */
  readingGoal: ReadingGoal | null;
  /** 최신 AI 분석의 주제 태그 — 분석 전이면 빈 배열 */
  topics: string[];
  year: number;
  yearBooks: number;
  totalBooks: number;
  /** 최근 완독 표지 — 최신순, 최대 COVER_LIMIT 장 */
  covers: string[];
  /** 서로 다른 공개 완독 책, 최신순 — 스토리 책장용 */
  books: PublicShelfBook[];
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
  const latest = history[0];

  return {
    userId: profile.id,
    displayName: toDisplayName(profile),
    photoUrl: profile.photo_url,
    readingGoal: profile.reading_goal ?? null,
    topics: latest?.liked_topics ?? [],
    // 요약이 올해 권수를 센 해와 같은 해 — 둘 다 서울 기준 오늘이다
    year: getCurrentLibraryYear(),
    yearBooks: summary.yearBooks,
    totalBooks: summary.totalBooks,
    covers: summary.covers,
    books: summary.books,
    card: toReaderCard({
      latestType: latest?.personality_type,
      categories: summary.categories,
      yearBooks: summary.yearBooks,
      totalBooks: summary.totalBooks,
    }),
  };
};
