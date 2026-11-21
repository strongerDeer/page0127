import { GUIDE_CANVAS_WIDTH } from '@/entities/book-guide';

import type {
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
export const updatePerson = (
  section: PeopleSection,
  id: string,
  patch: Partial<GuidePerson>
): PeopleSection => {
  const next = structuredClone(section);
  const person = allPeople(next).find((p) => p.id === id);
  if (!person) return section;
  Object.assign(person, patch);
  // undefined 로 지운 필드는 JSON 에서도 빠지게
  for (const key of Object.keys(patch) as (keyof GuidePerson)[]) {
    if (patch[key] === undefined) delete person[key];
  }
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
  patch: { name?: string; cols?: number }
): PeopleSection => {
  const next = structuredClone(section);
  const group = next.groups[groupIndex];
  if (!group) return section;
  Object.assign(group, patch);
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
