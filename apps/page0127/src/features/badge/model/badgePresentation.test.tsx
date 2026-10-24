import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { BadgeCollection } from '../ui/BadgeCollection';
import { BadgeMedal } from '../ui/BadgeMedal';
import {
  badgeLevelValue,
  badgePresentation,
  badgeProgressLabel,
  badgeProgressPercent,
} from './badgePresentation';
import { computeBadges, SHELF_LEVELS, WIDE_VIEW_LEVELS } from './badges';

const input = { books: [], readingGoal: null, firstTasteAnalysisAt: null };
const badges = computeBadges(input);

describe('배지 표지와 공개 범위', () => {
  it('비밀 배지는 이름·ID·조건·진행도를 공통 표지로 감춘다', () => {
    for (const badge of badges.filter((b) => b.kind === 'hidden')) {
      const presentation = badgePresentation(badge);
      expect(presentation.title).toBe('비밀의 책');
      expect(presentation.cover).toBe('unwritten');
      expect(
        badgeProgressLabel({ ...badge, progress: { current: 1, target: 2 } })
      ).toBeNull();
      const html = renderToStaticMarkup(<BadgeMedal badge={badge} size={84} />);
      expect(html).not.toContain(badge.name);
      expect(html).not.toContain(`data-cover="${badge.id}"`);
      expect(html).toContain('data-cover="unwritten"');
    }
  });

  it('받은 19종은 각자의 표지와 제목을 사용한다', () => {
    for (const badge of badges) {
      const earned = { ...badge, earned: true, level: 1 };
      expect(badgePresentation(earned).cover).toBe(badge.id);
      expect(badgePresentation(earned).title).toContain(badge.name);
      expect(
        renderToStaticMarkup(<BadgeMedal badge={earned} size={84} />)
      ).toContain(`data-cover="${badge.id}"`);
    }
  });

  it('성장 8단계의 기준 숫자와 진행 단위를 구분한다', () => {
    for (const [id, levels] of [
      ['shelf', SHELF_LEVELS],
      ['wide-view', WIDE_VIEW_LEVELS],
    ] as const) {
      const badge = badges.find((b) => b.id === id)!;
      levels.forEach((value, index) =>
        expect(badgeLevelValue({ ...badge, level: index + 1 })).toBe(value)
      );
      expect(badgeLevelValue({ ...badge, level: 0 })).toBe(levels[0]);
    }
    expect(
      badgeProgressLabel({
        ...badges[0]!,
        progress: { current: 156, target: 200 },
      })
    ).toBe('156 / 200권');
    expect(
      badgeProgressLabel({ ...badges[1]!, progress: { current: 8, target: 9 } })
    ).toBe('8 / 9분야');
    expect(
      badgeProgressPercent({
        ...badges[0]!,
        progress: { current: 2, target: 0 },
      })
    ).toBe(0);
    expect(
      badgeProgressPercent({
        ...badges[0]!,
        progress: { current: 5, target: 2 },
      })
    ).toBe(100);
  });

  it('비로그인 방문자에게는 미획득 책과 빈 비밀 칸을 보여주지 않는다', () => {
    const visitor = renderToStaticMarkup(
      <BadgeCollection {...input} isOwner={false} />
    );
    expect(visitor).not.toContain('data-badge-book');
    expect(visitor).not.toContain('비밀의 책');
    const owner = renderToStaticMarkup(<BadgeCollection {...input} isOwner />);
    expect(owner.match(/data-badge-book="true"/g)).toHaveLength(19);
    expect(owner.match(/data-cover="unwritten"/g)).toHaveLength(8);
    const earnedVisitor = renderToStaticMarkup(
      <BadgeCollection
        {...input}
        firstTasteAnalysisAt='2026-10-24T00:00:00Z'
        isOwner={false}
      />
    );
    expect(earnedVisitor).toContain('취향 발견');
    expect(earnedVisitor).not.toContain('비밀의 책');
    expect(earnedVisitor.match(/data-badge-book="true"/g)).toHaveLength(1);
  });
});
