'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useMutation } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { bookApi } from '@/entities/book';
import { GlobalBook } from '@/entities/book';

type AddToLibraryButtonProps = {
  book: GlobalBook;
  isInLibrary: boolean;
  /** 비로그인 방문자에게는 담기 대신 로그인을 유도한다 (책 정보 페이지는 공개다) */
  isLoggedIn?: boolean;
  className?: string;
};

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
    onSuccess: () => {
      toast.success('내 서재에 추가되었습니다.');
      router.refresh();
    },
    onError: () => {
      toast.error('책 담기 중 오류가 발생했습니다.');
    },
  });

  // 비로그인 방문자 — API를 호출하면 401로 실패한다. 로그인으로 보낸다.
  if (!isLoggedIn) {
    return (
      <Link href='/login'>
        <Button className={`gap-2 ${className}`}>
          <Plus size={16} />
          내 책장에 담기
        </Button>
      </Link>
    );
  }

  if (isInLibrary) {
    return (
      <Button variant='outline' className={`gap-2 ${className}`} disabled>
        <Check size={16} />
        이미 서재에 있음
      </Button>
    );
  }

  return (
    <Button
      className={`gap-2 ${className}`}
      onClick={() => mutate()}
      disabled={isPending}
    >
      <Plus size={16} />
      {isPending ? '담는 중...' : '내 서재에 담기'}
    </Button>
  );
};
