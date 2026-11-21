import { describe, expect, it } from 'vitest';

import daeonsil from './__fixtures__/daeonsil.json';
import { bookGuideSectionsSchema } from './bookGuideSchema';
import {
  buildCanvasLayout,
  MEMBER_HEIGHT,
  PANEL_HEAD,
  PANEL_PAD,
  routeLine,
} from './canvasLayout';

import type { PeopleSection } from './bookGuideSchema';

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

describe('routeLine — 두 상자를 잇는 선 경로', () => {
  it('가로로 겹치면 세로 직선(위 상자 아래 → 아래 상자 위)', () => {
    const r = routeLine(box(0, 0, 200, 100), box(50, 200, 200, 60));
    expect(r.points).toEqual([
      [100, 100],
      [100, 200],
    ]);
    expect(r.badge).toEqual([100, 150]);
  });

  it('세로로 겹치면 가로 직선(왼쪽 오른쪽 면끼리)', () => {
    const r = routeLine(box(0, 0, 100, 100), box(300, 20, 100, 100));
    expect(r.points).toEqual([
      [100, 50],
      [300, 50],
    ]);
  });

  it('둘 다 아니면 ㄱ자 — 세로로 나가 상대 높이에서 꺾는다', () => {
    const r = routeLine(box(0, 200, 100, 100), box(300, 0, 100, 40));
    expect(r.points).toEqual([
      [50, 200],
      [50, 20],
      [300, 20],
    ]);
    expect(r.badge).toEqual([175, 20]);
  });
});

describe('buildCanvasLayout', () => {
  const base: PeopleSection = {
    type: 'people',
    title: '테스트',
    leads: [
      { id: 'a', name: '가', at: { x: 40, y: 0, w: 300, h: 136 } },
      { id: 'b', name: '나' },
    ],
    groups: [
      {
        id: 'office',
        name: '사무소',
        box: { x: 0, y: 200, w: 200 },
        members: [
          { id: 'c', name: '다' },
          { id: 'd', name: '라' },
        ],
      },
    ],
    links: [{ from: 'a', to: 'office', label: '동료', kind: 'work' }],
    canvas: {},
  };
  const layout = buildCanvasLayout(base);

  it('좌표가 적힌 상자는 그 자리에, 첫 주인공은 파랑·둘째는 초록', () => {
    const a = layout.nodes.find((n) => n.person.id === 'a');
    expect(a?.rect).toEqual({ x: 40, y: 0, w: 300, h: 136 });
    expect(a?.tone).toBe('primary');
    expect(layout.nodes.find((n) => n.person.id === 'b')?.tone).toBe('green');
  });

  it('좌표 없는 구성원은 회색 판 안에 격자로(흰 카드)', () => {
    const c = layout.nodes.find((n) => n.person.id === 'c')!;
    const d = layout.nodes.find((n) => n.person.id === 'd')!;
    expect(c.rect.x).toBe(PANEL_PAD);
    expect(c.rect.y).toBe(200 + PANEL_HEAD);
    expect(d.rect.y - c.rect.y).toBe(MEMBER_HEIGHT + 12);
    expect(c.tone).toBe('white');
  });

  it('선 끝이 묶음 id 면 회색 판을 가리킨다', () => {
    const line = layout.lines.find((l) => l.label === '동료');
    // 주인공 아래(136) → 판 위(200)
    expect(line?.lines[0].map(([, y]) => y)).toEqual([136, 200]);
  });

  it('피그마에서 가져온 선 모양(route)이 있으면 그대로 쓴다', () => {
    const withRoute = buildCanvasLayout({
      ...base,
      links: [
        {
          ...base.links[0],
          route: {
            lines: [
              [
                [10, 10],
                [10, 50],
                [90, 50],
              ],
            ],
            badge: [50, 50],
          },
        },
      ],
    });
    expect(withRoute.lines[0].lines[0]).toHaveLength(3);
    expect(withRoute.lines[0].badge).toEqual([50, 50]);
  });
});

describe('캔버스 모드 검사', () => {
  it('판도 좌표도 없는 구성원은 저장 전에 막는다', () => {
    const broken = structuredClone(daeonsil) as unknown as {
      groups: { box?: unknown; members: { at?: unknown }[] }[];
    }[];
    delete broken[0].groups[0].box;
    delete broken[0].groups[0].members[0].at;
    const result = bookGuideSectionsSchema.safeParse(broken);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('자리가 없어요');
  });
});
