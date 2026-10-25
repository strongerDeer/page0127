import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import type { Book } from '@/entities/book';
import type { ReadingGoal } from '@/entities/profile/types';

/**
 * 뱃지/업적 — **원본 활동 기록에서 계산한다.**
 *
 * 책·분석·일별 방문 기록에서 계산하므로 user_badges 테이블을 두지 않았다.
 * - 별도 배지 저장 테이블·트리거 동기화가 필요 없다
 * - 기존 사용자도 소급해서 바로 받는다
 * - "어떤 책으로 받았는지"를 그대로 보여 줄 수 있다 (획득일 = 그 책의 완독일)
 * 대신 책을 지우면 그 책으로 받은 뱃지도 사라진다 — 기록이 곧 근거라 받아들였다.
 *
 * 입력은 화면이 이미 가진 공개 책 목록이다. 통계와 같은 집합이라 주인과 방문자가
 * 같은 뱃지를 본다 (보관한 책이 뱃지로 새어 나가지 않는다).
 */

export type BadgeKind = 'growth' | 'category' | 'story' | 'hidden';

export type BadgeId =
  | 'classics'
  | 'compatibility'
  | 'regular'
  | 'fiction'
  | 'humanities'
  | 'essays'
  | 'business'
  | 'self-growth'
  | 'science'
  | 'arts'
  | 'history'
  | 'technology'
  | 'shelf'
  | 'wide-view'
  | 'one-sitting'
  | 'brick'
  | 'author-fan'
  | 'finally'
  | 'reread'
  | 'life-book'
  | 'critic'
  | 'goal-kept'
  | 'know-yourself'
  | 'day-0127'
  | 'new-year'
  | 'double-finish'
  | 'honest'
  | 'thin-but-deep'
  | 'new-release'
  | 'book-about-books'
  | 'worn-out';

export type BadgeStage = {
  value: number;
  earnedAt: string | null;
  book: Pick<Book, 'id' | 'title'> | null;
};

export type BadgeActivity = {
  firstTasteAnalysisAt: string | null;
  firstCompatibilityAt: string | null;
  /** 누적 방문일은 본인에게만 공개한다. 방문자는 달성 단계만 받는다. */
  visitCount: number | null;
  visitMilestones: { target: number; at: string }[];
};

export type Badge = {
  id: BadgeId;
  kind: BadgeKind;
  name: string;
  /** 받는 조건. 히든은 받기 전까지 화면에 내보내지 않는다 */
  description: string;
  earned: boolean;
  /** 받은 날 'YYYY-MM-DD' (또는 ISO 시각) */
  earnedAt: string | null;
  /** 조건을 채운 책 — 책이 아닌 근거(취향 분석)면 null */
  book: Pick<Book, 'id' | 'title'> | null;
  /** 성장 뱃지 단계. 1부터, 아직 못 받았으면 0 */
  level: number;
  stages?: BadgeStage[];
  /** 다음 단계(또는 첫 획득)까지 — 다 채웠으면 null */
  progress: { current: number; target: number } | null;
};

export type BadgeInput = {
  /** 공개 책 목록 (재독 행 포함, 합치기 전) */
  books: Book[];
  readingGoal: ReadingGoal | null;
  /** 첫 취향 분석 시각 — 분석한 적 없으면 null */
  firstTasteAnalysisAt: string | null;
  activity?: BadgeActivity;
};

export const SHELF_LEVELS = [
  1, 5, 10, 25, 50, 100, 200, 300, 500, 1000,
] as const;
export const WIDE_VIEW_LEVELS = [2, 3, 5, 7, 9] as const;
export const CATEGORY_LEVELS = [3, 10, 30, 50, 100] as const;
export const CLASSIC_LEVELS = [1, 5, 10, 25, 50] as const;
export const VISIT_LEVELS = [7, 30, 100] as const;

