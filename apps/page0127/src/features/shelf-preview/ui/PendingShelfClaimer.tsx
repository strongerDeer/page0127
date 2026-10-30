'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { clearLoginStart, readLoginStart } from '@/shared/lib/auth/loginStart';

import { bookApi, fillMissingSpine } from '@/entities/book';

import { claimReadingGoalAction } from '../api/claimReadingGoalAction';
import {
  claimPendingBooks,
  toBookInput,
  toClaimFailureToast,
  toClaimToast,
} from '../model/claim';
import { canAutoClaim } from '../model/claimConsent';
import {
  clearPendingShelf,
  type PendingShelf,
  readPendingShelf,
} from '../model/pendingShelf';
import { ClaimConfirmDialog } from './ClaimConfirmDialog';
import { type ClaimedBook, CompletedYearDialog } from './CompletedYearDialog';

/**
 * 로그인 후, 맛보기에서 들고 온 책·목표를 서재에 담는다. 새로 담긴 책이 있으면 완독 연도를
 * 한 번 묻는다(CompletedYearDialog) — 맛보기는 완독일을 비워 담아 그해 책장에 잡히지 않기 때문이다.
 *
 * 학습 포인트:
 * - 읽자마자 **먼저 지운다**. React StrictMode 는 개발에서 effect 를 두 번 돌리고,
 *   사용자는 탭을 두 개 열 수 있다 — 지우기 전에 담기를 시작하면 두 번 담긴다.
 * - 온보딩((onboarding) 그룹)은 AppShell 밖이라 여기서 실행되지 않는다.
 *   아이디가 정해진 뒤 서재에서 담겨야 활동 기록이 맞는 주소로 남는다.
 * - 보관분은 계정과 묶여 있지 않다. 공용 PC 에서 앞사람이 고르고 떠나면 다음에 로그인한
 *   사람에게 담길 수 있다 → 이 탭에서 고른 직후 로그인한 게 아니면 먼저 확인받는다(canAutoClaim).
 */
export const PendingShelfClaimer = () => {
  const router = useRouter();
  // 담기 전에 확인받을 보관분 — 바로 이어진 로그인이 아닐 때만 생긴다
  const [asking, setAsking] = useState<PendingShelf | null>(null);
  // 방금 새로 담긴 책 — 건너뛴(이미 있던) 책과 실패한 책은 묻지 않는다
  const [claimed, setClaimed] = useState<ClaimedBook[]>([]);

  const claim = (pending: PendingShelf, asked: boolean) => {
    const run = async () => {
      const created: ClaimedBook[] = [];
      const result = await claimPendingBooks(pending.books, {
        findExisting: async (b) =>
          (await bookApi.getBookByISBN(b.isbn, b.provider_item_id)).length > 0,
        create: async (b) => {
          const isLifeBook = b.isbn === pending.lifeBookIsbn;
          const book = await bookApi.createBook(toBookInput(b, isLifeBook));
          // 맛보기 책은 전체 도서의 책등 값을 그대로 들고 온다 — 비어 있으면 YES24 에서 확인해 채운다
          void fillMissingSpine(book);
          if (book.status === 'completed')
            created.push({ id: book.id, title: book.title, isLifeBook });
        },
      });
      const { added, failed } = result;
      const goalSet = pending.goal
        ? await claimReadingGoalAction(pending.goal)
        : false;
      // 맛보기 깔때기의 끝 — book_add 는 /books/add 에서만 나가서 여기서 따로 센다
      trackEvent('shelf_preview_claim', {
        ...result,
        goal_set: goalSet,
        life_book: Boolean(pending.lifeBookIsbn),
        asked,
      });

      const message = toClaimToast(added, goalSet);
      if (message) toast.success(message);
      const failure = toClaimFailureToast(failed);
      if (failure) toast.error(failure);
      if (added > 0 || goalSet) router.refresh();
      if (created.length > 0) setClaimed(created);
    };
    void run();
  };

  useEffect(() => {
    const pending = readPendingShelf();
    const loginStartedAt = readLoginStart();
    // 한 번 쓰고 버린다 — 남겨 두면 같은 탭의 다음 로그인까지 "바로 이어진 로그인"으로 보인다
    clearLoginStart();
    if (!pending) return;
    clearPendingShelf();

    if (canAutoClaim(pending.savedAt, loginStartedAt)) claim(pending, false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 마운트 후에만 읽힌다
    else setAsking(pending);
    // claim 은 router 만 쓴다 — 마운트 때 한 번만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (asking)
    return (
      <ClaimConfirmDialog
        pending={asking}
        onConfirm={() => {
          setAsking(null);
          claim(asking, true);
        }}
        onDecline={() => {
          trackEvent('shelf_preview_decline', {
            count: asking.books.length,
            goal: Boolean(asking.goal),
          });
          setAsking(null);
        }}
      />
    );
  if (claimed.length === 0) return null;
  return <CompletedYearDialog books={claimed} onClose={() => setClaimed([])} />;
};
