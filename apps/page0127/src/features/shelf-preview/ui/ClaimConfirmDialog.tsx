'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';

import type { PendingShelf } from '../model/pendingShelf';

type ClaimConfirmDialogProps = {
  pending: PendingShelf;
  onConfirm: () => void;
  onDecline: () => void;
};

/**
 * 로그인 전에 이 브라우저에서 고른 책·목표를 담기 전에 확인받는다.
 *
 * 고른 직후 이어진 로그인이면 묻지 않고 담는다(canAutoClaim). 여기 오는 건 한참 뒤에 로그인했거나
 * 다른 탭·창에서 로그인한 경우다 — 공용 PC 라면 앞사람이 고른 책일 수 있다.
 * 닫기(바깥 클릭·Esc)는 "담지 않기"로 본다. 남의 책이 슬쩍 담기는 쪽보다 다시 고르는 쪽이 낫다.
 */
export const ClaimConfirmDialog = ({
  pending,
  onConfirm,
  onDecline,
}: ClaimConfirmDialogProps) => (
  <Dialog open onOpenChange={(open) => !open && onDecline()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>로그인 전에 고른 책이 있어요</DialogTitle>
        <DialogDescription>
          이 브라우저에서 로그인하기 전에 고른 내용이에요. 직접 고른 게 맞으면
          내 서재에 담아 주세요.
        </DialogDescription>
      </DialogHeader>

      {pending.books.length > 0 && (
        <ul className='max-h-[40vh] list-inside list-disc space-y-1 overflow-y-auto text-sm'>
          {pending.books.map((book) => (
            <li key={book.isbn} className='truncate'>
              {book.title} ·{' '}
              {book.status === 'want_to_read' ? '읽고 싶은 책' : '완독'}
            </li>
          ))}
        </ul>
      )}
      {pending.goal && (
        <p className='text-sm'>
          {pending.goal.year}년 독서 목표 {pending.goal.target}권
        </p>
      )}

      <DialogFooter>
        <Button variant='ghost' onClick={onDecline}>
          담지 않기
        </Button>
        <Button onClick={onConfirm}>내 서재에 담기</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
