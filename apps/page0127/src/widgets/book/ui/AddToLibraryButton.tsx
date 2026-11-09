'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui';
import { useMutation } from '@tanstack/react-query';
import { Bookmark, Check, PenLine } from 'lucide-react';
import { toast } from 'sonner';

import { bookApi, fillMissingSpine } from '@/entities/book';
import { GlobalBook } from '@/entities/book';

import { addPendingBook } from '@/features/shelf-preview/model/addPendingBook';
import { toPendingLoginPath } from '@/features/shelf-preview/model/loginTransfer';
import {
  readPendingShelf,
  writePendingShelf,
} from '@/features/shelf-preview/model/pendingShelf';

import type { PendingBook } from '@/features/shelf-preview/model/types';

type AddToLibraryButtonProps = {
  book: GlobalBook;
  isInLibrary: boolean;
  /** 비로그인 방문자에게는 담기 대신 로그인을 유도한다 (책 정보 페이지는 공개다) */
  isLoggedIn?: boolean;
  className?: string;
};

/**
 * 읽은 책 기록 화면 주소 — 도서 추가에서 검색을 건너뛰고 이 책의 등록 폼을 바로 연다.
 *
 * title 은 상세 조회가 실패했을 때(직접 등록 책처럼 서점에 없는 책) 검색창을 채우는 데 쓴다.
 * 비로그인이면 미들웨어가 로그인으로 보내면서 이 주소를 redirect 로 남기므로,
 * 로그인 뒤 같은 등록 폼으로 돌아온다.
 */
export const toRecordBookPath = (book: Pick<GlobalBook, 'isbn' | 'title'>) =>
  `/books/add?${new URLSearchParams({ isbn: book.isbn, title: book.title })}`;

/**
 * 책 정보 화면의 담기 버튼 두 개.
 *
 * 예전엔 "내 서재에 담기" 하나가 말없이 읽고 싶어요로 담았다. 상단 "도서 추가"와 모양이
 * 같아서 읽은 책을 기록하려던 사람이 엉뚱한 상태로 담았다(2026-11-09 HJ).
 * 이 화면에 오는 의도는 둘이라 버튼도 둘로 나눈다.
 * - 읽은 책 기록하기(주 버튼): 별점·완독일을 적는 등록 폼으로 간다 — 서비스의 핵심 기록
 * - 읽고 싶어요(보조 버튼): 지금처럼 그 자리에서 바로 담는다
 */
export const AddToLibraryButton = ({
  book,
  isInLibrary,
  isLoggedIn = true,
  className,
}: AddToLibraryButtonProps) => {
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      bookApi.createBook({
        isbn: book.isbn,
        provider_item_id: book.provider_item_id,
        source: book.source,
        title: book.title,
        author: book.author ?? undefined,
        publisher: book.publisher ?? undefined,
        cover_image: book.cover_image ?? undefined,
        spine_image: book.spine_image ?? undefined,
        description: book.description ?? undefined,
        pub_date: book.pub_date ?? undefined,
        category: book.category ?? undefined,
        status: 'want_to_read',
      }),
    onSuccess: (created) => {
      // 전체 도서에 책등이 비어 있으면 그대로 복사돼 들어온다 — 담은 뒤 YES24 에서 확인해 채운다
      void fillMissingSpine(created);
      toast.success('읽고 싶어요에 담았어요.');
      router.refresh();
    },
    onError: () => {
      toast.error('책 담기 중 오류가 발생했습니다.');
    },
  });

  if (isLoggedIn && isInLibrary) {
    return (
      <Button variant='outline' className={`gap-2 ${className ?? ''}`} disabled>
        <Check size={16} />
        이미 서재에 있음
      </Button>
    );
  }

  // 비로그인 방문자 — API를 호출하면 401로 실패한다. 맛보기 책장에 넣고 로그인으로 보낸다.
  const handleGuestWish = () => {
    const selected: PendingBook = {
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
      status: 'want_to_read',
    };
    const pending = addPendingBook(readPendingShelf(), selected);
    writePendingShelf(pending);
    router.push(toPendingLoginPath(pending, window.location.pathname));
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-2 ${className ?? ''}`}
    >
      <Button
        variant='outline'
        className='gap-2'
        onClick={isLoggedIn ? () => mutate() : handleGuestWish}
        disabled={isPending}
      >
        <Bookmark size={16} aria-hidden />
        {isPending ? '담는 중...' : '읽고 싶어요'}
      </Button>
      <Button asChild className='gap-2'>
        <Link href={toRecordBookPath(book)}>
          <PenLine size={16} aria-hidden />
          읽은 책 기록하기
        </Link>
      </Button>
    </div>
  );
};
