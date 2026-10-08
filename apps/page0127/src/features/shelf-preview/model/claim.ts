import type { PendingBook, PendingGoal } from './types';
import type { BookInput } from '@/entities/book';

export type ClaimDeps = {
  /** 이미 서재에 있으면 true */
  findExisting: (b: PendingBook) => Promise<boolean>;
  create: (b: PendingBook) => Promise<void>;
};

export type ClaimResult = { added: number; skipped: number; failed: number };

/**
 * 완독으로 담는다. 완독일은 모르므로 비워 둔다(지어내지 않는다).
 * BookInput 의 선택 필드는 `string | undefined` 라 null 을 undefined 로 바꾼다.
 * spine_image 만은 null 을 받는다(명시적으로 비우는 값).
 */
export const toBookInput = (p: PendingBook): BookInput => ({
  isbn: p.isbn,
  title: p.title,
  provider_item_id: p.provider_item_id,
  source: p.source,
  author: p.author ?? undefined,
  publisher: p.publisher ?? undefined,
  cover_image: p.cover_image ?? undefined,
  spine_image: p.spine_image,
  pub_date: p.pub_date ?? undefined,
  category: p.category ?? undefined,
  status: 'completed',
});

/**
 * 한 권씩 차례로 담는다 — 병렬로 쏘면 활동 순서가 섞이고 레이트 리밋에 걸린다.
 * 한 권의 실패가 나머지를 막지 않는다.
 */
export const claimPendingBooks = async (
  books: PendingBook[],
  deps: ClaimDeps
): Promise<ClaimResult> => {
  const result: ClaimResult = { added: 0, skipped: 0, failed: 0 };
  for (const b of books) {
    try {
      if (await deps.findExisting(b)) {
        result.skipped += 1;
        continue;
      }
      await deps.create(b);
      result.added += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
};

/**
 * 올해 목표가 이미 있으면 덮지 않는다.
 * ⚠️ 컬럼 기본값이 `'{}'` 다 — null 만 비었다고 보면 기본값 사용자를 "목표 있음"으로 오판한다.
 */
export const shouldClaimGoal = (current: unknown, year: number): boolean => {
  if (typeof current !== 'object' || current === null) return true;
  const goal = current as { year?: unknown; target?: unknown };
  if (typeof goal.target !== 'number') return true;
  return goal.year !== year;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 기준 연도 — 서버(Vercel)는 UTC 라 1/1 00~09시에 아직 지난해다 */
export const toKstYear = (now: Date): number =>
  new Date(now.getTime() + KST_OFFSET_MS).getUTCFullYear();

/**
 * 보관한 목표가 "올해" 것인가. 올해는 클라이언트가 보낸 값이 아니라 서버 시각으로 정한다 —
 * 12/31 에 고르고 1/1 에 로그인하면 지난해 목표로 새해 목표 칸을 채우게 된다.
 */
export const isCurrentYearGoal = (goal: PendingGoal, now: Date): boolean =>
  goal.year === toKstYear(now);

export const toClaimToast = (
  added: number,
  goalSet: boolean
): string | null => {
  if (added > 0 && goalSet) {
    return `${added}권을 서재에 꽂고 올해 독서 목표를 정했어요.`;
  }
  if (added > 0) return `${added}권을 서재에 꽂았어요.`;
  if (goalSet) return '올해 독서 목표를 정했어요.';
  return null;
};
