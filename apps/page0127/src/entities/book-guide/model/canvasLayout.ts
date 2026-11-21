import { GUIDE_CANVAS_WIDTH } from './bookGuideSchema';

import type {
  GuideLinkKind,
  GuidePerson,
  GuideRect,
  GuideTone,
  PeopleSection,
} from './bookGuideSchema';

/**
 * 캔버스 모드 배치 — JSON 에 적힌 좌표대로 상자를 놓고, 상자 사이 선의 경로를 계산한다.
 *
 * 왜 서버에서 계산하나:
 *   선 위치를 브라우저에서 재면(getBoundingClientRect) 클라이언트 JS 가 필요하다.
 *   상자 크기를 좌표로 이미 알고 있으니, 선 경로도 순수 함수로 미리 정할 수 있다.
 *   → HTML 에 선(SVG)까지 다 들어 있고, 같은 함수를 인스타 카드·편집기 미리보기가 같이 쓴다.
 *
 * 좌표가 빠진 것은 자동으로 채운다:
 *   - 중심 인물: 맨 위 왼쪽·오른쪽
 *   - 묶음 구성원: 그 묶음 회색 판(box) 안에 격자(cols 열)로
 */

export const LEAD_HEIGHT = 96;
export const MEMBER_HEIGHT = 56;
export const PANEL_PAD = 12;
/** 판 위쪽 묶음 이름 줄 높이 */
export const PANEL_HEAD = 40;
export const CELL_GAP = 8;

type Rect = Required<GuideRect>;

export type CanvasNode = {
  person: GuidePerson;
  rect: Rect;
  tone: GuideTone;
  isLead: boolean;
};

export type CanvasPanel = { key: string; name: string; rect: Rect };

export type CanvasLine = {
  key: string;
  kind: GuideLinkKind;
  label?: string;
  /** 꺾은선 꼭짓점 — SVG polyline points 로 바로 쓴다 */
  points: [number, number][];
  /** 관계 배지 가운데 자리 */
  badge: [number, number];
};

