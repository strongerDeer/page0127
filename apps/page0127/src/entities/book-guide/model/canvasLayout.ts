import { GUIDE_CANVAS_WIDTH } from './bookGuideSchema';

import type {
  GuideBorder,
  GuideColor,
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

// 크기는 피그마 컴포넌트와 같은 값(1080 카드 기준 px)
export const LEAD_WIDTH = 300;
export const LEAD_HEIGHT = 136;
export const MEMBER_HEIGHT = 100;
export const PANEL_PAD = 14;
/** 판 위쪽 묶음 이름 줄 높이 — 첫 카드가 판 위에서 53px 아래 */
export const PANEL_HEAD = 53;
export const CELL_GAP = 12;

type Rect = Required<GuideRect>;

export type CanvasNode = {
  person: GuidePerson;
  rect: Rect;
  tone: GuideTone;
  isLead: boolean;
};

export type CanvasPanel = {
  key: string;
  name: string;
  rect: Rect;
  fill?: GuideColor;
  border?: GuideBorder;
};

export type CanvasLine = {
  key: string;
  kind: GuideLinkKind;
  label?: string;
  /** 꺾은선들 — 각각 SVG polyline points 로 바로 쓴다 */
  lines: [number, number][][];
  /** 관계 배지 가운데 자리 — 없으면 배지를 그리지 않는다 */
  badge?: [number, number];
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

/** 가운데끼리 이 정도 안쪽으로 어긋나면 그냥 곧은 선(눈으로 구분 안 되는 꺾임을 만들지 않는다) */
const ALIGN_TOLERANCE = 4;
/** 상자 사이 틈이 이보다 좁으면 꺾을 자리가 없다 — 겹친 구간에 곧은 선 */
const MIN_ELBOW_GAP = 32;

/**
 * 두 상자를 잇는 선 경로 — 선은 언제나 상자 **가운데**에서 나가 상대 상자 **가운데**로 들어간다.
 * 1. 위아래로 놓였으면 → 세로선. 가운데가 어긋나면 틈의 절반 높이에서 한 번 옆으로 비킨다(ㄹ자)
 * 2. 옆으로 놓였으면 → 가로선. 가운데 높이가 어긋나면 틈의 절반에서 비킨다
 * 3. 대각선 자리면 → a 의 위/아래 가운데에서 나가 b 의 가운데 높이로 꺾는다(ㄱ자)
 *
 * 왜 ㄹ자인가(HJ 11/21 "선은 딱딱 가운데 정렬"): 겹친 구간에 곧은 선을 그으면 한쪽 상자에는
 * 가장자리로 들어가 삐뚤어 보인다. 꺾이더라도 양 끝이 가운데면 정돈돼 보인다.
 * 같은 상자에서 나가는 선들은 같은 높이에서 갈라져 자연스러운 갈래선이 된다.
 * 배지는 a 쪽 줄기(나가는 세로선)의 가운데 — 갈래선 배지가 한 자리에 겹쳐 하나로 보인다.
 */
export const routeLine = (
  a: Rect,
  b: Rect
): { points: [number, number][]; badge: [number, number] } => {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;

  const above = a.y + a.h <= b.y; // a 가 b 위
  const below = b.y + b.h <= a.y; // a 가 b 아래
  const xLo = Math.max(a.x, b.x);
  const xHi = Math.min(a.x + a.w, b.x + b.w);
  if ((above || below) && xLo < xHi) {
    const y1 = above ? a.y + a.h : a.y;
    const y2 = above ? b.y : b.y + b.h;
    if (
      Math.abs(acx - bcx) <= ALIGN_TOLERANCE ||
      Math.abs(y2 - y1) < MIN_ELBOW_GAP
    ) {
      // 곧은 선: 가운데가 같으면 그 x, 틈이 좁으면 겹친 구간 안에서 a 가운데에 가장 가까운 x
      const x =
        Math.abs(acx - bcx) <= ALIGN_TOLERANCE
          ? acx
          : xHi - xLo > 24
            ? clamp(acx, xLo + 12, xHi - 12)
            : (xLo + xHi) / 2;
      return {
        points: [
          [x, y1],
          [x, y2],
        ],
        badge: [x, (y1 + y2) / 2],
      };
    }
    const my = Math.round((y1 + y2) / 2);
    return {
      points: [
        [acx, y1],
        [acx, my],
        [bcx, my],
        [bcx, y2],
      ],
      badge: [acx, (y1 + my) / 2],
    };
  }

  const left = a.x + a.w <= b.x; // a 가 b 왼쪽
  const right = b.x + b.w <= a.x;
  const yLo = Math.max(a.y, b.y);
  const yHi = Math.min(a.y + a.h, b.y + b.h);
  if ((left || right) && yLo < yHi) {
    const x1 = left ? a.x + a.w : a.x;
    const x2 = left ? b.x : b.x + b.w;
    if (
      Math.abs(acy - bcy) <= ALIGN_TOLERANCE ||
      Math.abs(x2 - x1) < MIN_ELBOW_GAP
    ) {
      const y =
        Math.abs(acy - bcy) <= ALIGN_TOLERANCE
          ? acy
          : yHi - yLo > 24
            ? clamp(acy, yLo + 12, yHi - 12)
            : (yLo + yHi) / 2;
      return {
        points: [
          [x1, y],
          [x2, y],
        ],
        badge: [(x1 + x2) / 2, y],
      };
    }
    const mx = Math.round((x1 + x2) / 2);
    return {
      points: [
        [x1, acy],
        [mx, acy],
        [mx, bcy],
        [x2, bcy],
      ],
      badge: [(x1 + mx) / 2, acy],
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
    const w = LEAD_WIDTH;
    const fallbackX =
      section.leads.length === 1 ? (width - w) / 2 : i === 0 ? 0 : width - w;
    const rect = lead.at
      ? withHeight(lead.at, LEAD_HEIGHT)
      : { x: fallbackX, y: 0, w, h: LEAD_HEIGHT };
    rects.set(lead.id, rect);
    nodes.push({
      person: lead,
      rect,
      tone: lead.tone ?? (i === 0 ? 'primary' : 'green'),
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
      panels.push({
        key: group.id ?? `g${gi}`,
        name: group.name,
        rect: box,
        fill: group.fill,
        border: group.border,
      });
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
      // 판 안은 흰 카드, 판 밖은 테두리 있는 흰 카드(피그마 카드와 같은 약속)
      nodes.push({
        person: m,
        rect,
        tone: m.tone ?? (group.box && !m.at ? 'white' : 'line'),
        isLead: false,
      });
    });
  });

  // 3. 선 — 양 끝 상자를 알면 경로가 정해진다
  const lines: CanvasLine[] = section.links.flatMap((link, i) => {
    const key = `${link.from}-${link.to}-${i}`;
    // 피그마에서 가져온 모양이 있으면 그대로
    if (link.route) {
      return [
        {
          key,
          kind: link.kind,
          label: link.label,
          lines: link.route.lines,
          badge: link.route.badge,
        },
      ];
    }
    const a = rects.get(link.from);
    const b = rects.get(link.to);
    if (!a || !b) return [];
    const { points, badge } = routeLine(a, b);
    return [
      { key, kind: link.kind, label: link.label, lines: [points], badge },
    ];
  });

  // 높이를 안 적었으면 가장 아래 상자 + 여백
  const bottom = Math.max(
    0,
    ...[...rects.values()].map((r) => r.y + r.h),
    ...panels.map((p) => p.rect.y + p.rect.h),
    ...lines.flatMap((l) => l.lines.flat().map(([, y]) => y))
  );
  const height = section.canvas?.height ?? bottom + 8;

  return { width, height, panels, nodes, lines };
};
