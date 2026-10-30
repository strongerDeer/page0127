'use client';

import { useId, useRef, useState } from 'react';

import {
  BookCover,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@repo/ui';
import { Search, X } from 'lucide-react';

import { searchBooks } from '@/shared/api/book';

import {
  randomEnvelopeWording,
  type ReadingEnvelopeKind,
} from '@/entities/notification/model/readingNudge';

import type { SendEnvelopeInput } from '@/entities/notification/api/readingNudge';
import type { ProviderBook } from '@/shared/api/book-provider';

const labels = {
  recommendation: '책 추천',
  invitation: '같이 읽기',
  note: '한마디',
} as const;
export type NudgeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  context?: 'ahead' | 'behind' | 'tied';
  loading?: boolean;
  sending?: boolean;
  sent?: boolean;
  error?: string;
  loadFailed?: boolean;
  onRetry?: () => void;
  onSend: (input: SendEnvelopeInput) => void;
  onSearch?: typeof searchBooks;
};
export const NudgeDialog = ({
  open,
  onOpenChange,
  recipientName,
  loading,
  sending,
  sent,
  error,
  loadFailed,
  onRetry,
  onSend,
  onSearch = searchBooks,
}: NudgeDialogProps) => {
  const id = useId();
  const [kind, setKind] = useState<ReadingEnvelopeKind>('recommendation');
  const [drafts, setDrafts] = useState(
    () =>
      Object.fromEntries(
        Object.keys(labels).map((key) => [
          key,
          {
            message: randomEnvelopeWording(key as ReadingEnvelopeKind),
            book: null as ProviderBook | null,
          },
        ])
      ) as Record<
        ReadingEnvelopeKind,
        { message: string; book: ProviderBook | null }
      >
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProviderBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const request = useRef(0);
  const draft = drafts[kind];
  const disabled = Boolean(sending || loading || sent || loadFailed);
  const patchDraft = (value: Partial<typeof draft>) =>
    setDrafts((previous) => ({
      ...previous,
      [kind]: { ...previous[kind], ...value },
    }));
  const search = async () => {
    const text = query.trim();
    if (!text || disabled) return;
    const version = ++request.current;
    setSearching(true);
    setSearchError('');
    setSearched(true);
    try {
      const result = await onSearch(text, { maxResults: 10 });
      if (version === request.current)
        setResults(result.items.filter((book) => /^\d{13}$/.test(book.isbn)));
    } catch {
      if (version === request.current) {
        setResults([]);
        setSearchError('책을 찾지 못했어요. 다시 검색해 주세요.');
      }
    } finally {
      if (version === request.current) setSearching(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!sending) onOpenChange(value);
      }}
    >
      <DialogContent className='max-h-[calc(100dvh-2rem)] sm:max-w-md overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='pr-6 text-left break-all'>
            {recipientName}님 콕 찌르기
          </DialogTitle>
          <DialogDescription className='text-left'>
            책 한 권, 또는 가벼운 한마디를 전해요.
          </DialogDescription>
        </DialogHeader>
        <div
          className='flex rounded-lg bg-muted p-1'
          role='group'
          aria-label='콕 찌르기 종류'
        >
          {Object.entries(labels).map(([value, label]) => (
            <Button
              key={value}
              type='button'
              size='sm'
              variant={kind === value ? 'default' : 'ghost'}
              className='flex-1'
              disabled={disabled}
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value as ReadingEnvelopeKind);
                request.current++;
                setResults([]);
                setQuery('');
                setSearched(false);
                setSearching(false);
                setSearchError('');
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <form
          className='space-y-5'
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !disabled &&
              draft.message.trim() &&
              (kind === 'note' || draft.book)
            )
              onSend({
                kind,
                message: draft.message.trim(),
                bookIsbn: draft.book?.isbn ?? null,
              });
          }}
        >
          <div>
            <label
              htmlFor={`${id}-message`}
              className='mb-2 block text-sm font-medium'
            >
              전할 한마디
            </label>
            <Textarea
              id={`${id}-message`}
              rows={3}
              maxLength={200}
              required
              disabled={disabled}
              value={draft.message}
              onChange={(e) => patchDraft({ message: e.target.value })}
              className='resize-y'
            />
            <p className='mt-1 text-right text-xs text-text-subtle'>
              {draft.message.length}/200
            </p>
          </div>
          <div>
            <p className='mb-2 text-sm font-medium'>
              {kind === 'note' ? '함께 보낼 책 (선택)' : '함께 보낼 책'}
            </p>
            {draft.book ? (
              <div className='flex items-center gap-3 rounded-xl border border-line p-3'>
                <BookCover
                  src={draft.book.coverImage}
                  title={draft.book.title}
                  size='sm'
                />
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold break-words'>
                    {draft.book.title}
                  </p>
                  <p className='text-xs text-text-subtle'>
                    {draft.book.author}
                  </p>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  aria-label='책 선택 취소'
                  disabled={disabled}
                  onClick={() => patchDraft({ book: null })}
                >
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <>
                <div className='flex gap-2'>
                  <Input
                    aria-label='책 제목이나 저자 검색'
                    placeholder='책 제목이나 저자'
                    value={query}
                    disabled={disabled}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void search();
                      }
                    }}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    aria-label='책 검색'
                    disabled={disabled || !query.trim()}
                    loading={searching}
                    onClick={() => void search()}
                  >
                    <Search size={18} />
                  </Button>
                </div>
                {searchError && (
                  <p role='alert' className='mt-2 text-sm'>
                    {searchError}
                  </p>
                )}
                {searched && !searching && !searchError && !results.length && (
                  <p role='status' className='mt-2 text-sm text-text-subtle'>
                    검색 결과가 없어요. 다른 제목으로 찾아보세요.
                  </p>
                )}
                <ul className='mt-2 max-h-60 space-y-1 overflow-y-auto'>
                  {results.map((book) => (
                    <li key={book.isbn}>
                      <button
                        type='button'
                        disabled={disabled}
                        className='flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary'
                        onClick={() => {
                          patchDraft({ book });
                          setResults([]);
                        }}
                      >
                        <BookCover
                          src={book.coverImage}
                          title={book.title}
                          size='sm'
                        />
                        <span className='min-w-0 text-sm'>
                          <span className='block font-semibold'>
                            {book.title}
                          </span>
                          <span className='text-xs text-text-subtle'>
                            {book.author}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {loading && (
            <p role='status' className='text-sm'>
              전송 가능 여부를 확인하고 있어요.
            </p>
          )}
          {sent && (
            <p role='status' className='text-sm text-primary'>
              오늘은 이미 보냈어요. 내일 다시 만나요.
            </p>
          )}
          {error && (
            <p role='alert' className='text-sm'>
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
            loading={sending}
            disabled={
              disabled ||
              !draft.message.trim() ||
              (kind !== 'note' && !draft.book)
            }
          >
            {labels[kind]} 보내기
          </Button>
          <p className='text-xs leading-relaxed text-text-subtle'>
            같은 상대에게 하루 한 번 · 고른 책은 내 서재에 자동 등록되지 않아요.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