export const CATEGORY_BADGES = [
  { id: 'fiction', category: '소설/시/희곡', name: '이야기 수집가' },
  { id: 'humanities', category: '인문학', name: '사유의 깊이' },
  { id: 'essays', category: '에세이', name: '타인의 마음' },
  { id: 'business', category: '경제/경영', name: '세상을 읽는 눈' },
  { id: 'self-growth', category: '자기계발', name: '어제보다 한 걸음' },
  { id: 'science', category: '과학', name: '호기심의 궤도' },
  { id: 'arts', category: '예술/대중문화', name: '감각의 발견' },
  { id: 'history', category: '역사', name: '시간 여행자' },
  { id: 'technology', category: '컴퓨터/모바일', name: '새로운 언어' },
] as const;

export const badgeLevels = (id: BadgeId): readonly number[] => {
  if (id === 'shelf') return SHELF_LEVELS;
  if (id === 'wide-view') return WIDE_VIEW_LEVELS;
  if (id === 'classics') return CLASSIC_LEVELS;
  if (id === 'regular') return VISIT_LEVELS;
  if (CATEGORY_BADGES.some((item) => item.id === id)) return CATEGORY_LEVELS;
  return [];
};

export const badgeUnit = (id: BadgeId) =>
  id === 'wide-view'
    ? '분야'
    : id === 'regular'
      ? '일'
      : id === 'critic'
        ? '개'
        : '권';

/** 고전은 도서 공급자의 분류 경로로만 판정한다. 제목·출간연도로 추측하지 않는다. */
export const isClassicCategory = (category: string | null) =>
  (category ?? '')
    .split('>')
    .some((part) =>
      /^(?:(?:한국|동양|서양|세계)?고전(?:문학|소설)?|classics)$/i.test(
        part.trim()
      )
    );

const BRICK_PAGES = 500;
const THIN_PAGES = 150;
const AUTHOR_FAN_COUNT = 3;
const CRITIC_COUNT = 10;
const FINALLY_DAYS = 365;
const NEW_RELEASE_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 완독 기록을 읽은 순서(오래된 것부터)로 — 동률은 등록 순 */
const byReadOrder = (a: Book, b: Book) =>
  (a.completed_date ?? a.created_at).localeCompare(
    b.completed_date ?? b.created_at
  ) || a.created_at.localeCompare(b.created_at);

/** 같은 책의 회독을 한 권으로 세기 위한 키 (dedupeReadings 와 같은 기준) */
const bookKey = (book: Book) =>
  book.isbn ? `isbn:${book.isbn}` : `id:${book.id}`;

const readAt = (book: Book) => book.completed_date ?? book.created_at;

const daysBetween = (from: string, to: string) =>
  (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS;

/**
 * "헤르만 헤세 (지은이), 전영애 (옮긴이)" → "헤르만 헤세"
 * 공급자마다 표기가 달라 첫 사람만, 괄호 역할 표기를 떼고 비교한다.
 */
export const normalizeAuthor = (author: string | null): string | null => {
  if (!author) return null;
  const first = author
    .split(/[,，]/)[0]
    ?.replace(/\(.*?\)/g, '')
    .trim();
  return first ? first.replace(/\s+/g, ' ') : null;
};

type Hit = { book: Book | null; at: string } | null;

const hitOf = (book: Book | undefined): Hit =>
  book ? { book, at: readAt(book) } : null;

/** n번째 서로 다른 책을 채운 완독 기록 (n 은 1부터) */
const nthDistinct = (completed: Book[], n: number): Hit => {
  const seen = new Set<string>();
  for (const book of completed) {
    const key = bookKey(book);
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size === n) return hitOf(book);
  }
  return null;
};

const countDistinct = (books: Book[]) => new Set(books.map(bookKey)).size;

