'use client';

import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { bookApi, type BookRating } from '@/entities/book';
import { StarRatingInput } from '@/entities/book/ui/StarRatingInput';

import type { UnratedBook } from '../model/ratingNudge';

type QuickRatingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: UnratedBook[];
  /** 취향 분석까지 남은 권수 — 제목에서 목표를 보여 준다 */
  needed: number;
  /** 한 권이라도 저장되면 — 서재 숫자를 새로 그리게 부른 쪽이 갱신한다 */
  onSaved: () => void;
};

/**
 * 별점 없는 완독 책에 한 화면에서 별점만 남긴다.
 * 책 수정 화면을 한 권씩 여는 대신 여기서 끝낸다 — 필요한 건 별점 하나뿐이다.
 */
export const QuickRatingDialog = ({
  open,
  onOpenChange,
  books,
  needed,
  onSaved,
}: QuickRatingDialogProps) => {
  const [ratings, setRatings] = useState<Record<string, BookRating | null>>({});
  const [isSaving, setIsSaving] = useState(false);

  const answers = books.flatMap((b) => {
    const rating = ratings[b.id] ?? null;
    return rating === null ? [] : [{ id: b.id, rating }];
  });

  const handleSave = async () => {
    setIsSaving(true);
    let failed = 0;
    // 한 권씩 차례로 — 레이트 리밋, 한 권의 실패가 나머지를 막지 않는다
    for (const { id, rating } of answers) {
      try {
        await bookApi.updateBook(id, { rating });
      } catch {
        failed += 1;
      }
    }
    const saved = answers.length - failed;
    trackEvent('rating_nudge_save', { asked: books.length, rated: saved });
    setIsSaving(false);

    if (saved > 0) {
      toast.success(
        saved >= needed
          ? `${saved}권에 별점을 남겼어요. 이제 취향 분석을 볼 수 있어요!`
          : `${saved}권에 별점을 남겼어요.`
      );
      onSaved();
    }
    if (failed > 0) {
      toast.error(
        `${failed}권은 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.`
      );
    }
    setRatings({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>읽은 책, 어땠나요?</DialogTitle>
          <DialogDescription>
            {needed}권만 별점을 남기면 취향 분석을 볼 수 있어요. 기억나는 책만
            골라도 돼요.
          </DialogDescription>
        </DialogHeader>

        <ul className='max-h-[50vh] space-y-4 overflow-y-auto pr-1'>
          {books.map((book) => (
            <li key={book.id}>
              <p className='truncate text-sm font-medium text-text-strong'>
                {book.title}
              </p>
              {book.author && (
                <p className='truncate text-xs text-text-subtle'>
                  {book.author}
                </p>
              )}
              <div className='mt-1'>
                <StarRatingInput
                  label={`${book.title} 별점`}
                  value={ratings[book.id] ?? null}
                  onChange={(rating) =>
                    setRatings((prev) => ({ ...prev, [book.id]: rating }))
                  }
                />
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            나중에 할게요
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || answers.length === 0}
          >
            {answers.length > 0 ? `${answers.length}권 저장` : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