export type CanvasLayout = {
  width: number;
  height: number;
  panels: CanvasPanel[];
  nodes: CanvasNode[];
  lines: CanvasLine[];
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/**
 * 두 상자를 잇는 선 경로.
 * 1. 가로로 겹치면(위아래 관계) → 세로 직선
 * 2. 세로로 겹치면(옆 관계) → 가로 직선
 * 3. 둘 다 아니면 → a 에서 세로로 나가 b 높이에서 꺾어 가로로 들어간다(ㄱ자)
 */
export const routeLine = (
  a: Rect,
  b: Rect
): Pick<CanvasLine, 'points' | 'badge'> => {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcy = b.y + b.h / 2;

  const xLo = Math.max(a.x, b.x);
  const xHi = Math.min(a.x + a.w, b.x + b.w);
  if (xLo < xHi) {
    // 겹친 구간 안에서 a 의 가운데에 가장 가까운 x — 모서리에 딱 붙지 않게 12px 띄운다
    const x = xHi - xLo > 24 ? clamp(acx, xLo + 12, xHi - 12) : (xLo + xHi) / 2;
    const down = a.y < b.y;
    const y1 = down ? a.y + a.h : a.y;
    const y2 = down ? b.y : b.y + b.h;
    return {
      points: [
        [x, y1],
        [x, y2],
      ],
      badge: [x, (y1 + y2) / 2],
    };
  }

  const yLo = Math.max(a.y, b.y);
  const yHi = Math.min(a.y + a.h, b.y + b.h);
  if (yLo < yHi) {
    const y = yHi - yLo > 24 ? clamp(acy, yLo + 12, yHi - 12) : (yLo + yHi) / 2;
    const right = a.x < b.x;
    const x1 = right ? a.x + a.w : a.x;
    const x2 = right ? b.x : b.x + b.w;
    return {
      points: [
        [x1, y],
        [x2, y],
      ],
      badge: [(x1 + x2) / 2, y],
    };
  }

  // ㄱ자: a 위/아래 가운데 → b 의 가운데 높이 → b 의 가까운 옆면
  const y1 = bcy < a.y ? a.y : a.y + a.h;
  const x2 = b.x > acx ? b.x : b.x + b.w;
  return {
    points: [
      [acx, y1],
      [acx, bcy],
      [x2, bcy],
    ],
    badge: [(acx + x2) / 2, bcy],
  };
};

const withHeight = (r: GuideRect, h: number): Rect => ({ ...r, h: r.h ?? h });

export const buildCanvasLayout = (section: PeopleSection): CanvasLayout => {
  const width = GUIDE_CANVAS_WIDTH;
  const rects = new Map<string, Rect>();
  const nodes: CanvasNode[] = [];
  const panels: CanvasPanel[] = [];

  // 1. 중심 인물 — 좌표 없으면 맨 위 왼쪽/오른쪽(하나면 가운데)
  section.leads.forEach((lead, i) => {
    const w = 260;
    const fallbackX =
      section.leads.length === 1 ? (width - w) / 2 : i === 0 ? 0 : width - w;
    const rect = lead.at
      ? withHeight(lead.at, LEAD_HEIGHT)
      : { x: fallbackX, y: 0, w, h: LEAD_HEIGHT };
    rects.set(lead.id, rect);
    nodes.push({
      person: lead,
      rect,
      tone: lead.tone ?? (i === 0 ? 'primary' : 'mint'),
      isLead: true,
    });
  });

  // 2. 묶음 — 회색 판 + 판 안 격자. 좌표 있는 구성원은 판 밖이어도 그 자리에
  section.groups.forEach((group, gi) => {
    const free = group.members.filter((m) => !m.at);
    const cols = group.cols ?? 1;
    if (group.box) {
      const rows = Math.ceil(free.length / cols);
      const autoH =
        PANEL_HEAD + rows * (MEMBER_HEIGHT + CELL_GAP) - CELL_GAP + PANEL_PAD;
      const box = withHeight(group.box, Math.max(autoH, PANEL_HEAD + 8));
      panels.push({ key: group.id ?? `g${gi}`, name: group.name, rect: box });
      if (group.id) rects.set(group.id, box);

      const cellW =
        (box.w - PANEL_PAD * 2 - (cols - 1) * CELL_GAP) / Math.max(cols, 1);
      free.forEach((m, k) => {
        const col = k % cols;
        const row = Math.floor(k / cols);
        rects.set(m.id, {
          x: Math.round(box.x + PANEL_PAD + col * (cellW + CELL_GAP)),
          y: box.y + PANEL_HEAD + row * (MEMBER_HEIGHT + CELL_GAP),
          w: Math.round(cellW),
          h: MEMBER_HEIGHT,
        });
      });
    }
    group.members.forEach((m) => {
      if (m.at) rects.set(m.id, withHeight(m.at, MEMBER_HEIGHT));
      const rect = rects.get(m.id);
      // 판도 좌표도 없는 구성원은 그릴 자리가 없다 — 스키마가 저장 전에 막는다
      if (!rect) return;
      nodes.push({ person: m, rect, tone: m.tone ?? 'plain', isLead: false });
    });
  });

  // 3. 선 — 양 끝 상자를 알면 경로가 정해진다
  const lines: CanvasLine[] = section.links.flatMap((link, i) => {
    const a = rects.get(link.from);
    const b = rects.get(link.to);
    if (!a || !b) return [];
    return [
      {
        key: `${link.from}-${link.to}-${i}`,
        kind: link.kind,
        label: link.label,
        ...routeLine(a, b),
      },
    ];
  });

  // 높이를 안 적었으면 가장 아래 상자 + 여백
  const bottom = Math.max(
    0,
    ...[...rects.values()].map((r) => r.y + r.h),
    ...panels.map((p) => p.rect.y + p.rect.h)
  );
  const height = section.canvas?.height ?? bottom + 8;

  return { width, height, panels, nodes, lines };
};
