import type {
  GuideBorder,
  GuideColor,
  GuideLinkKind,
  GuidePerson,
  GuideTone,
  PeopleSection,
} from '@/entities/book-guide';

/**
 * 피그마 "SVG 내보내기" → 인물관계도 데이터(PeopleSection)
 *
 * 왜 이런 게 필요한가:
 *   피그마 무료 플랜은 API(MCP) 호출 한도가 작아 파일을 직접 못 읽는다.
 *   대신 SVG 내보내기는 무료다. SVG 안에는 상자 좌표·색·글자가 그대로 들어 있으니
 *   그걸 읽어서 사이트가 그리는 데이터로 바꾼다. 디자인은 피그마, 사이트는 HTML(검색 가능).
 *
 * 약속(피그마 컴포넌트 기준 — 컴포넌트를 쓰면 저절로 지켜진다):
 *   - 주인공 칸: 둥근 모서리 24, 파랑(#1E69CB) 또는 초록(#00C96B) 채움
 *   - 묶음 판: 둥근 모서리 24, 회색(#F6F7F8) 채움 — 판 안 카드는 그 묶음 구성원
 *   - 사람 카드: 그 밖의 둥근 사각형. 가장 큰 글자=이름, 16px 글자=별명, 나머지=설명
 *   - 관계 배지: 높이 32 의 테두리 알약. 테두리 색이 관계 종류
 *   - 선: 파랑=인연, 보라(#6A49EE)=가족, 남색(#3B4E70)=일. 양 끝이 닿은 상자끼리 관계
 *   - "Outline text" 를 끄고 내보내야 글자가 남는다
 *
 * 정규식으로 읽는 이유: 피그마 SVG 는 평평하고 모양이 일정하다. DOMParser 없이 돌면
 * 서버·브라우저·테스트(node) 어디서나 같은 함수를 쓸 수 있다.
 */

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };

/** 카드 좌우 여백 — 이만큼 빼면 사이트 캔버스(880) 좌표가 된다 */
const ORIGIN_X = 100;

const COLOR_KIND: Record<string, GuideLinkKind> = {
  '#1e69cb': 'bond',
  '#6a49ee': 'family',
  '#3b4e70': 'work',
};

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const num = (tag: string, name: string, fallback = 0) => {
  const v = attr(tag, name);
  return v === undefined ? fallback : Number(v);
};

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\u2028/g, '');

type Shape = Box & {
  rx: number;
  fill?: string;
  stroke?: string;
  strokeWidth: number;
  /** stroke-dasharray — 있으면 대시/점선 테두리 */
  dash?: string;
};
type Text = {
  x: number;
  y: number;
  size: number;
  weight: number;
  value: string;
  /** 명조 계열 글꼴(Myeongjo·Serif·Batang) */
  serif: boolean;
};

/**
 * 토큰 팔레트의 라이트 값 — 피그마 색을 가장 가까운 토큰으로 맞출 때 쓴다.
 * packages/design-tokens/tokens/semantic.json 과 같은 값(테스트가 지킨다).
 */
