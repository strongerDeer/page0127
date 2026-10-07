/**
 * 첫 사용 가이드(코치 팁) — 지금 어떤 팁을 띄울지 정한다.
 *
 * 반복되지 않게 하는 원칙:
 * 1. 할 일을 마치면 저절로 사라진다 — 표시 조건을 "본 적 있나"가 아니라
 *    **데이터**(책 권수·목표·분석 이력)로 판정한다.
 * 2. 닫은 팁은 다시 띄우지 않는다 — `dismissed` 에 든 팁은 건너뛴다.
 * 3. 한 번에 하나만 — 여러 개가 조건에 맞아도 가장 먼저 할 일 하나만 고른다.
 *
 * 화면·저장소를 모르는 순수 함수로 둔 이유: 판정 규칙이 이 기능의 전부라
 * 컴포넌트를 띄우지 않고 vitest 로 경우의 수를 다 확인하기 위해서다.
 */

import { TASTE_ANALYSIS_MIN_BOOKS } from '@/entities/taste-analysis/model/analysisGate';

/** 순서가 곧 우선순위다 — 앞에 있을수록 먼저 할 일 */
export const COACH_TIP_IDS = [
  'add-book',
  'set-goal',
  'taste-analysis',
] as const;

export type CoachTipId = (typeof COACH_TIP_IDS)[number];

/**
 * 팁이 가리킬 요소에 붙이는 속성 — 예: `<Link {...coachTarget('add-book')}>`
 * 'use client' 가 없는 이 파일에 두는 이유: 서버 컴포넌트(Gnb)에서도 불러 써야 한다.
 */
export const coachTarget = (id: CoachTipId) => ({ 'data-coach-target': id });

/** 팁 판정에 쓰는 서재 상태 — 전부 서버 데이터에서 온다 */
export type CoachTipFacts = {
  /** 내 서재를 보고 있는가 — 남의 서재에서는 팁을 띄우지 않는다 */
  isOwner: boolean;
  /** 서재에 담긴 책 권수 */
  bookCount: number;
  hasReadingGoal: boolean;
  /** 평가를 남긴 완독 책 권수 — 분석 API 가 세는 기준과 같다 */
  analyzableBookCount: number;
  hasTasteAnalysis: boolean;
};

export type CoachTipContext = CoachTipFacts & {
  /** 다시 띄우지 않을 팁 — 사용자가 닫았거나 이번 세션에 이미 보여준 팁 */
  dismissed: ReadonlySet<CoachTipId>;
};

/** 팁별 "지금 이 일이 남아 있는가" */
const isPending: Record<CoachTipId, (facts: CoachTipFacts) => boolean> = {
  'add-book': (facts) => facts.bookCount === 0,
  'set-goal': (facts) => facts.bookCount > 0 && !facts.hasReadingGoal,
  'taste-analysis': (facts) =>
    facts.analyzableBookCount >= TASTE_ANALYSIS_MIN_BOOKS &&
    !facts.hasTasteAnalysis,
};

/**
 * 이 팁이 가리키는 일이 아직 남아 있는가.
 * 팁이 떠 있는 동안 사용자가 그 일을 해 버리면(목표 저장 → router.refresh)
 * 그 자리에서 팁을 거두는 데 쓴다.
 */
export const isCoachTipPending = (
  id: CoachTipId,
  facts: CoachTipFacts
): boolean => facts.isOwner && isPending[id](facts);

export const pickCoachTip = (ctx: CoachTipContext): CoachTipId | null =>
  COACH_TIP_IDS.find(
    (id) => !ctx.dismissed.has(id) && isCoachTipPending(id, ctx)
  ) ?? null;

// ── 닫은 팁 저장 형식 ──────────────────────────────────────────
// 저장소(localStorage) 접근은 UI 쪽이 맡고, 여기서는 문자열 ↔ 집합 변환만 한다.

const isCoachTipId = (value: unknown): value is CoachTipId =>
  typeof value === 'string' &&
  (COACH_TIP_IDS as readonly string[]).includes(value);

export const parseDismissedTips = (raw: string | null): Set<CoachTipId> => {
  if (raw === null) return new Set();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(isCoachTipId));
  } catch {
    return new Set();
  }
};

export const serializeDismissedTips = (
  dismissed: ReadonlySet<CoachTipId>
): string => JSON.stringify([...dismissed]);
