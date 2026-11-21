import { GUIDE_CANVAS_WIDTH } from '@/entities/book-guide';

import type {
  GuideBackground,
  GuideFont,
  GuideGroup,
  GuidePerson,
  GuideRect,
  PeopleSection,
} from '@/entities/book-guide';

/**
 * 관계도 편집기의 "데이터 바꾸기" 함수들 — 화면(끌기·클릭)과 분리한 순수 함수.
 *
 * 왜 따로 두나: 끌기 같은 포인터 이벤트는 테스트하기 어렵지만,
 * "이 사람을 여기로 옮기면 JSON 이 이렇게 된다" 는 함수로 떼면 단위 테스트로 지킬 수 있다.
 * 모두 원본을 건드리지 않고 새 객체를 돌려준다(React state 는 불변 갱신이어야 다시 그린다).
 */

/** 격자 간격 — 상자가 8px 칸에 착 붙는다 */
export const GRID = 8;

export const snap = (v: number) => Math.round(v / GRID) * GRID;

type FullRect = Required<GuideRect>;

/** 캔버스 밖으로 나가지 않게 + 격자에 맞춘다 */
export const fitRect = (r: FullRect): FullRect => {
  const w = Math.min(Math.max(snap(r.w), 40), GUIDE_CANVAS_WIDTH);
  return {
    x: Math.min(Math.max(snap(r.x), 0), GUIDE_CANVAS_WIDTH - w),
    y: Math.max(snap(r.y), 0),
    w,
    h: Math.max(snap(r.h), 32),
  };
};

const allPeople = (s: PeopleSection): GuidePerson[] => [
  ...s.leads,
  ...s.groups.flatMap((g) => g.members),
];

/** 사람 한 명의 필드를 바꾼다(이름·별명·설명·색·자리) */
/**
 * 피그마에서 가져온 선 모양(route)은 상자 자리를 전제로 한다.
 * 자리를 바꾸면 그 모양이 어긋나므로, 모든 선을 자동 긋기로 돌린다.
 */
const dropRoutes = (s: PeopleSection) => {
  for (const link of s.links) delete link.route;
};

/** undefined 로 지운 필드는 JSON 에서도 빠지게 — 저장된 데이터에 "키: undefined" 흔적이 남지 않는다 */
const assignPatch = <T extends object>(target: T, patch: Partial<T>) => {
  Object.assign(target, patch);
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (patch[key] === undefined) delete target[key];
  }
};

export const updatePerson = (
  section: PeopleSection,
  id: string,
  patch: Partial<GuidePerson>
): PeopleSection => {
  const next = structuredClone(section);
  if ('at' in patch) dropRoutes(next);
  const person = allPeople(next).find((p) => p.id === id);
  if (!person) return section;
  assignPatch(person, patch);
  return next;
};

export const movePerson = (
  section: PeopleSection,
  id: string,
  rect: FullRect
): PeopleSection => updatePerson(section, id, { at: fitRect(rect) });

/**
 * 묶음 회색 판 옮기기·크기 바꾸기.
 * 판을 옮기면 판 안에 자기 자리(at)를 가진 구성원도 같이 따라온다 — 안 그러면 판만 빠져나간다.
 */
export const moveGroupBox = (
  section: PeopleSection,
  groupIndex: number,
  rect: FullRect
): PeopleSection => {
  const next = structuredClone(section);
  const group = next.groups[groupIndex];
  if (!group) return section;
  const box = fitRect(rect);
  dropRoutes(next);
  const prev = group.box;
  if (prev) {
    const dx = box.x - prev.x;
    const dy = box.y - prev.y;
    // 크기만 바뀌었으면 dx=dy=0 이라 구성원은 그대로
    for (const m of group.members) {
      if (m.at) m.at = { ...m.at, x: m.at.x + dx, y: m.at.y + dy };
    }
  }
  group.box = box;
  return next;
};

export const updateGroup = (
  section: PeopleSection,
  groupIndex: number,
  patch: Partial<Pick<GuideGroup, 'name' | 'cols' | 'fill' | 'border'>>
): PeopleSection => {
  const next = structuredClone(section);
  const group = next.groups[groupIndex];
  if (!group) return section;
  assignPatch(group, patch);
  return next;
};

/**
 * 캔버스 전체 설정(글꼴·배경) 바꾸기. background 는 안쪽 필드만 덮어쓴다.
 * 배경 필드가 다 비면 background 자체를 지운다.
 */
export const updateCanvas = (
  section: PeopleSection,
  patch: { font?: GuideFont; background?: Partial<GuideBackground> }
): PeopleSection => {
  const next = structuredClone(section);
  const canvas = (next.canvas ??= {});
  if ('font' in patch) assignPatch(canvas, { font: patch.font });
  if (patch.background) {
    const background = (canvas.background ??= {});
    assignPatch(background, patch.background);
    if (Object.keys(background).length === 0) delete canvas.background;
  }
  return next;
};

/**
 * 자동 배치(가지 모양) 관계도를 캔버스 모드로 바꾼다 — 편집기에서 처음 열 때 한 번.
 * 중심 인물은 맨 위, 묶음 판은 그 아래 3열로 늘어놓는다. 그다음은 끌어서 다듬는다.
 */
export const toCanvas = (section: PeopleSection): PeopleSection => {
  if (section.canvas) return section;
  const next = structuredClone(section);
  next.canvas = {};
  const colW = (GUIDE_CANVAS_WIDTH - 2 * 16) / 3;
  dropRoutes(next);
  next.groups.forEach((g, i) => {
    if (g.box || g.members.every((m) => m.at)) return;
    g.box = {
      x: Math.round((i % 3) * (colW + 16)),
      y: 160 + Math.floor(i / 3) * 320,
      w: Math.round(colW),
    };
  });
  return next;
};