/** 단계형 뱃지 계산 — 마지막으로 넘은 단계와 그 단계를 채운 기록 */
const levelOf = (
  current: number,
  levels: readonly number[],
  hitAt: (target: number) => Hit
) => {
  const level = levels.filter((target) => current >= target).length;
  const next = levels[level];
  return {
    level,
    hit: level > 0 ? hitAt(levels[level - 1]!) : null,
    progress: next === undefined ? null : { current, target: next },
    stages: levels.map((value) => {
      const hit = current >= value ? hitAt(value) : null;
      return {
        value,
        earnedAt: hit?.at ?? null,
        book: hit?.book ? { id: hit.book.id, title: hit.book.title } : null,
      };
    }),
  };
};

const badge = (
  base: Pick<Badge, 'id' | 'kind' | 'name' | 'description'>,
  hit: Hit,
  extra: Partial<Pick<Badge, 'level' | 'progress' | 'stages'>> = {}
): Badge => ({
  ...base,
  earned: hit !== null,
  earnedAt: hit?.at ?? null,
  book: hit?.book ? { id: hit.book.id, title: hit.book.title } : null,
  level: extra.level ?? (hit ? 1 : 0),
  progress: extra.progress ?? null,
  stages: extra.stages,
});

export const computeBadges = ({
  books,
  readingGoal,
  firstTasteAnalysisAt,
  activity,
}: BadgeInput): Badge[] => {
  const completed = books
    .filter((book) => book.status === 'completed')
    .sort(byReadOrder);
  const first = (predicate: (book: Book) => boolean) =>
    hitOf(completed.find(predicate));

  // 서재와 동일하게 저장 회독 수와 실제 완독 행 수 중 큰 값을 사용한다.
  // 읽는 중인 재독, 중복 전달된 같은 행, ISBN 없는 다른 책은 합산하지 않는다.
  const readingHit = (target: number): Hit => {
    const groups = new Map<string, Set<string>>();
    for (const book of completed) {
      const key = `${book.user_id}:${bookKey(book)}`;
      const ids = groups.get(key) ?? new Set<string>();
      ids.add(book.id);
      groups.set(key, ids);
      if (Math.max(book.read_count, ids.size) >= target) return hitOf(book);
    }
    return null;
  };

  // ── 성장 ────────────────────────────────────────────
  const shelf = levelOf(countDistinct(completed), SHELF_LEVELS, (target) =>
    nthDistinct(completed, target)
  );

  // 분야는 독서 균형과 같은 9개 분류 — 분류 불명(기타)은 세지 않는다
  const categoryHits = new Map<string, Book>();
  completed.forEach((book) => {
    const category = mapToMainCategory(book.category);
    if (category !== '기타' && !categoryHits.has(category)) {
      categoryHits.set(category, book);
    }
  });
  const categoryOrder = [...categoryHits.values()];
  const wideView = levelOf(categoryOrder.length, WIDE_VIEW_LEVELS, (target) =>
    hitOf(categoryOrder[target - 1])
  );

  const classics = completed.filter((book) => isClassicCategory(book.category));
  const classicLevel = levelOf(
    countDistinct(classics),
    CLASSIC_LEVELS,
    (target) => nthDistinct(classics, target)
  );
  const visits = activity?.visitMilestones ?? [];
  const visitCount =
    activity?.visitCount ?? Math.max(0, ...visits.map((item) => item.target));
  const regular = levelOf(visitCount, VISIT_LEVELS, (target) => {
    const milestone = visits.find((item) => item.target === target);
    return milestone ? { book: null, at: milestone.at } : null;
  });

  // ── 이야기 ──────────────────────────────────────────
  const authorCounts = new Map<string, Set<string>>();
  const authorFan = (() => {
    for (const book of completed) {
      const author = normalizeAuthor(book.author);
      if (!author) continue;
      const keys = authorCounts.get(author) ?? new Set<string>();
      keys.add(bookKey(book));
      authorCounts.set(author, keys);
      if (keys.size === AUTHOR_FAN_COUNT) return hitOf(book);
    }
    return null;
  })();
  const topAuthorCount = Math.max(
    0,
    ...[...authorCounts.values()].map((keys) => keys.size)
  );

  const reviewed = completed.filter((book) => book.one_line_review?.trim());

  // 목표는 한 해 것만 저장된다 — 그 해 완독이 목표 권수를 채운 순간
  const goalHit = (() => {
    if (!readingGoal || readingGoal.target <= 0) return null;
    const yearBooks = completed.filter((book) =>
      book.completed_date?.startsWith(`${readingGoal.year}-`)
    );
    return nthDistinct(yearBooks, readingGoal.target);
  })();

  // ── 히든 ────────────────────────────────────────────
  const doubleFinish = (() => {
    const byDate = new Map<string, Set<string>>();
    for (const book of completed) {
      if (!book.completed_date) continue;
      const keys = byDate.get(book.completed_date) ?? new Set<string>();
      keys.add(bookKey(book));
      byDate.set(book.completed_date, keys);
      if (keys.size === 2) return hitOf(book);
    }
    return null;
  })();

  return [
    badge(
      {
        id: 'shelf',
        kind: 'growth',
        name: '쌓이는 이야기',
        description: `서로 다른 책 ${SHELF_LEVELS.join('·')}권 완독`,
      },
      shelf.hit,
      { level: shelf.level, progress: shelf.progress, stages: shelf.stages }
    ),
    badge(
      {
        id: 'wide-view',
        kind: 'growth',
        name: '넓은 시야',
        description: `${WIDE_VIEW_LEVELS.join('·')}개 분야 완독`,
      },
      wideView.hit,
      {
        level: wideView.level,
        progress: wideView.progress,
        stages: wideView.stages,
      }
    ),
    badge(
      {
        id: 'classics',
        kind: 'growth',
        name: '시간을 건너온 책',
        description: `고전 분류의 서로 다른 책 ${CLASSIC_LEVELS.join('·')}권 완독`,
      },
      classicLevel.hit,
      {
        level: classicLevel.level,
        progress: classicLevel.progress,
        stages: classicLevel.stages,
      }
    ),
    badge(
      {
        id: 'regular',
        kind: 'growth',
        name: '서재 단골',
        description: `누적 ${VISIT_LEVELS.join('·')}일 방문 · 한국 시간 기준 하루 한 번, 연속 방문이 아니어도 괜찮아요`,
      },
      regular.hit,
      {
        level: regular.level,
        progress: activity?.visitCount == null ? null : regular.progress,
        stages: regular.stages,
      }
    ),
    ...CATEGORY_BADGES.map(({ id, category, name }) => {
      const categoryBooks = completed.filter(
        (book) => mapToMainCategory(book.category) === category
      );
      const result = levelOf(
        countDistinct(categoryBooks),
        CATEGORY_LEVELS,
        (target) => nthDistinct(categoryBooks, target)
      );
      return badge(
        {
          id,
          kind: 'category',
          name,
          description: `${category} 분야의 서로 다른 책 ${CATEGORY_LEVELS.join('·')}권 완독`,
        },
        result.hit,
        {
          level: result.level,
          progress: result.progress,
          stages: result.stages,
        }
      );
    }),
    badge(
      {
        id: 'compatibility',
        kind: 'story',
        name: '취향의 교집합',
        description:
          '다른 독자와 첫 독서 케미 분석 완료 · 분석에 참여한 두 독자가 함께 받아요',
      },
      activity?.firstCompatibilityAt
        ? { book: null, at: activity.firstCompatibilityAt }
        : null
    ),
    badge(
      {
        id: 'one-sitting',
        kind: 'story',
        name: '단숨에',
        description: '읽기 시작한 날 바로 완독',
      },
      first(
        (book) =>
          book.start_date !== null && book.start_date === book.completed_date
      )
    ),
    badge(
      {
        id: 'brick',
        kind: 'story',
        name: '벽돌책 완독',
        description: `${BRICK_PAGES}쪽 넘는 책 완독`,
      },
      first((book) => (book.page_count ?? 0) > BRICK_PAGES)
    ),
    badge(
      {
        id: 'author-fan',
        kind: 'story',
        name: '작가 덕질',
        description: `같은 작가의 책 ${AUTHOR_FAN_COUNT}권 완독`,
      },
      authorFan,
      {
        progress: authorFan
          ? null
          : { current: topAuthorCount, target: AUTHOR_FAN_COUNT },
      }
    ),
    badge(
      {
        id: 'finally',
        kind: 'story',
        name: '마침내 완독',
        description: '등록하고 1년이 지나서 완독',
      },
      first(
        (book) =>
          book.completed_date !== null &&
          daysBetween(book.created_at, book.completed_date) >= FINALLY_DAYS
      )
    ),
    badge(
      {
        id: 'reread',
        kind: 'story',
        name: '다시 펼친 책',
        description: '같은 책을 두 번 완독',
      },
      readingHit(2)
    ),
    badge(
      {
        id: 'life-book',
        kind: 'story',
        name: '인생책 발견',
        description: '인생책 지정',
      },
      first((book) => book.is_life_book)
    ),
    badge(
      {
        id: 'critic',
        kind: 'story',
        name: '한 줄 평론가',
        description: `한줄평 ${CRITIC_COUNT}개`,
      },
      hitOf(reviewed[CRITIC_COUNT - 1]),
      {
        progress:
          reviewed.length >= CRITIC_COUNT
            ? null
            : { current: reviewed.length, target: CRITIC_COUNT },
      }
    ),
    badge(
      {
        id: 'goal-kept',
        kind: 'story',
        name: '약속 지킴',
        description: '한 해 독서 목표 달성',
      },
      goalHit
    ),
    badge(
      {
        id: 'know-yourself',
        kind: 'story',
        name: '취향 발견',
        description: '첫 AI 취향 분석',
      },
      (activity?.firstTasteAnalysisAt ?? firstTasteAnalysisAt)
        ? {
            book: null,
            at: (activity?.firstTasteAnalysisAt ?? firstTasteAnalysisAt)!,
          }
        : null
    ),
    badge(
      {
        id: 'day-0127',
        kind: 'hidden',
        name: '0127의 날',
        description: '1월 27일에 완독 — page0127의 날',
      },
      first((book) => book.completed_date?.endsWith('-01-27') ?? false)
    ),
    badge(
      {
        id: 'new-year',
        kind: 'hidden',
        name: '새해 첫 책',
        description: '1월 1일에 완독',
      },
      first((book) => book.completed_date?.endsWith('-01-01') ?? false)
    ),
    badge(
      {
        id: 'double-finish',
        kind: 'hidden',
        name: '하루 두 권',
        description: '같은 날 두 권 완독',
      },
      doubleFinish
    ),
    badge(
      {
        id: 'honest',
        kind: 'hidden',
        name: '솔직한 독자',
        description: '처음으로 별 1점',
      },
      first((book) => book.rating === 1)
    ),
    badge(
      {
        id: 'thin-but-deep',
        kind: 'hidden',
        name: '얇지만 깊은',
        description: `${THIN_PAGES}쪽 이하 책에 별 5점`,
      },
      first(
        (book) =>
          book.rating === 5 &&
          book.page_count !== null &&
          book.page_count > 0 &&
          book.page_count <= THIN_PAGES
      )
    ),
    badge(
      {
        id: 'new-release',
        kind: 'hidden',
        name: '신간 발견',
        description: '출간 한 달 안에 완독',
      },
      first((book) => {
        if (!book.pub_date || !book.completed_date) return false;
        const days = daysBetween(book.pub_date, book.completed_date);
        return days >= 0 && days <= NEW_RELEASE_DAYS;
      })
    ),
    badge(
      {
        id: 'book-about-books',
        kind: 'hidden',
        name: '책에 관한 책',
        description: '제목에 "책"이 들어간 책 완독',
      },
      first((book) => book.title.includes('책'))
    ),
    badge(
      {
        id: 'worn-out',
        kind: 'hidden',
        name: '세 번째 만남',
        description: '같은 책을 세 번 완독',
      },
      readingHit(3)
    ),
  ];
};
