'use client';

import { usePathname, useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@repo/ui';

import { SentenceBook } from './SentenceBook';

import type { TodaySentenceState } from '../api/getTodaySentenceState';

/**
 * 서재 배너에서 연 오늘의 문장 — 모달 (Intercepting Route `@modal/(.)sentence` 가 그린다)
 *
 * 페이지(/sentence)와 같은 SentenceBook 을 그대로 띄운다 — 모달과 페이지의 인터랙션이 같아야 해서(HJ 11/24).
 * 주소는 /sentence 로 바뀌지만 뒤 서재는 그대로 남아, 뽑자마자 캘린더에 책갈피가 찍힌다. 닫으면 router.back().
 * 홈 당근은 <a> 라 가로채지 않고 페이지로 간다. 새로고침하거나 주소로 바로 와도 페이지가 뜬다.
 *
 * 주소가 /sentence 가 아니면 그리지 않는다: 소프트 내비게이션에서 Parallel Route 칸은 새 주소에 맞는 것이
 * 없으면 이전 상태를 유지하므로, 모달에서 "이 책 보러 가기"를 누르면 모달이 남는다.
 * (흔한 해법인 @modal/[...catchAll] 은 strict route matching 에서 route handler 주소와 부딪혀 빌드가 실패한다)
 */
export const SentenceModal = (props: TodaySentenceState) => {
  const router = useRouter();
  const pathname = usePathname();
  const close = () => router.back();

  if (pathname !== '/sentence') return null;

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        // 첫 버튼(당근)에 자동 포커스가 가면 파란 테두리가 그려진다 — 창 자체에 둔다(Tab 하면 당근부터)
        onOpenAutoFocus={(e) => e.preventDefault()}
        className='w-[calc(100vw-1rem)] max-w-3xl overflow-hidden rounded-2xl border-0 p-0 sm:max-w-3xl'
      >
        <DialogTitle className='sr-only'>오늘의 문장</DialogTitle>
        <DialogDescription className='sr-only'>
          책 사이 당근을 뽑으면 오늘의 문장과 독서운이 나와요.
        </DialogDescription>
        <SentenceBook {...props} variant='modal' onClose={close} />
      </DialogContent>
    </Dialog>
  );
};
