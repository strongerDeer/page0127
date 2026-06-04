'use client';

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

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
};

/**
 * 삭제 확인 다이얼로그
 *
 * 학습 포인트:
 * - shadcn AlertDialog 컴포넌트
 * - 재사용 가능한 공통 컴포넌트
 */
export const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = '정말 삭제하시겠습니까?',
  description = '이 작업은 되돌릴 수 없습니다.',
}: DeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className='bg-destructive hover:bg-destructive/90'
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
