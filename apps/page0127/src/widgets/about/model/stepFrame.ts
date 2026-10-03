import type { ShelfBook } from './coverRows';

/**
 * 세 걸음 연출 — 진행도(0~1) 하나로 화면 상태를 정한다.
 * 화면이 아니라 이 함수가 규칙을 갖게 해서, 브라우저 없이 vitest 로 확인한다.
 */
export const STEPS = ['record', 'goal', 'taste'] as const;
export type StepIndex = 0 | 1 | 2;

/** 단계마다 책장에 꽂혀 있는 권수 — 같은 책장이 자라는 이야기 */
export const BOOKS_AT = [1, 7, 12] as const;

/** 한 단계가 머무는 시간. 연출은 앞 절반에 끝내고 나머지는 완성된 모습을 보여 준다 */
export const STEP_DURATION_MS = 5200;

const MAX_STARS = 4;

export type StepFrame = {
  books: number;
  stars: number;
  memoRatio: number;
  goalRatio: number;
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export const stepFrame = (step: StepIndex, local: number): StepFrame => {
  const t = clamp(local);
  const from = step === 0 ? BOOKS_AT[0] : BOOKS_AT[step - 1];
  const books = Math.round(from + (BOOKS_AT[step] - from) * clamp(t * 2));

  return {
    books,
    stars:
      step > 0
        ? MAX_STARS
        : Math.min(MAX_STARS, Math.floor(clamp(t * 3) * (MAX_STARS + 0.99))),
    memoRatio: step > 0 ? 1 : clamp((t - 0.2) / 0.3),
    goalRatio: step > 1 ? 1 : step === 1 ? clamp(t * 2) : 0,
  };
};

export const nextStep = (step: StepIndex): StepIndex =>
  ((step + 1) % 3) as StepIndex;

export type Spine = { id: string; src: string | null; title: string };

/** 책장에 세울 책등 — 이미지가 있는 책을 먼저, 모자라면 이미지 없는 칸으로 채운다 */
export const pickSpines = (books: ShelfBook[], count: number): Spine[] => {
  const spines: Spine[] = books
    .filter((b) => b.spineImage)
    .slice(0, count)
    .map((b) => ({ id: b.id, src: b.spineImage, title: b.title }));
  for (let i = spines.length; i < count; i++) {
    spines.push({ id: `empty-${i}`, src: null, title: '' });
  }
  return spines;
};
