'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui';
import { BookCheck, Check } from 'lucide-react';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { bookApi } from '@/entities/book';

import { addPendingBook } from '../model/addPendingBook';
import { claimPendingBooks, toBookInput } from '../model/claim';
import { readPendingShelf, writePendingShelf } from '../model/pendingShelf';

import type { PendingBook } from '../model/types';
import type { Book } from '@/entities/book';

type ReadTooButtonProps = {
  book: Book;
  isLoggedIn: boolean;
};

type Status = 'idle' | 'saving' | 'done';

/** 남의 기록에서 책 정보만 떼어 낸다 — 별점·메모 같은 그 사람의 기록은 가져가지 않는다 */
const toPendingBook = (book: Book): PendingBook => ({
  isbn: book.isbn,
  provider_item_id: book.provider_item_id,
  title: book.title,
  author: book.author,
  publisher: book.publisher,
  cover_image: book.cover_image,
  spine_image: book.spine_image,
  pub_date: book.pub_date,
  category: book.category,
  source: book.source,
});

/**
 * 남의 책 상세의 "나도 읽었어요" — 아는 책을 만난 순간을 가입·기록으로 잇는다.
 *
 * - 비로그인: 이 책을 맛보기 보관분에 더하고 로그인으로 간다. 로그인 화면이
 *   "고른 N권이 꽂혀요"라고 이어 주고, 로그인하면 PendingShelfClaimer 가 담는다.
 *   마음이 정해진 순간이라 홈을 거치지 않고 바로 보낸다.
 * - 로그인: 그 자리에서 내 서재에 완독으로 담는다. 중복 검사는 맛보기 담기와 같은 규칙.
 */
export const ReadTooButton = ({ book, isLoggedIn }: ReadTooButtonProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');

  const handleGuest = () => {
    trackEvent('cta_click', {
      location: 'book_read_too',
      label: '나도 읽었어요',
    });
    writePendingShelf(addPendingBook(readPendingShelf(), toPendingBook(book)));
    router.push('/login');
  };

  const handleMember = async () => {
    setStatus('saving');
    const { added, skipped } = await claimPendingBooks([toPendingBook(book)], {
      findExisting: async (b) =>
        (await bookApi.getBookByISBN(b.isbn, b.provider_item_id)).length > 0,
      create: async (b) => {
        await bookApi.createBook(toBookInput(b));
      },
    });
    if (added > 0) {
      toast.success('내 서재에 꽂았어요.');
      setStatus('done');
    } else if (skipped > 0) {
      toast('이미 내 서재에 있어요.');
      setStatus('done');
    } else {
      toast.error('담지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      setStatus('idle');
    }
  };

  if (status === 'done') {
    return (
      <Button variant='outline' disabled className='gap-2'>
        <Check aria-hidden='true' className='size-4' />내 서재에 있어요
      </Button>
    );
  }

  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
      <Button
        variant='outline'
        className='gap-2'
        disabled={status === 'saving'}
        onClick={isLoggedIn ? handleMember : handleGuest}
      >
        <BookCheck aria-hidden='true' className='size-4' />
        나도 읽었어요
      </Button>
      {!isLoggedIn && (
        <span className='text-xs text-text-subtle'>
          로그인하면 내 서재에 바로 꽂혀요
        </span>
      )}
    </div>
  );
};
