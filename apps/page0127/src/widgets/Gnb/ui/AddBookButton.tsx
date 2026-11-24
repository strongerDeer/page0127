'use client';

import { Button } from '@repo/ui';
import { Plus } from 'lucide-react';

import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { requestNewBookEntry } from '@/features/book/lib/newBookEntry';
import { coachTarget } from '@/features/onboarding';

/**
 * GNB "도서 추가"(+) 버튼
 *
 * 클라이언트 컴포넌트로 뺀 이유: 클릭 때 신호(requestNewBookEntry)를 보내야 하는데
 * Gnb 는 서버 컴포넌트라 onClick 을 달 수 없다.
 * 이미 도서 추가 페이지의 완독 결과 카드에 있으면, 페이지가 이 신호를 받아
 * "한 권 더 기록"과 똑같이 입력 화면으로 돌아간다. 다른 페이지에선 평소처럼 이동만 한다.
 */
export const AddBookButton = () => (
  <Button asChild size='sm' className='md:ml-1'>
    <IntentPrefetchLink
      href='/books/add'
      onClick={requestNewBookEntry}
      {...coachTarget('add-book')}
    >
      <Plus aria-hidden='true' />
      <span className='hidden md:inline'>도서 추가</span>
      <span className='sr-only md:hidden'>도서 추가</span>
    </IntentPrefetchLink>
  </Button>
);
