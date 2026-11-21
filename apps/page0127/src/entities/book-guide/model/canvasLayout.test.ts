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
  it('위아래 가운데가 같으면 세로 직선', () => {
    const r = routeLine(box(0, 0, 200, 100), box(50, 200, 100, 60));
    expect(r.points).toEqual([
      [100, 100],
      [100, 200],
    ]);
    expect(r.badge).toEqual([100, 150]);
  });

  it('위아래 가운데가 어긋나면 틈 절반에서 비켜 양쪽 가운데로(ㄹ자)', () => {
    const r = routeLine(box(0, 0, 200, 100), box(50, 200, 200, 60));
    // 틈 100 의 절반(50)은 배지(32)+위아래 14 에 모자라 줄기를 60 으로 늘린다
    expect(r.points).toEqual([
      [100, 100],
      [100, 160],
      [150, 160],
      [150, 200],
    ]);
    // 배지는 나가는 줄기 가운데 — 위아래 선 길이가 같다(14·14). 갈래선 배지는 한 자리에 겹친다
    expect(r.badge).toEqual([100, 130]);
    const [, by] = r.badge;
    expect(by - 16 - 100).toBe(160 - (by + 16));
  });

  it('틈이 좁으면 꺾지 않고 겹친 구간에 곧은 선', () => {
    const r = routeLine(box(0, 0, 200, 100), box(50, 120, 200, 60));
    expect(r.points).toHaveLength(2);
  });

  it('옆으로 놓이면 가로선 — 가운데 높이가 어긋나면 틈 절반에서 비킨다', () => {
    const same = routeLine(box(0, 0, 100, 100), box(300, 0, 100, 100));
    expect(same.points).toEqual([
      [100, 50],
      [300, 50],
    ]);
    const off = routeLine(box(0, 0, 100, 100), box(300, 20, 100, 100));
    expect(off.points).toEqual([
      [100, 50],
      [200, 50],
      [200, 70],
      [300, 70],
    ]);
  });

  it('같은 상자에서 아래 두 상자로 가면 같은 높이에서 갈라진다(갈래선)', () => {
    const top = box(100, 0, 200, 100);
    const l = routeLine(top, box(0, 200, 150, 100));
    const r = routeLine(top, box(250, 200, 150, 100));
    expect(l.points.slice(0, 2)).toEqual(r.points.slice(0, 2));
    expect(l.badge).toEqual(r.badge);
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
    // 주인공 아래(136) → 판 위(200). 가운데가 어긋나 중간(168)에서 비킨다
    const ys = line?.lines[0].map(([, y]) => y);
    expect(ys?.[0]).toBe(136);
    expect(ys?.at(-1)).toBe(200);
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
