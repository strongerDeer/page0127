'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { bookApi } from '@/entities/book';

import { claimReadingGoalAction } from '../api/claimReadingGoalAction';
import { claimPendingBooks, toBookInput, toClaimToast } from '../model/claim';
import { clearPendingShelf, readPendingShelf } from '../model/pendingShelf';

/**
 * 로그인 후, 맛보기에서 들고 온 책·목표를 서재에 담는다. 화면에는 아무것도 그리지 않는다.
 *
 * 학습 포인트:
 * - 읽자마자 **먼저 지운다**. React StrictMode 는 개발에서 effect 를 두 번 돌리고,
 *   사용자는 탭을 두 개 열 수 있다 — 지우기 전에 담기를 시작하면 두 번 담긴다.
 * - 온보딩((onboarding) 그룹)은 AppShell 밖이라 여기서 실행되지 않는다.
 *   아이디가 정해진 뒤 서재에서 담겨야 활동 기록이 맞는 주소로 남는다.
 */
export const PendingShelfClaimer = () => {
  const router = useRouter();

  useEffect(() => {
    const pending = readPendingShelf();
    if (!pending) return;
    clearPendingShelf();

    const run = async () => {
      const { added } = await claimPendingBooks(pending.books, {
        findExisting: async (b) =>
          (await bookApi.getBookByISBN(b.isbn, b.provider_item_id)).length > 0,
        create: async (b) => {
          await bookApi.createBook(toBookInput(b));
        },
      });
      const goalSet = pending.goal
        ? await claimReadingGoalAction(pending.goal)
        : false;

      const message = toClaimToast(added, goalSet);
      if (message) toast.success(message);
      if (added > 0 || goalSet) router.refresh();
    };
    void run();
  }, [router]);

  return null;
};
