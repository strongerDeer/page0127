'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';

import { useBookCRUD } from '../api/useBookCRUD';

type DeleteBookButtonProps = {
  bookId: string;
  /** 삭제 성공 후 이동할 경로 (예: 소유자의 /{username}) */
  redirectTo: string;
};

/**
 * 도서 삭제 버튼 컴포넌트 (Client Component)
 *
 * 학습 포인트:
 * - confirm() 대신 AlertDialog — 브라우저 기본 UI 탈피
 * - AlertDialog는 내부적으로 Portal 사용 → z-index 문제 없음
 */
export const DeleteBookButton = ({
  bookId,
  redirectTo,
}: DeleteBookButtonProps) => {
  const router = useRouter();
  const { deleteBook } = useBookCRUD();
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    const success = await deleteBook(bookId);
    if (success) {
      router.push(redirectTo);
    }
  };

  return (
    <>
      <Button variant='destructive' onClick={() => setOpen(true)}>
        삭제
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>책을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 책은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
