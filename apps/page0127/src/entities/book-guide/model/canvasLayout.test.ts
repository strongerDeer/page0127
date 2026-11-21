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
  const sections = bookGuideSectionsSchema.parse(daeonsil);
  const first = sections[0] as PeopleSection;
  const layout = buildCanvasLayout(first);

  it('좌표가 적힌 상자는 그 자리에', () => {
    const youngdu = layout.nodes.find((n) => n.person.id === 'youngdu');
    expect(youngdu?.rect).toEqual({ x: 35, y: 0, w: 262, h: 112 });
    expect(youngdu?.tone).toBe('primary');
  });

  it('좌표 없는 구성원은 회색 판 안에 격자로 채운다', () => {
    const yeonhee = layout.nodes.find((n) => n.person.id === 'yeonhee');
    const somok = layout.nodes.find((n) => n.person.id === 'somok');
    expect(yeonhee?.rect.x).toBe(PANEL_PAD);
    expect(yeonhee?.rect.y).toBe(190 + PANEL_HEAD);
    expect(somok!.rect.y - yeonhee!.rect.y).toBe(MEMBER_HEIGHT + 8);
  });

  it('선 끝이 묶음 id 면 회색 판을 가리킨다', () => {
    const line = layout.lines.find((l) => l.label === '동료');
    // 강영두 아래(112) → 사무소 판 위(190)
    expect(line?.points.map(([, y]) => y)).toEqual([112, 190]);
  });

  it('높이를 안 적으면 가장 아래 상자에 맞춘다', () => {
    expect(layout.height).toBeGreaterThan(400);
  });
});

describe('캔버스 모드 검사', () => {
  it('판도 좌표도 없는 구성원은 저장 전에 막는다', () => {
    const broken = structuredClone(daeonsil) as unknown as {
      groups: { box?: unknown }[];
    }[];
    delete broken[0].groups[1].box;
    const result = bookGuideSectionsSchema.safeParse(broken);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('자리가 없어요');
  });
});
