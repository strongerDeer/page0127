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
import { Crown } from 'lucide-react';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { bookApi } from '@/entities/book';

import { toKstYear } from '../model/claim';
import {
  toCompletedYear,
  YEAR_CHOICES,
  type YearChoice,
} from '../model/completedYear';

/** 방금 서재에 담긴 책 — 담기에 성공한 책만 묻는다 */
export type ClaimedBook = { id: string; title: string; isLifeBook: boolean };

type RowState = { choice: YearChoice; custom: string };

type CompletedYearDialogProps = {
  books: ClaimedBook[];
  onClose: () => void;
};

/**
 * 맛보기로 담은 책의 완독 연도를 한 번만 묻는다.
 *
 * - 기본값은 "모름"이다. 건너뛰거나 [나중에 할게요]를 누르면 지금과 똑같다(지어내지 않는다).
 * - 날짜가 아니라 연도만 묻는다 — 오래전에 읽은 책은 날짜를 모르는 게 보통이다(completed_year).
 * - 연도를 남기면 그해 책장·목표 진행률에 잡힌다.
 */
export const CompletedYearDialog = ({
  books,
  onClose,
}: CompletedYearDialogProps) => {
  const router = useRouter();
  const currentYear = toKstYear(new Date());
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      books.map((b) => [b.id, { choice: 'unknown', custom: '' }])
    )
  );
  const [isSaving, setIsSaving] = useState(false);

  const setRow = (id: string, next: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));

  const answers = books
    .map((b) => ({
      id: b.id,
      year: toCompletedYear(rows[b.id].choice, rows[b.id].custom, currentYear),
    }))
    .filter((a): a is { id: string; year: number } => a.year !== null);

  const handleSkip = () => {
    trackEvent('shelf_preview_years', { asked: books.length, answered: 0 });
    onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    let failed = 0;
    // 한 권씩 차례로 — 담기와 같은 이유(레이트 리밋), 한 권의 실패가 나머지를 막지 않는다
    for (const { id, year } of answers) {
      try {
        // 날짜와 연도는 DB CHECK 로 함께 찰 수 없다 — 연도를 쓸 땐 날짜를 비운다
        await bookApi.updateBook(id, {
          completed_year: year,
          completed_date: null,
        });
      } catch {
        failed += 1;
      }
    }
    trackEvent('shelf_preview_years', {
      asked: books.length,
      answered: answers.length - failed,
    });
    setIsSaving(false);

    const saved = answers.length - failed;
    if (saved > 0) toast.success(`${saved}권의 완독 연도를 남겼어요.`);
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
            방금 꽂은 {books.length}권, 언제 읽으셨나요?
          </DialogTitle>
          <DialogDescription>
            연도를 남기면 그해 책장에 꽂혀요. 모르면 그대로 두셔도 돼요.
          </DialogDescription>
        </DialogHeader>

        <ul className='max-h-[50vh] space-y-4 overflow-y-auto pr-1'>
          {books.map((book) => {
            const row = rows[book.id];
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
                    value={row.custom}
                    onChange={(e) =>
                      setRow(book.id, { custom: e.target.value })
                    }
                    className='mt-2 w-32'
                  />
                )}
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant='ghost' onClick={handleSkip} disabled={isSaving}>
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
