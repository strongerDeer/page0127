import { badgeLevels, badgeUnit } from './badges';

import type { Badge } from './badges';

const HIDDEN_HINTS: Partial<Record<Badge['id'], string>> = {
  'day-0127': '0127',
  'new-year': '첫 달력',
  'double-finish': '하루에 두 번의 마침표',
  honest: '별 하나의 용기',
  'thin-but-deep': '얇은 책, 깊은 여운',
  'new-release': '아직 잉크가 마르기 전에',
  'book-about-books': '책 속의 책',
  'worn-out': '익숙한 책과 세 번째 인사',
};

/** 비밀 배지의 실제 이름과 아트 ID는 렌더러에 넘기지 않는다. */
export const isSecretBadge = (badge: Badge) =>
  badge.kind === 'hidden' && !badge.earned;

export const badgeLevelValue = (badge: Badge): number | null => {
  const levels = badgeLevels(badge.id);
  if (!levels.length) return null;
  return levels[Math.min(levels.length - 1, Math.max(0, badge.level - 1))]!;
};

export const badgePresentation = (badge: Badge) => {
  if (isSecretBadge(badge)) {
    return {
      title: '비밀의 책',
      cover: 'unwritten' as const,
      levelValue: null,
      hint: HIDDEN_HINTS[badge.id] ?? null,
    };
  }
  return {
    title:
      badgeLevels(badge.id).length > 0
        ? `${badge.name} · ${badgeLevelValue(badge)}${badgeUnit(badge.id)}`
        : badge.name,
    cover: badge.id,
    levelValue: badgeLevelValue(badge),
    hint: null,
  };
};

export const badgeProgressLabel = (badge: Badge) => {
  if (isSecretBadge(badge) || !badge.progress) return null;
  const unit = badgeUnit(badge.id);
  return `${badge.progress.current} / ${badge.progress.target}${unit}`;
};

export const badgeProgressPercent = (badge: Badge) => {
  if (!badge.progress || badge.progress.target <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, (badge.progress.current / badge.progress.target) * 100)
  );
};

/** 같은 표지를 유지하면서 단계에 따라 숫자·테두리·책등 색을 바꾼다. */
export const badgeLevelColor = (id: Badge['id'], level: number) => {
  const count = badgeLevels(id).length;
  if (!count) return null;
  const colors = [
    { paper: '#f1ead8', ink: '#51452f', edge: '#b8a47d' },
    { paper: '#e1edda', ink: '#435d35', edge: '#8da77b' },
    { paper: '#ccebdd', ink: '#1e584b', edge: '#569583' },
    { paper: '#b8e2de', ink: '#205c61', edge: '#5f9d9b' },
    { paper: '#cee5fa', ink: '#1c4f7d', edge: '#629bcb' },
    { paper: '#a9cff1', ink: '#194e7b', edge: '#538bb9' },
    { paper: '#6da5df', ink: '#17365b', edge: '#3a75b5' },
    { paper: '#276ac2', ink: '#ffffff', edge: '#184f9d' },
    { paper: '#234d88', ink: '#eff6ff', edge: '#163a6e' },
    { paper: '#14294e', ink: '#e0edff', edge: '#0c1b36' },
  ];
  const index =
    count <= 1
      ? 0
      : Math.round(
          ((Math.max(1, level) - 1) / (count - 1)) * (colors.length - 1)
        );
  return colors[Math.min(colors.length - 1, index)]!;
};
