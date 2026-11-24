'use client';

import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@repo/ui';

import { DailySentenceDraw } from './DailySentenceDraw';

import type { TodaySentenceState } from '../api/getTodaySentenceState';

/**
 * 홈·서재에서 연 오늘의 문장 — 모달 (Intercepting Route `@modal/(.)sentence` 가 그린다)
 *
 * 주소는 /sentence 로 바뀌지만 뒤 화면은 그대로 남는다. 닫으면 router.back() 으로 원래 주소.
 * 새로고침하거나 주소로 바로 오면 가로채지 않으므로 같은 내용이 전체 페이지(app/(public)/sentence)로 뜬다.
 * 모바일은 아래에서 올라오는 시트 모양 — 엄지가 닿는 곳에 버튼이 온다.
 */
export const SentenceModal = (props: TodaySentenceState) => {
  const router = useRouter();
  const close = () => router.back();

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className='max-h-[calc(100svh-2rem)] overflow-y-auto rounded-2xl p-6 pt-8 max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-md'>
        <DialogTitle className='sr-only'>오늘의 문장</DialogTitle>
        <DialogDescription className='sr-only'>
          하루에 한 번 오늘의 문장과 독서운을 펼쳐요.
        </DialogDescription>
        <DailySentenceDraw {...props} place='modal' onClose={close} />
      </DialogContent>
    </Dialog>
  );
};
