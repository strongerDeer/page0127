import { SHELF_LEVELS, WIDE_VIEW_LEVELS } from './badges';

import type { Badge } from './badges';

/** 비밀 배지의 실제 이름과 아트 ID는 렌더러에 넘기지 않는다. */
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
      levelValue: null,
    };
  }
  return {
    title: badge.name,
    cover: badge.id,
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