export const TOKEN_HEX: Record<GuideColor, string> = {
  primary: '#1e69cb',
  'guide-green': '#00c96b',
  'text-strong': '#14294e',
  'text-body': '#3b4e70',
  'text-subtle': '#5f6f8f',
  'chart-7': '#7a5cf0',
  'rank-up': '#bf3f0d',
  line: '#dfe3e8',
  'line-soft': '#eceff2',
  card: '#ffffff',
  sunken: '#f6f7f8',
  accent: '#e3eefc',
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * 가장 가까운 토큰 색(RGB 거리). 피그마에서 손으로 고른 비슷한 색(#15294d·#e1e6ed 등)이
 * 시스템 색으로 모인다. 너무 먼 색이면 경고에 쓰라고 거리도 돌려준다.
 */
/** 예전 시스템 색 — 거리가 비슷해도 정해진 토큰으로(semantic.json 의 secondary·muted 설명 참고) */
const LEGACY_HEX: Record<string, GuideColor> = { '#f1f3f5': 'sunken' };

export const nearestToken = (
  hex: string
): { color: GuideColor; distance: number } => {
  const legacy = LEGACY_HEX[hex.toLowerCase()];
  if (legacy) return { color: legacy, distance: 0 };
  const [r, g, b] = rgb(hex);
  let best: { color: GuideColor; distance: number } = {
    color: 'line',
    distance: Infinity,
  };
  for (const [color, value] of Object.entries(TOKEN_HEX) as [
    GuideColor,
    string,
  ][]) {
    const [r2, g2, b2] = rgb(value);
    const distance = Math.hypot(r - r2, g - g2, b - b2);
    if (distance < best.distance) best = { color, distance };
  }
  return best;
};

/** 이 거리보다 멀면 "토큰에 없는 색" 경고 — 눈으로 보면 다른 색 */
const FAR_COLOR = 40;

const dashStyle = (dash?: string): GuideBorder['style'] => {
  if (!dash) return undefined;
  const first = parseFloat(dash);
  // 0 길이(동그란 점) 또는 아주 짧은 대시 = 점선
  return first <= 2 ? 'dotted' : 'dashed';
};
type Stroke = { color: string; subpaths: Pt[][] };

/** path d → 하위 경로들(M 마다 새 경로). 절대 좌표 M/L/H/V/C/Z 만 쓴다(피그마 출력) */
const parsePath = (d: string): Pt[][] => {
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const subpaths: Pt[][] = [];
  let cur: Pt[] = [];
  let cmd = '';
  let x = 0;
  let y = 0;
  for (let i = 0; i < tokens.length;) {
    const t = tokens[i];
    if (/[A-Z]/i.test(t)) {
      cmd = t.toUpperCase();
      i += 1;
      if (cmd === 'Z' && cur.length) cur.push(cur[0]);
      continue;
    }
    const n = (k: number) => Number(tokens[i + k]);
    if (cmd === 'M') {
      if (cur.length) subpaths.push(cur);
      x = n(0);
      y = n(1);
      cur = [[x, y]];
      i += 2;
      cmd = 'L';
    } else if (cmd === 'L') {
      x = n(0);
      y = n(1);
      cur.push([x, y]);
      i += 2;
    } else if (cmd === 'H') {
      x = n(0);
      cur.push([x, y]);
      i += 1;
    } else if (cmd === 'V') {
      y = n(0);
      cur.push([x, y]);
      i += 1;
    } else if (cmd === 'C') {
      x = n(4);
      y = n(5);
      cur.push([n(0), n(1)], [n(2), n(3)], [x, y]);
      i += 6;
    } else {
      i += 1;
    }
  }
  if (cur.length) subpaths.push(cur);
  return subpaths;
};

const bbox = (pts: Pt[]): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

const inside = (p: Pt, b: Box, pad = 0) =>
  p[0] >= b.x - pad &&
  p[0] <= b.x + b.w + pad &&
  p[1] >= b.y - pad &&
  p[1] <= b.y + b.h + pad;

const sameBox = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) < 1 &&
  Math.abs(a.y - b.y) < 1 &&
  Math.abs(a.w - b.w) < 1 &&
  Math.abs(a.h - b.h) < 1;

/** 점에서 선분까지 거리 */
const distToSeg = (p: Pt, a: Pt, b: Pt) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len
    ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len))
    : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};
const onPolyline = (p: Pt, line: Pt[], tol: number) =>
  line.some((a, i) => i > 0 && distToSeg(p, line[i - 1], a) <= tol);

/**
 * 점선·파선은 피그마가 조각마다 M 을 새로 쓴다. 규칙: 첫 M = 시작점, 둘째 M = 끝점(거꾸로 그린 마지막 조각),
 * 셋째 M 부터는 시작→끝 순서의 조각들. 이걸 이어 한 줄로 되돌리고 같은 직선 위 점은 지운다.
 */
const toPolyline = (subpaths: Pt[][]): Pt[] => {
  const pts =
    subpaths.length === 1
      ? subpaths[0]
      : [
          ...subpaths[0],
          ...subpaths.slice(2).flat(),
          // 둘째 조각은 끝점에서 안쪽으로 그려져 있다 → 뒤집어 붙인다
          ...[...subpaths[1]].reverse(),
        ];
  const out: Pt[] = [];
  for (const p of pts) {
    const q = [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2] as Pt;
    const last = out[out.length - 1];
    if (last && last[0] === q[0] && last[1] === q[1]) continue;
    const prev = out[out.length - 2];
    // 세 점이 한 직선(가로·세로) 위면 가운데 점을 버린다
    if (
      prev &&
      last &&
      ((prev[0] === last[0] && last[0] === q[0]) ||
        (prev[1] === last[1] && last[1] === q[1]))
    ) {
      out[out.length - 1] = q;
      continue;
    }
    out.push(q);
  }
  return out;
};

