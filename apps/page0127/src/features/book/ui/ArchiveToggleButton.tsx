'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { useBookCRUD } from '../api/useBookCRUD';

type ArchiveToggleButtonProps = {
  bookId: string;
  isPublic: boolean;
};

/**
 * 책 하나를 공개 ↔ 보관(비공개) 전환하는 퀵 액션.
 * 수정 폼까지 안 들어가도 상세 페이지에서 바로 누를 수 있다.
 */
export const ArchiveToggleButton = ({
  bookId,
  isPublic,
}: ArchiveToggleButtonProps) => {
  const router = useRouter();
  const { updateBook, isLoading } = useBookCRUD();
  const [currentIsPublic, setCurrentIsPublic] = useState(isPublic);

  const handleToggle = async () => {
    const next = !currentIsPublic;
    const result = await updateBook(bookId, { is_public: next });

    if (result) {
      setCurrentIsPublic(next);
      toast.success(next ? '공개로 전환했어요.' : '보관함으로 옮겼어요.');
      router.refresh();
    } else {
      toast.error('전환 중 오류가 발생했습니다.');
    }
  };

  return (
    <Button variant='outline' onClick={handleToggle} disabled={isLoading}>
      {currentIsPublic ? (
        <>
          <Archive className='h-4 w-4' />
          보관하기
        </>
      ) : (
        <>
          <ArchiveRestore className='h-4 w-4' />
          보관 해제
        </>
      )}
    </Button>
  );
};
