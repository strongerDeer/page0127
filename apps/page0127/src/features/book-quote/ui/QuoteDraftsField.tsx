'use client';

import { useId } from 'react';

import { Button, Input, Label, Textarea } from '@repo/ui';
import { Lock, Plus, Quote, X } from 'lucide-react';

import {
  countQuoteChars,
  normalizeQuoteText,
  QUOTE_MAX_LENGTH,
} from '@/entities/quote';

import { QUOTE_DRAFTS_MAX } from '../model/quoteDrafts';

import type { QuoteDraftInput } from '../model/quoteDrafts';

type QuoteDraftsFieldProps = {
  value: QuoteDraftInput[];
  onChange: (next: QuoteDraftInput[]) => void;
};

/**
 * 도서 등록 폼의 "간직한 문장(선택)" 칸 (HJ, 2026-11-09).
 *
 * 처음엔 + 버튼 하나만 보인다 — 등록 폼이 이미 길어서, 쓰지 않는 사람에게 빈 칸을 늘어놓지 않는다.
 * 값은 등록 화면이 쥐고 있다가, 책이 저장된 뒤 addQuotesAction 으로 한 번에 저장한다.
 * (BookFormData 에 넣지 않는 이유: 그 객체는 그대로 books 행이 된다. 문장은 다른 테이블이다)
 */
export const QuoteDraftsField = ({
  value,
  onChange,
}: QuoteDraftsFieldProps) => {
  const id = useId();

  const update = (index: number, patch: Partial<QuoteDraftInput>) =>
    onChange(
      value.map((draft, i) => (i === index ? { ...draft, ...patch } : draft))
    );

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        <Label htmlFor={value.length ? `${id}-0` : undefined}>
          <Quote
            className='h-4 w-4 shrink-0 text-muted-foreground'
            aria-hidden
          />
          간직한 문장
        </Label>
        <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
          <Lock className='h-3 w-3' aria-hidden />
          나만 보기
        </span>
      </div>

      {value.map((draft, index) => {
        const length = countQuoteChars(normalizeQuoteText(draft.text));
        const over = length > QUOTE_MAX_LENGTH;
        return (
          <div key={index} className='space-y-2 border-l-2 border-line pl-3'>
            <Textarea
              id={`${id}-${index}`}
              value={draft.text}
              onChange={(e) => update(index, { text: e.target.value })}
              placeholder='마음에 남은 문장을 적어 주세요'
              aria-label={`문장 ${index + 1}`}
              aria-invalid={over || undefined}
              rows={2}
            />
            <div className='flex items-center gap-2'>
              <Input
                value={draft.page}
                onChange={(e) => update(index, { page: e.target.value })}
                inputMode='numeric'
                placeholder='쪽수 (선택)'
                aria-label={`문장 ${index + 1} 쪽수`}
                className='h-8 w-28'
              />
              <span
                className={`text-xs ${over ? 'text-destructive' : 'text-muted-foreground'}`}
                aria-live='polite'
              >
                {length}/{QUOTE_MAX_LENGTH}
              </span>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='ml-auto'
                aria-label={`문장 ${index + 1} 빼기`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <X className='size-3.5' aria-hidden />
              </Button>
            </div>
          </div>
        );
      })}

      {value.length < QUOTE_DRAFTS_MAX && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onChange([...value, { text: '', page: '' }])}
        >
          <Plus aria-hidden />
          문장 추가
        </Button>
      )}
    </div>
  );
};

/** 등록 버튼을 막을지 — 200자를 넘긴 칸이 있으면 저장 전에 알려 준다 */
export const hasInvalidQuoteDraft = (drafts: QuoteDraftInput[]) =>
  drafts.some(
    (draft) =>
      countQuoteChars(normalizeQuoteText(draft.text)) > QUOTE_MAX_LENGTH
  );
