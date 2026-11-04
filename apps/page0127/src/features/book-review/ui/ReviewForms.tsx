'use client';

import { useActionState, useState } from 'react';

import { Button, Input, Label, Textarea } from '@repo/ui';

import { deleteCatalogBook, resubmitBook, reviewBook } from '../api/actions';

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
/**
 * 강제 삭제 — 실수로 누르지 않게 두 번 누르게 한다.
 * 기록한 사람 수(readingCount)를 보여 줘서 누구 기록까지 사라지는지 알고 지우게 한다.
 */
export const DeleteCatalogBookForm = ({
  bookId,
  readingCount,
}: {
  bookId: string;
  readingCount: number;
}) => {
  const [state, action, pending] = useActionState(
    deleteCatalogBook,
    initialState
  );
  const [confirming, setConfirming] = useState(false);
  if (state.ok) {
    return (
      <p role='status' className='text-sm'>
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className='space-y-2 border-t border-line pt-3'>
      <input type='hidden' name='id' value={bookId} />
      {confirming ? (
        <>
          <p className='text-sm text-destructive'>
            공용 도서와 이 책의 독서 기록 {readingCount}개(모든 사용자)가 함께
            지워지고 되돌릴 수 없어요.
          </p>
          <div className='flex gap-2'>
            <Button variant='destructive' size='sm' disabled={pending}>
              {pending ? '삭제 중…' : '영구 삭제'}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              취소
            </Button>
          </div>
        </>
      ) : (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-destructive'
          onClick={() => setConfirming(true)}
        >
          강제 삭제
        </Button>
      )}
      {state.message && (
        <p role='alert' className='text-sm'>
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
