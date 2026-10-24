'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@repo/ui';
import { Crown, Star } from 'lucide-react';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { bookApi, type BookRating } from '@/entities/book';

import { toKstYear } from '../model/claim';
import {
  getCompletedYearError,
  RATING_CHOICES,
  toClaimedBookUpdate,
  toCompletedYear,
  YEAR_CHOICES,
  type YearChoice,
} from '../model/completedYear';

/** 방금 서재에 담긴 책 — 담기에 성공한 책만 묻는다 */
export type ClaimedBook = { id: string; title: string; isLifeBook: boolean };

type RowState = {
  choice: YearChoice;
  custom: string;
  /** 안 고르면 null — 별점을 지어내지 않는다 */
  rating: BookRating | null;
};

type CompletedYearDialogProps = {
  books: ClaimedBook[];
  onClose: () => void;
};

/**
 * 맛보기로 담은 책의 완독 연도와 별점을 한 번만 묻는다.
 *
 * - 연도 기본값은 "모름", 별점 기본값은 "안 고름"이다. 건너뛰면 담긴 그대로다(지어내지 않는다).
 * - 날짜가 아니라 연도만 묻는다 — 오래전에 읽은 책은 날짜를 모르는 게 보통이다(completed_year).
 * - 연도를 남기면 그해 책장·목표 진행률에 잡힌다.
 * - 별점을 남기면 취향 분석·독서 케미의 "별점 있는 완독 5권"에 잡힌다. 인생책은 이미 5점이라 묻지 않는다.
 * - 아무것도 안 골라도 [저장]은 눌린다 — 전부 "모름"이라고 답한 것도 답이다.
 */
export const CompletedYearDialog = ({
  books,
  onClose,
}: CompletedYearDialogProps) => {
  const router = useRouter();
  const currentYear = toKstYear(new Date());
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      books.map((b) => [b.id, { choice: 'unknown', custom: '', rating: null }])
    )
  );
  const [isSaving, setIsSaving] = useState(false);

  const setRow = (id: string, next: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));

  const hasInvalidYear = books.some((b) =>
    getCompletedYearError(rows[b.id].choice, rows[b.id].custom, currentYear)
  );

  const answers = books.flatMap((b) => {
    const row = rows[b.id];
    const update = toClaimedBookUpdate(
      toCompletedYear(row.choice, row.custom, currentYear),
      row.rating
    );
    return update ? [{ id: b.id, update }] : [];
  });

  const handleSkip = () => {
    trackEvent('shelf_preview_years', {
      asked: books.length,
      answered: 0,
      rated: 0,
    });
    onClose();
  };

  const handleSave = async () => {
    if (isSaving || hasInvalidYear) return;
    // 전부 "모름"·별점 없음이면 보낼 게 없다 — 닫기만 한다 (예전엔 버튼이 꺼져 있어 못 닫았다)
    if (answers.length === 0) {
      handleSkip();
      return;
    }

    setIsSaving(true);
    let failed = 0;
    let rated = 0;
    // 한 권씩 차례로 — 담기와 같은 이유(레이트 리밋), 한 권의 실패가 나머지를 막지 않는다
    for (const { id, update } of answers) {
      try {
        await bookApi.updateBook(id, update);
        if (update.rating !== undefined) rated += 1;
      } catch {
        failed += 1;
      }
    }
    trackEvent('shelf_preview_years', {
      asked: books.length,
      answered: answers.length - failed,
      rated,
    });
    setIsSaving(false);

    const saved = answers.length - failed;
    if (saved > 0) toast.success(`${saved}권의 기록을 남겼어요.`);
    if (failed > 0) {
      toast.error(
        `${failed}권은 저장하지 못했어요. 책 수정에서 다시 남겨 주세요.`
      );
    }
    if (saved > 0) router.refresh();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            방금 꽂은 {books.length}권, 언제 읽고 어땠나요?
          </DialogTitle>
          <DialogDescription>
            연도를 남기면 그해 책장에 꽂히고, 별점을 남기면 취향 분석에 쓰여요
            (별점 남긴 완독 5권부터). 모르면 그대로 두셔도 돼요.
          </DialogDescription>
        </DialogHeader>

        <ul className='max-h-[50vh] space-y-4 overflow-y-auto pr-1'>
          {books.map((book) => {
            const row = rows[book.id];
            const yearError = getCompletedYearError(
              row.choice,
              row.custom,
              currentYear
            );
            return (
              <li key={book.id}>
                <p
                  id={`year-${book.id}`}
                  className='flex items-center gap-1.5 text-sm font-medium text-text-strong'
                >
                  {book.isLifeBook && (
                    <Crown
                      aria-label='인생책'
                      className='size-4 shrink-0 text-chart-6'
                    />
                  )}
                  <span className='truncate'>{book.title}</span>
                </p>
                <div
                  role='radiogroup'
                  aria-labelledby={`year-${book.id}`}
                  className='mt-2 flex flex-wrap gap-1.5'
                >
                  {YEAR_CHOICES.map(({ value, label }) => (
                    <Button
                      key={value}
                      type='button'
                      role='radio'
                      aria-checked={row.choice === value}
                      size='sm'
                      variant={row.choice === value ? 'default' : 'outline'}
                      onClick={() => setRow(book.id, { choice: value })}
                      className='rounded-full'
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                {row.choice === 'custom' && (
                  <Input
                    type='number'
                    inputMode='numeric'
                    min={1900}
                    max={currentYear}
                    placeholder={`예: ${currentYear - 5}`}
                    aria-label={`${book.title} 완독 연도`}
                    aria-invalid={Boolean(yearError)}
                    aria-describedby={
                      yearError ? `year-error-${book.id}` : undefined
                    }
                    value={row.custom}
                    onChange={(e) =>
                      setRow(book.id, { custom: e.target.value })
                    }
                    className='mt-2 w-32'
                  />
                )}
                {yearError && (
                  <p
                    id={`year-error-${book.id}`}
                    role='alert'
                    className='mt-1 text-xs text-destructive'
                  >
                    {yearError}
                  </p>
                )}
                {book.isLifeBook ? (
                  <p className='mt-2 text-xs text-text-subtle'>
                    인생책은 별점 5점으로 담았어요.
                  </p>
                ) : (
                  <div
                    role='group'
                    aria-label={`${book.title} 별점`}
                    className='mt-2 flex items-center gap-0.5'
                  >
                    {RATING_CHOICES.map((score) => {
                      const filled = row.rating !== null && score <= row.rating;
                      return (
                        <button
                          key={score}
                          type='button'
                          aria-pressed={row.rating === score}
                          aria-label={`${score}점`}
                          // 같은 별을 다시 누르면 지운다 — 잘못 누른 별점을 되돌릴 길이 있어야 한다
                          onClick={() =>
                            setRow(book.id, {
                              rating: row.rating === score ? null : score,
                            })
                          }
                          className='rounded-sm p-1 text-chart-6 transition-transform hover:scale-110'
                        >
                          <Star
                            aria-hidden
                            className={`size-6 ${filled ? 'fill-current' : 'text-line'}`}
                          />
                        </button>
                      );
                    })}
                    <span className='ml-2 text-xs text-text-subtle'>
                      {row.rating === null ? '별점 안 고름' : `${row.rating}점`}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant='ghost' onClick={handleSkip} disabled={isSaving}>
            나중에 할게요
          </Button>
          <Button onClick={handleSave} disabled={isSaving || hasInvalidYear}>
            {answers.length > 0 ? `${answers.length}권 저장` : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
