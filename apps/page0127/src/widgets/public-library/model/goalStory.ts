import { OG_COLORS } from '@/shared/lib/og/theme';

import { getCompletedYear } from '@/entities/book';

import { toStoryAddress } from './storyCard';
import { toStoryShelf } from './storyShelf';

import type { ReaderShareData } from '../api/getReaderShareData';
import type { PublicShelfBook } from '@/entities/book/api/getPublicShelfSummary';
import type { StoryCardProps } from '@/shared/lib/og/StoryCard';

/** 책장 대신 표지를 일렬로 세울 때의 장 수 — 서재 스토리(getPublicShelfSummary 의 COVER_LIMIT)와 같다 */
const ROW_COVER_LIMIT = 5;

/**
 * 목표를 채운 날 ('M월 D일') — 그 해에 완독한 책을 날짜순으로 세워 목표 권수째 책의 완독일.
 *
 * 연도만 아는 책이 그 해에 하나라도 있으면 null 이다. 그 책이 언제 들어왔는지 몰라
 * 목표 권수째가 어느 책인지 정할 수 없다 — 틀린 날짜를 적느니 날짜를 빼는 게 낫다.
 * books 는 서로 다른 책(재독은 가장 최근 회독)이라 서재 화면의 권수와 같은 집합이다.
 */
export const toGoalReachedDate = (
  books: PublicShelfBook[],
  year: number,
  target: number
): string | null => {
  const yearBooks = books.filter((book) => getCompletedYear(book) === year);
  if (yearBooks.some((book) => !book.completed_date)) return null;

  // 'YYYY-MM-DD' 는 문자열 순서가 곧 날짜 순서다
  const dates = yearBooks
    .map((book) => book.completed_date as string)
    .sort((a, b) => a.localeCompare(b));
  const reached = dates[target - 1];
  if (!reached) return null;

  const [, month, day] = reached.split('-').map(Number);
  return `${month}월 ${day}일`;
};

/**
 * 서재 데이터 → 목표 달성 스토리 칸. 올해 목표를 아직 못 채웠으면 null(그릴 것이 없다).
 *
 * 서재 스토리(toStoryCardProps)와 같은 틀에 주인공만 바꾼다:
 * 위 파란 면은 성향 대신 "목표 N권, 다 읽었어요!", 아래 흰 면은 올해 읽은 책장과 올해 권수.
 * 숫자는 서재 화면(올해 요약)과 같은 공개 완독 책으로 센다 — 이미지와 화면이 다른 숫자를 말하면 안 된다.
 * 올해만 그린다. 목표는 한 해 것만 저장돼서(profiles.reading_goal) 지난해 목표는 새 목표에 덮인다.
 */
export const toGoalStoryProps = (
  data: ReaderShareData,
  username: string,
  siteUrl: string | undefined
): StoryCardProps | null => {
  const goal = data.readingGoal;
  if (!goal || goal.year !== data.year || goal.target <= 0) return null;
  if (data.yearBooks < goal.target) return null;

  const reachedOn = toGoalReachedDate(data.books, data.year, goal.target);

  return {
    photoUrl: data.photoUrl,
    name: data.displayName,
    address: toStoryAddress(siteUrl, username),
    label: `${data.year} 독서 목표 달성`,
    // 줄바꿈 자리는 정해 둔다(balanceLines) — "목표 N권," 이 한 줄로 서야 숫자가 먼저 읽힌다
    headline: `목표 ${goal.target}권,\n다 읽었어요!`,
    // 라벨 칩의 점 — brand/accent. 서재 스토리의 성향 색 자리에 "해냈다"를 놓는다
    accent: OG_COLORS.mint,
    topics: [],
    shelf: toStoryShelf(data.books, { year: data.year, onlyThisYear: true }),
    // 책이 적어 책장 대신 표지를 세울 때도 올해 책이어야 숫자와 맞는다
    covers: data.books
      .filter((book) => getCompletedYear(book) === data.year)
      .map((book) => book.cover_image)
      .filter((src): src is string => Boolean(src))
      .slice(0, ROW_COVER_LIMIT),
    count: { label: `${data.year}년에 완독한 책`, value: data.yearBooks },
    note: reachedOn
      ? `목표 ${goal.target}권 · ${reachedOn} 달성`
      : `목표 ${goal.target}권 달성`,
  };
};
