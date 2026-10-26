'use client';

import { useId, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';

import { READING_NUDGE_MESSAGES } from '@/entities/notification/model/readingNudge';
import { BookEnvelopeArtwork } from '@/entities/notification/ui/BookEnvelopeArtwork';

import type {
  NudgeBook,
  ReadingNudgeMessage,
} from '@/entities/notification/model/readingNudge';

export type NudgeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  books: NudgeBook[];
  context: 'ahead' | 'behind' | 'tied';
  loading?: boolean;
  sending?: boolean;
  sent?: boolean;
  error?: string;
  loadFailed?: boolean;
  onRetry?: () => void;
  onSend: (message: ReadingNudgeMessage, bookId: string | null) => void;
};
export const NudgeDialog = ({
  open,
  onOpenChange,
  recipientName,
  books,
  context,
  loading = false,
  sending = false,
  sent = false,
  error,
  loadFailed = false,
  onRetry,
  onSend,
}: NudgeDialogProps) => {
  const [message, setMessage] = useState<ReadingNudgeMessage>('together');
  const [bookId, setBookId] = useState('');
  const id = useId();
  const situation: ReadingNudgeMessage =
    context === 'ahead' ? 'chase' : context === 'behind' ? 'wait' : 'next';
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!sending) onOpenChange(value);
      }}
    >
      <DialogContent className='max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto rounded-3xl'>
        <DialogHeader>
          <div className='flex items-center gap-4 pr-4 text-left'>
            <span className='shrink-0'>
              <BookEnvelopeArtwork compact />
            </span>
            <div className='min-w-0 space-y-2'>
              <DialogTitle className='break-all leading-snug'>
                {recipientName}님께 책 봉투
              </DialogTitle>
              <DialogDescription>
                책 한 권과 한마디를 정성껏 전해드릴게요.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          className='space-y-5'
          onSubmit={(event) => {
            event.preventDefault();
            onSend(message, bookId || null);
          }}
        >
          <fieldset
            disabled={sending || loading || sent || loadFailed}
            className='space-y-2'
          >
            <legend className='mb-2 text-sm font-medium'>
              어떤 말을 보낼까요?
            </legend>
            {(['together', situation, 'reading'] as const).map((key) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${message === key ? 'border-primary bg-accent' : 'border-line'}`}
              >
                <input
                  type='radio'
                  name={`${id}-message`}
                  value={key}
                  checked={message === key}
                  onChange={() => setMessage(key)}
                  className='accent-primary'
                />
                {READING_NUDGE_MESSAGES[key]}
              </label>
            ))}
          </fieldset>
          <div>
            <label
              htmlFor={`${id}-book`}
              className='mb-2 block text-sm font-medium'
            >
              책 한 권도 함께 보낼까요?{' '}
              <span className='font-normal text-text-subtle'>(선택)</span>
            </label>
            <select
              id={`${id}-book`}
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              disabled={loading || sending || sent || loadFailed}
              className='w-full rounded-lg border border-line bg-card p-3 text-sm'
            >
              <option value=''>한마디만 보내기</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
            {bookId && (
              <p className='mt-2 rounded-lg bg-accent px-3 py-2 text-sm text-text-body'>
                함께 보낼 책 · {books.find((book) => book.id === bookId)?.title}
              </p>
            )}
            <p className='mt-2 text-xs text-text-subtle'>
              내 공개 기록 중 읽는 중·완독 책을 첨부할 수 있어요.
            </p>
          </div>
          {loading && (
            <p role='status' className='text-sm text-text-subtle'>
              보낼 수 있는 기록을 확인하고 있어요.
            </p>
          )}
          {sent && (
            <p role='status' className='text-sm text-primary'>
              오늘은 이미 콕 찔렀어요. 내일 다시 만나요.
            </p>
          )}
          {error && (
            <p role='alert' className='text-sm text-text-body'>
              {error}
            </p>
          )}
          {loadFailed && (
            <Button type='button' variant='outline' onClick={onRetry}>
              다시 불러오기
            </Button>
          )}
          <Button
            type='submit'
            className='w-full'
            disabled={loading || sent || loadFailed}
            loading={sending}
          >
            {bookId ? '책 봉투 보내기' : '콕 찌르기 보내기'}
          </Button>
          <p className='text-xs leading-relaxed text-text-subtle'>
            앱 내 알림으로 전달 · 같은 상대에게 서울 기준 하루 한 번<br />
            받는 사람은 설정에서 콕 찌르기 알림을 끌 수 있어요.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
