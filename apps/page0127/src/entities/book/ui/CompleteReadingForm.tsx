'use client';
import { useId, useState } from 'react';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';

import {
  isValidCompletedYear,
  MIN_COMPLETED_YEAR,
} from '../model/completedWhen';
import { getCurrentLibraryYear, getSeoulToday } from '../model/libraryPeriod';
import { RatingPicker } from './RatingPicker';

import type { BookRating } from '../types';

export type CompletedReadingInput = {
  completedDate: string | null;
  completedYear: number | null;
  rating: BookRating | null;
  isPublic: boolean;
  isLifeBook?: boolean;
};
export const CompleteReadingForm = ({
  onSubmit,
  onCancel,
  busy = false,
  error,
  initialIsPublic = true,
}: {
  onSubmit: (value: CompletedReadingInput) => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string;
  initialIsPublic?: boolean;
}) => {
  const id = useId();
  const [precision, setPrecision] = useState<'date' | 'year' | 'unknown'>(
    'unknown'
  );
  const [date, setDate] = useState(getSeoulToday());
  const [year, setYear] = useState(String(getCurrentLibraryYear()));
  const [rating, setRating] = useState<BookRating | null>(null);
  const [isLifeBook, setIsLifeBook] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [validation, setValidation] = useState('');
  return (
    <form
      className='space-y-5'
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        if (
          (precision === 'date' && (!date || date > getSeoulToday())) ||
          (precision === 'year' &&
            (!/^\d{4}$/.test(year) ||
              !isValidCompletedYear(Number(year), getCurrentLibraryYear())))
        ) {
          setValidation('완독 시점을 확인해 주세요.');
          return;
        }
        setValidation('');
        onSubmit({
          completedDate: precision === 'date' ? date : null,
          completedYear: precision === 'year' ? Number(year) : null,
          rating,
          isPublic,
          isLifeBook,
        });
      }}
    >
      <fieldset disabled={busy} className='space-y-5'>
        <div>
          <p className='mb-2 text-sm font-medium'>언제 다 읽었나요?</p>
          <div className='mb-3'>
            <Select
              value={precision}
              disabled={busy}
              onValueChange={(value) => setPrecision(value as typeof precision)}
            >
              <SelectTrigger aria-label='완독일 기록 방식' className='w-auto'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='date'>날짜</SelectItem>
                <SelectItem value='year'>연도만</SelectItem>
                <SelectItem value='unknown'>잘 모르겠어요</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {precision === 'date' && (
            <>
              <label htmlFor={`${id}-date`} className='sr-only'>
                완독 날짜
              </label>
              <Input
                id={`${id}-date`}
                type='date'
                required
                max={getSeoulToday()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </>
          )}
          {precision === 'year' && (
            <>
              <label htmlFor={`${id}-year`} className='sr-only'>
                완독 연도
              </label>
              <Input
                id={`${id}-year`}
                type='number'
                required
                min={MIN_COMPLETED_YEAR}
                max={getCurrentLibraryYear()}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </>
          )}
        </div>
        <div>
          <p id={`${id}-rating`} className='mb-2 text-sm font-medium'>
            어땠나요?{' '}
            <span className='font-normal text-text-subtle'>(선택)</span>
          </p>
          <RatingPicker
            rating={rating ?? undefined}
            isLifeBook={isLifeBook}
            labelledBy={`${id}-rating`}
            onChange={(value) => {
              setIsLifeBook(value === 'life');
              setRating(value === 'life' ? 5 : value);
            }}
          />
        </div>
        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className='size-4 accent-primary'
          />
          공개 기록으로 남기기
        </label>
      </fieldset>
      {(validation || error) && (
        <p role='alert' className='text-sm'>
          {validation || error}
        </p>
      )}
      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          disabled={busy}
          onClick={onCancel}
        >
          취소
        </Button>
        <Button type='submit' loading={busy}>
          완독 기록 저장
        </Button>
      </div>
    </form>
  );
};
