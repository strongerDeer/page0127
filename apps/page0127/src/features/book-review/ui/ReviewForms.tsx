'use client';

import { useActionState } from 'react';

import { Button, Input, Label, Textarea } from '@repo/ui';

import { resubmitBook, reviewBook } from '../api/actions';

import type { BookReview } from '../model/review';

const initialState = { ok: false, message: '' };
export const ReviewDecisionForm = ({ book }: { book: BookReview }) => {
  const [state, action, pending] = useActionState(reviewBook, initialState);
  return (
    <form action={action} className='space-y-3'>
      <input type='hidden' name='id' value={book.id} />
      <input type='hidden' name='version' value={book.review_version} />
      <Label htmlFor={`note-${book.id}`}>검수 사유 · 보완할 내용</Label>
      <Textarea
        id={`note-${book.id}`}
        name='note'
        maxLength={1000}
        placeholder='승인 외 처리에는 사유가 필요해요. 등록한 사람에게 표시됩니다.'
      />
      <div className='flex flex-wrap gap-2'>
        <Button name='decision' value='approved' disabled={pending}>
          승인
        </Button>
        <Button
          name='decision'
          value='needs_changes'
          variant='outline'
          disabled={pending}
        >
          보완 요청
        </Button>
        <Button
          name='decision'
          value='rejected'
          variant='outline'
          disabled={pending}
        >
          반려
        </Button>
      </div>
      {state.message && (
        <p role={state.ok ? 'status' : 'alert'} className='text-sm'>
          {state.message}
        </p>
      )}
    </form>
  );
};
export const SubmissionEditForm = ({ book }: { book: BookReview }) => {
  const [state, action, pending] = useActionState(resubmitBook, initialState);
  return (
    <form action={action} className='space-y-3'>
      <input type='hidden' name='id' value={book.id} />
      <input type='hidden' name='version' value={book.review_version} />
      {(
        [
          ['title', '책 제목', book.title],
          ['author', '저자', book.author],
          ['publisher', '출판사', book.publisher],
          ['source_url', '확인할 수 있는 출처 주소', book.source_url],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className='space-y-1'>
          <Label htmlFor={`${book.id}-${name}`}>{label}</Label>
          <Input
            id={`${book.id}-${name}`}
            name={name}
            defaultValue={value ?? ''}
            required={name === 'title' || name === 'author'}
            maxLength={name === 'source_url' ? 2000 : 200}
            type={name === 'source_url' ? 'url' : 'text'}
          />
        </div>
      ))}
      <Button disabled={pending}>수정 후 다시 검수 요청</Button>
      {state.message && (
        <p role={state.ok ? 'status' : 'alert'} className='text-sm'>
          {state.message}
        </p>
      )}
    </form>
  );
};
