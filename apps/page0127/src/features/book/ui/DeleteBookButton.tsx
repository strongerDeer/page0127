'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/shared/ui/button';

import { useBookCRUD } from '../api/useBookCRUD';

type DeleteBookButtonProps = {
  bookId: string;
};

/**
 * 도서 삭제 버튼 컴포넌트 (Client Component)
 *
 * 학습 포인트:
 * - Server Component와 Client Component 분리
 * - Server Component(상세 페이지)는 데이터 페칭만
 * - Client Component(이 버튼)는 사용자 인터랙션 담당
 * - onClick, confirm 등은 클라이언트에서만 가능
 */
export const DeleteBookButton = ({ bookId }: DeleteBookButtonProps) => {
  const router = useRouter();
  const { deleteBook } = useBookCRUD();

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const success = await deleteBook(bookId);
    if (success) {
      router.push('/books');
    }
  };

  return (
    <Button variant='destructive' onClick={handleDelete}>
      삭제
    </Button>
  );
};
