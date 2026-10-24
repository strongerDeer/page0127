import { SHELF_LEVELS, WIDE_VIEW_LEVELS } from './badges';

import type { Badge, BadgeId } from './badges';

/** 표지 제목은 실제 텍스트다. 비밀 배지는 ID·이름·조건을 표지에 넘기지 않는다. */
const COVER_TITLES: Record<BadgeId, readonly string[]> = {
  shelf: ['책장'],
  'wide-view': ['넓은', '시야'],
  'one-sitting': ['단', '숨에'],
  brick: ['벽돌책', '완독'],
  'author-fan': ['작가', '덕질'],
  finally: ['마침내', '완독'],
  reread: ['다시', '펼친', '책'],
  'life-book': ['인생책', '발견'],
  critic: ['한 줄', '평론가'],
  'goal-kept': ['약속', '지킴'],
  'know-yourself': ['취향', '발견'],
  'day-0127': ['01', '27'],
  'new-year': ['새해', '첫 책'],
  'double-finish': ['하루', '두 권'],
  honest: ['솔직한', '독자'],
  'thin-but-deep': ['얇지만', '깊은'],
  'new-release': ['신간', '발견'],
  'book-about-books': ['책에', '관한 책'],
  'worn-out': ['세 번째', '만남'],
};

export const isSecretBadge = (badge: Badge) =>
  badge.kind === 'hidden' && !badge.earned;

export const badgeLevelValue = (badge: Badge): number | null => {
  if (badge.kind !== 'growth') return null;
  const levels = badge.id === 'shelf' ? SHELF_LEVELS : WIDE_VIEW_LEVELS;
  return levels[Math.min(levels.length - 1, Math.max(0, badge.level - 1))]!;
};

export const badgePresentation = (badge: Badge) => {
  if (isSecretBadge(badge)) {
    return {
      title: '비밀의 책',
      cover: 'unwritten' as const,
      lines: ['아직', '쓰이지 않은', '이야기'],
      levelValue: null,
    };
  }
  return {
    title: badge.name,
    cover: badge.id,
    lines: COVER_TITLES[badge.id],
    levelValue: badgeLevelValue(badge),
  };
};

export const badgeProgressLabel = (badge: Badge) => {
  if (isSecretBadge(badge) || !badge.progress) return null;
  const unit =
    badge.id === 'wide-view' ? '분야' : badge.id === 'critic' ? '개' : '권';
  return `${badge.progress.current} / ${badge.progress.target}${unit}`;
};

export const badgeProgressPercent = (badge: Badge) => {
  if (!badge.progress || badge.progress.target <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, (badge.progress.current / badge.progress.target) * 100)
  );
};