const lower = (c?: string) => c?.toLowerCase();

export type FigmaSvgResult =
  | { ok: true; section: PeopleSection; warnings: string[] }
  | { ok: false; message: string };

export const figmaSvgToPeopleSection = (svg: string): FigmaSvgResult => {
  const warnings: string[] = [];
  const shapes: Shape[] = [];
  const strokes: Stroke[] = [];
  const texts: Text[] = [];

  // 1. 태그 훑기 — 같은 모양을 채움용·테두리용 두 번 내보내므로 합친다
  const addShape = (
    b: Box,
    rx: number,
    fill?: string,
    stroke?: string,
    sw = 0,
    dash?: string
  ) => {
    const dup = shapes.find((s) => sameBox(s, b));
    if (dup) {
      dup.fill ??= fill;
      dup.stroke ??= stroke;
      dup.strokeWidth ||= sw;
      dup.dash ??= dash;
      return;
    }
    shapes.push({ ...b, rx, fill, stroke, strokeWidth: sw, dash });
  };

  for (const tag of svg.match(/<rect\b[^>]*>/g) ?? []) {
    const w = num(tag, 'width');
    const h = num(tag, 'height');
    if (w >= 1000) continue; // 배경
    addShape(
      { x: num(tag, 'x'), y: num(tag, 'y'), w, h },
      num(tag, 'rx'),
      lower(attr(tag, 'fill')),
      lower(attr(tag, 'stroke')),
      num(tag, 'stroke-width'),
      attr(tag, 'stroke-dasharray')
    );
  }

  for (const tag of svg.match(/<path\b[^>]*>/g) ?? []) {
    const d = attr(tag, 'd') ?? '';
    const fill = lower(attr(tag, 'fill'));
    const stroke = lower(attr(tag, 'stroke'));
    if (attr(tag, 'fill-rule') === 'evenodd') continue; // 카드 테두리 장식
    const subpaths = parsePath(d);
    if (d.includes('C')) {
      // 둥근 사각형을 path 로 내보낸 경우(배지·카드)
      const b = bbox(subpaths.flat());
      addShape(
        b,
        Math.min(b.h / 2, 16),
        fill,
        stroke,
        num(tag, 'stroke-width'),
        attr(tag, 'stroke-dasharray')
      );
    } else if (stroke && COLOR_KIND[stroke]) {
      strokes.push({ color: stroke, subpaths });
    }
  }

  // 범례 실선은 <line> 으로 나온다(관계선은 path) — 범례 이름 읽기에만 쓴다
  for (const tag of svg.match(/<line\b[^>]*>/g) ?? []) {
    const stroke = lower(attr(tag, 'stroke'));
    if (!stroke || !COLOR_KIND[stroke]) continue;
    strokes.push({
      color: stroke,
      subpaths: [
        [
          [num(tag, 'x1'), num(tag, 'y1')],
          [num(tag, 'x2'), num(tag, 'y2')],
        ],
      ],
    });
  }

  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const head = `<text${m[1]}>`;
    const spans = [...m[2].matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)];
    if (!spans.length) continue;
    const first = `<tspan${spans[0][1]}>`;
    texts.push({
      x: num(first, 'x'),
      y: num(first, 'y'),
      size: num(head, 'font-size'),
      weight:
        num(head, 'font-weight', 400) ||
        (attr(head, 'font-weight') === 'bold' ? 700 : 400),
      value: spans
        .map((s) => decode(s[2]))
        .filter((v) => v.trim())
        .join('\n'),
      serif: /myeongjo|myungjo|serif|batang|명조|바탕/i.test(
        attr(head, 'font-family') ?? ''
      ),
    });
  }
  for (const t of texts) {
    // font-weight="bold" 은 숫자가 아니라 NaN → 700
    if (Number.isNaN(t.weight)) t.weight = 700;
  }

  // 2. 상자 분류
  const FOOTER_Y = 1150;
  const body = shapes.filter((s) => s.y < FOOTER_Y);
  const badges = body.filter((s) => Math.abs(s.h - 32) < 2 && s.stroke);
  const rest = body.filter((s) => !badges.includes(s));
  const leads = rest.filter(
    (s) => s.rx >= 20 && (s.fill === '#1e69cb' || s.fill === '#00c96b')
  );
  // 판: 모서리 20 이상 + 채움(흰색 아님). 기본은 회색(#f6f7f8), 다른 색이면 fill 로 옮긴다
  const panels = rest.filter(
    (s) =>
      s.rx >= 20 &&
      !!s.fill &&
      s.fill.startsWith('#') &&
      s.fill !== '#ffffff' &&
      !leads.includes(s)
  );
  const cards = rest.filter((s) => !leads.includes(s) && !panels.includes(s));
  if (!leads.length) {
    return {
      ok: false,
      message:
        '주인공 칸(파랑·초록 채움, 모서리 24)을 찾지 못했어요. 관계도 프레임을 "Outline text" 끄고 SVG로 내보내 주세요.',
    };
  }

  const textIn = (b: Box) => texts.filter((t) => inside([t.x + 2, t.y - 4], b));

  // 3. 사람 — 가장 큰 글자=이름, 16px=별명, 나머지=설명
  const usedIds = new Set<string>();
  const toPerson = (b: Box, tone: GuideTone): GuidePerson | null => {
    const ts = textIn(b).sort((a, c) => a.y - c.y || a.x - c.x);
    if (!ts.length) return null;
    const maxSize = Math.max(...ts.map((t) => t.size));
    const nameT = ts.find((t) => t.size === maxSize)!;
    const aliasT = ts.find((t) => t.size === 16 && Math.abs(t.y - nameT.y) < 2);
    const roleTs = ts.filter((t) => t !== nameT && t !== aliasT);
    const name = nameT.value.trim();
    const clean = (t: Text) => t.value.trim();
    let id = name;
    for (let i = 2; usedIds.has(id); i += 1) id = `${name}-${i}`;
    usedIds.add(id);
    return {
      id,
      name,
      ...(aliasT && {
        alias: clean(aliasT)
          .replace(/^\(|\)$/g, '')
          .trim(),
      }),
      ...(roleTs.length && {
        role: roleTs
          .map(clean)
          .map((v) => v.replace(/\s*\n\s*/g, '\n'))
          .join('\n'),
      }),
      tone,
      // 이름 글자가 명조면 상자 글꼴도 명조
      ...(nameT.serif && { font: 'serif' as const }),
      at: { x: 0, y: 0, w: Math.round(b.w), h: Math.round(b.h) },
    };
  };

  const toToken = (hex: string, what: string): GuideColor => {
    const { color, distance } = nearestToken(hex);
    if (distance > FAR_COLOR) {
      warnings.push(
        `${what} 색 ${hex} 은 토큰에 없는 색이라 가장 가까운 "${color}" 로 바꿨어요.`
      );
    }
    return color;
  };

  /** 테두리 — tone 이 원래 그리는 테두리와 다를 때만 border 로 남긴다(데이터를 짧게) */
  const borderOf = (
    s: Shape,
    tone: GuideTone | 'panel',
    what: string
  ): GuideBorder | undefined => {
    if (!s.stroke || !s.stroke.startsWith('#') || !s.strokeWidth) return;
    const color = toToken(s.stroke, what);
    const width = Math.min(6, Math.max(1, Math.round(s.strokeWidth)));
    const style = dashStyle(s.dash);
    const isDefault =
      !style &&
      ((tone === 'outline' && color === 'guide-green' && width === 4) ||
        (tone === 'line' && color === 'line' && width === 2));
    if (isDefault) return;
    return { color, width, ...(style && { style }) };
  };

  // 좌표 원점 — 관계도 맨 위(상자·선·배지 중 가장 위)
  const allPts: Pt[] = [
    ...body.flatMap((s) => [[s.x, s.y] as Pt]),
    ...strokes.flatMap((s) => s.subpaths.flat()),
  ];
  const originY = Math.floor(Math.min(...allPts.map((p) => p[1])));
  const tx = (p: Pt): Pt => [
    Math.round(p[0] - ORIGIN_X),
    Math.round(p[1] - originY),
  ];
  const place = (b: Box) => {
    const [x, y] = tx([b.x, b.y]);
    return {
      x: Math.max(0, x),
      y: Math.max(0, y),
      w: Math.round(b.w),
      h: Math.round(b.h),
    };
  };

  const nodeOf = new Map<Box, string>();
  const leadPeople = leads
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .flatMap((b) => {
      const p = toPerson(b, b.fill === '#1e69cb' ? 'primary' : 'green');
      if (!p) return [];
      p.at = place(b);
      nodeOf.set(b, p.id);
      return [p];
    });

  const cardTone = (s: Shape): GuideTone =>
    s.stroke === '#00c96b'
      ? 'outline'
      : s.fill === '#f6f7f8'
        ? 'sunken'
        : s.stroke
          ? 'line'
          : 'white';

  /** 카드 → 사람(색·테두리 포함) */
  const cardPerson = (c: Shape): GuidePerson | null => {
    const tone = cardTone(c);
    const p = toPerson(c, tone);
    if (!p) return null;
    const border = borderOf(c, tone, `"${p.name}" 카드 테두리`);
    if (border) p.border = border;
    return p;
  };

  const groups: PeopleSection['groups'] = [];
  const panelId = new Map<Box, string>();
  for (const panel of panels.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const label = textIn(panel)
      .filter(
        (t) =>
          t.y < panel.y + 60 &&
          !cards.some((c) => inside([t.x + 2, t.y - 4], c))
      )
      .sort((a, b) => a.y - b.y)[0];
    const name = label?.value.trim() ?? `묶음 ${groups.length + 1}`;
    const members = cards
      .filter((c) => inside([c.x + c.w / 2, c.y + c.h / 2], panel))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .flatMap((c) => {
        const p = cardPerson(c);
        if (!p) return [];
        p.at = place(c);
        nodeOf.set(c, p.id);
        return [p];
      });
    const id = `group:${name}`;
    panelId.set(panel, id);
    nodeOf.set(panel, id);
    if (members.length === 0) {
      warnings.push(`"${name}" 판 안에 사람 카드가 없어요.`);
      continue;
    }
    const fill =
      panel.fill && panel.fill !== '#f6f7f8'
        ? toToken(panel.fill, `"${name}" 판`)
        : undefined;
    const border = borderOf(panel, 'panel', `"${name}" 판 테두리`);
    groups.push({
      id,
      name,
      box: place(panel),
      ...(fill && fill !== 'sunken' && { fill }),
      ...(border && { border }),
      members,
    });
  }

  const loose = cards
    .filter((c) => !nodeOf.has(c))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .flatMap((c) => {
      const p = cardPerson(c);
      if (!p) return [];
      p.at = place(c);
      nodeOf.set(c, p.id);
      return [p];
    });
  if (loose.length) groups.push({ name: '함께 나오는 사람들', members: loose });

  // 4. 선 → 관계. 끝점이 닿은 상자를 찾고, 같은 색 선끼리 이어진 것(갈래선)은 하나로 묶는다
  const nodeBoxes = [...leads, ...cards].filter((b) => nodeOf.has(b));
  const touch = (p: Pt): Box | undefined => {
    // 사람 칸: 끝점이 칸 안(선은 칸 뒤로 들어간다). 가장 작은 칸
    const hit = nodeBoxes
      .filter((b) => inside(p, b, 12))
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (hit) return hit;
    // 묶음 판: 끝점이 판 가장자리에 닿을 때만(판 안을 지나가는 선은 판과 관계가 아니다)
    return panels.find(
      (b) =>
        nodeOf.has(b) &&
        inside(p, b, 6) &&
        !inside(p, { x: b.x + 6, y: b.y + 6, w: b.w - 12, h: b.h - 12 })
    );
  };

  type Piece = {
    color: string;
    line: Pt[];
    ends: [Box | undefined, Box | undefined];
  };
  // 아래 범례의 선은 관계가 아니다
  const bodyStrokes = strokes.filter((s) =>
    s.subpaths.flat().every((p) => p[1] < FOOTER_Y)
  );
  const pieces: Piece[] = bodyStrokes.map((s) => {
    const line = toPolyline(s.subpaths);
    return {
      color: s.color,
      line,
      ends: [touch(line[0]), touch(line[line.length - 1])],
    };
  });

  // 끝이 허공인 선이 다른 같은 색 선 위에 떨어지면 한 묶음(갈래선)
  const parent = pieces.map((_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  pieces.forEach((a, i) => {
    [a.line[0], a.line[a.line.length - 1]].forEach((end, k) => {
      if (a.ends[k]) return;
      pieces.forEach((b, j) => {
        if (i !== j && a.color === b.color && onPolyline(end, b.line, 2)) {
          parent[find(i)] = find(j);
        }
      });
    });
  });

  const clusters = new Map<number, Piece[]>();
  pieces.forEach((p, i) =>
    clusters.set(find(i), [...(clusters.get(find(i)) ?? []), p])
  );

  const links: PeopleSection['links'] = [];
  for (const cluster of clusters.values()) {
    const kind = COLOR_KIND[cluster[0].color];
    const badge = badges.find((b) =>
      cluster.some((p) => onPolyline([b.x + b.w / 2, b.y + b.h / 2], p.line, 8))
    );
    const label = badge ? textIn(badge)[0]?.value.trim() : undefined;
    // 배지가 얹힌 선 조각의 상자가 "시작", 나머지가 상대
    const badgePiece = badge
      ? cluster.find((p) =>
          onPolyline([badge.x + badge.w / 2, badge.y + badge.h / 2], p.line, 8)
        )
      : undefined;
    const ids = [
      ...new Set(
        cluster.flatMap((p) =>
          p.ends.flatMap((b) => (b ? [nodeOf.get(b)!] : []))
        )
      ),
    ];
    if (ids.length < 2) {
      warnings.push(
        `${label ? `"${label}" ` : ''}선의 양 끝 상자를 찾지 못해 뺐어요. 선 끝이 상자에 닿게 해 주세요.`
      );
      continue;
    }
    const fromBox = badgePiece?.ends.find(Boolean);
    const from = fromBox ? nodeOf.get(fromBox)! : ids[0];
    const others = ids.filter((id) => id !== from);
    const route = {
      lines: cluster.map((p) => p.line.map(tx)),
      ...(badge && {
        badge: tx([badge.x + badge.w / 2, badge.y + badge.h / 2]),
      }),
    };
    others.forEach((to, i) => {
      links.push({
        from,
        to,
        kind,
        ...(label && { label }),
        // 첫 관계가 갈래선 전체를 그리고, 나머지는 같은 선을 공유한다(빈 route = 그리지 않음)
        route: i === 0 ? route : { lines: [] },
      });
    });
  }

  // 5. 제목·시기·범례
  const heading = texts.filter((t) => t.size === 56).sort((a, b) => a.x - b.x);
  const title = heading
    .map((t) => t.value)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  const headingY = heading[0]?.y ?? 0;
  const eraT = texts.find(
    (t) =>
      (t.size === 20 && Math.abs(t.y - headingY) < 6) ||
      (t.size === 26 && t.y < headingY && t.y > headingY - 100)
  );
  const legend: PeopleSection['legend'] = {};
  const defaultLegend: Record<GuideLinkKind, string> = {
    bond: '인연',
    family: '가족',
    work: '일',
  };
  for (const s of strokes) {
    const pts = s.subpaths.flat();
    if (!pts.length || pts[0][1] < FOOTER_Y + 20) continue;
    const right = Math.max(...pts.map((p) => p[0]));
    const t = texts
      .filter(
        (x) => x.x > right && x.x < right + 30 && Math.abs(x.y - pts[0][1]) < 15
      )
      .sort((a, b) => a.x - b.x)[0];
    const kind = COLOR_KIND[s.color];
    if (t && t.value.trim() !== defaultLegend[kind])
      legend[kind] = t.value.trim();
  }

  const section: PeopleSection = {
    type: 'people',
    title: title || '인물관계도',
    ...(eraT && { era: eraT.value.trim() }),
    leads: leadPeople.slice(0, 2),
    groups,
    links,
    ...(Object.keys(legend).length && { legend }),
    canvas: {},
  };
  if (leadPeople.length > 2) {
    warnings.push('주인공 칸이 3개 이상이라 앞의 2개만 주인공으로 넣었어요.');
    section.groups.push({ name: '주인공', members: leadPeople.slice(2) });
  }
  return { ok: true, section, warnings };
};
