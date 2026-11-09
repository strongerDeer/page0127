'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@repo/ui';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  countQuoteChars,
  normalizeQuoteText,
  QUOTE_MAX_LENGTH,
} from '@/entities/quote';

import {
  addQuoteAction,
  deleteQuoteAction,
  updateQuoteAction,
} from '../api/quoteActions';

import type { BookQuote } from '@/entities/quote';

type BookQuotesSectionProps = {
  /** 문장은 기록(books.id)이 아니라 내 계정 + ISBN 에 붙는다 — 회독해도 한곳에 모인다 */
  isbn: string;
  quotes: BookQuote[];
};

/**
 * 책 상세 "간직한 문장" (Client Component) — 주인에게만 그린다.
 *
 * 페이지(서버)가 주인일 때만 문장을 조회해 넘기고, DB RLS 도 본인 행만 연다.
 * 그래서 이 컴포넌트는 "방문자면 숨기기"를 따로 하지 않는다 — 데이터가 오지 않으니까.
 *
 * + 문장 추가 → 입력칸이 열리고, 저장하면 목록 끝에 하나씩 쌓인다.
 * 저장 뒤 router.refresh() 로 서버 컴포넌트를 다시 그려 목록을 DB 와 맞춘다.
 */
export const BookQuotesSection = ({ isbn, quotes }: BookQuotesSectionProps) => {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className='mt-6'>
      <CardHeader className='flex flex-row items-center justify-between gap-3 space-y-0'>
        <CardTitle className='flex items-baseline gap-2'>
          간직한 문장
          {quotes.length > 0 && (
            <span className='text-sm font-normal text-muted-foreground'>
              {quotes.length}
            </span>
          )}
        </CardTitle>
        <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
          <Lock className='size-3' aria-hidden />
          나만 보여요
        </span>
      </CardHeader>

      <CardContent className='space-y-4'>
        {quotes.length === 0 && !adding && (
          <p className='text-sm text-muted-foreground'>
            마음에 남은 문장을 한 줄씩 적어 두세요.
          </p>
        )}

        {quotes.length > 0 && (
          <ul className='space-y-4'>
            {quotes.map((quote) =>
              editingId === quote.id ? (
                <li key={quote.id}>
                  <QuoteForm
                    initial={quote}
                    onDone={() => setEditingId(null)}
                    submit={(form) => {
                      form.set('id', quote.id);
                      return updateQuoteAction(form);
                    }}
                    successMessage='문장을 고쳤어요.'
                  />
                </li>
              ) : (
                <QuoteItem
                  key={quote.id}
                  quote={quote}
                  onEdit={() => {
                    setAdding(false);
                    setEditingId(quote.id);
                  }}
                />
              )
            )}
          </ul>
        )}

        {adding ? (
          <QuoteForm
            onDone={() => setAdding(false)}
            submit={(form) => {
              form.set('isbn', isbn);
              return addQuoteAction(form);
            }}
            successMessage='문장을 간직했어요.'
          />
        ) : (
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
          >
            <Plus aria-hidden />
            문장 추가
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

type QuoteItemProps = { quote: BookQuote; onEdit: () => void };

const QuoteItem = ({ quote, onEdit }: QuoteItemProps) => {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () =>
    startTransition(async () => {
      const result = await deleteQuoteAction(quote.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('문장을 지웠어요.');
      router.refresh();
    });

  return (
    <li className='group border-l-2 border-line pl-4'>
      <blockquote className='whitespace-pre-wrap break-keep text-foreground'>
        {quote.text}
      </blockquote>
      <div className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'>
        {quote.page && <span className='mr-1'>p. {quote.page}</span>}
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label='문장 고치기'
          onClick={onEdit}
        >
          <Pencil className='size-3.5' aria-hidden />
        </Button>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label='문장 지우기'
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          <Trash2 className='size-3.5' aria-hidden />
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 문장을 지울까요?</AlertDialogTitle>
            <AlertDialogDescription>
              지운 문장은 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={handleDelete}>
              지우기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};

type QuoteFormProps = {
  initial?: BookQuote;
  submit: (form: FormData) => Promise<{ ok: boolean; message?: string }>;
  onDone: () => void;
  successMessage: string;
};

const QuoteForm = ({
  initial,
  submit,
  onDone,
  successMessage,
}: QuoteFormProps) => {
  const router = useRouter();
  const [text, setText] = useState(initial?.text ?? '');
  const [pending, startTransition] = useTransition();

  // 서버와 같은 기준(정리한 뒤 코드 포인트 수)으로 센다 — 카운터와 서버 판정이 어긋나지 않게
  const length = countQuoteChars(normalizeQuoteText(text));
  const over = length > QUOTE_MAX_LENGTH;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submit(form);
      if (!result.ok) {
        toast.error(result.message ?? '다시 시도해 주세요.');
        return;
      }
      toast.success(successMessage);
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-2'>
      <Textarea
        name='text'
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder='마음에 남은 문장을 적어 주세요'
        aria-label='문장'
        aria-invalid={over || undefined}
        autoFocus
        rows={3}
      />
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          name='page'
          defaultValue={initial?.page ?? ''}
          inputMode='numeric'
          placeholder='쪽수 (선택)'
          aria-label='쪽수'
          className='h-8 w-28'
        />
        <span
          className={`text-xs ${over ? 'text-destructive' : 'text-muted-foreground'}`}
          aria-live='polite'
        >
          {length}/{QUOTE_MAX_LENGTH}
        </span>
        <div className='ml-auto flex gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onDone}
            disabled={pending}
          >
            취소
          </Button>
          <Button
            type='submit'
            size='sm'
            disabled={pending || over || length === 0}
          >
            {pending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>
    </form>
  );
};
