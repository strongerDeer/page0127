'use client';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

import type { Book } from '@/entities/book/types';

type DuplicateBookDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBook: Book;
  bookTitle: string;
  onReread: () => void;
  onEdit: () => void;
};

/**
 * 중복 책 발견 시 사용자 선택 다이얼로그
 *
 * 학습 포인트:
 * - Shadcn Dialog 컴포넌트 사용
 * - 사용자 의도 확인 (재독 vs 수정)
 * - 재독 횟수 표시
 */
export const DuplicateBookDialog = ({
  open,
  onOpenChange,
  existingBook,
  bookTitle,
  onReread,
  onEdit,
}: DuplicateBookDialogProps) => {
  const nextReadCount = existingBook.read_count + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>이미 등록된 책입니다</DialogTitle>
          <DialogDescription>
            <span className='font-medium text-gray-900'>&quot;{bookTitle}&quot;</span>
            <br />
            <br />
            이 책은 이미 등록되어 있습니다.
            <br />
            {existingBook.read_count > 1 && (
              <span className='text-blue-600'>
                (현재 {existingBook.read_count}회독)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='rounded-lg bg-gray-50 p-4'>
            <h4 className='mb-2 text-sm font-semibold text-gray-700'>
              기존 등록 정보
            </h4>
            <dl className='space-y-1 text-sm'>
              <div className='flex justify-between'>
                <dt className='text-gray-600'>상태:</dt>
                <dd className='font-medium'>
                  {existingBook.status === 'completed' && '완독'}
                  {existingBook.status === 'reading' && '읽는 중'}
                  {existingBook.status === 'want_to_read' && '읽고 싶은 책'}
                </dd>
              </div>
              {existingBook.completed_date && (
                <div className='flex justify-between'>
                  <dt className='text-gray-600'>완독일:</dt>
                  <dd className='font-medium'>{existingBook.completed_date}</dd>
                </div>
              )}
              {existingBook.rating && (
                <div className='flex justify-between'>
                  <dt className='text-gray-600'>평점:</dt>
                  <dd className='font-medium'>⭐ {existingBook.rating}점</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-between'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='w-full sm:w-auto'
          >
            취소
          </Button>
          <div className='flex w-full gap-2 sm:w-auto'>
            <Button
              type='button'
              variant='secondary'
              onClick={onEdit}
              className='flex-1 sm:flex-none'
            >
              수정하기
            </Button>
            <Button
              type='button'
              onClick={onReread}
              className='flex-1 sm:flex-none'
            >
              {nextReadCount}회독 등록
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
