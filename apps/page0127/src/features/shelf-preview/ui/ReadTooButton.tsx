'use client';
import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { BookCheck } from 'lucide-react';
import { toast } from 'sonner';

import { type Book, bookApi } from '@/entities/book';
import {
  type CompletedReadingInput,
  CompleteReadingForm,
} from '@/entities/book/ui/CompleteReadingForm';

import { addPendingBook } from '../model/addPendingBook';
import { toBookInput } from '../model/claim';
import { toPendingLoginPath } from '../model/loginTransfer';
import { readPendingShelf, writePendingShelf } from '../model/pendingShelf';

import type { PendingBook } from '../model/types';

export const ReadTooButton = ({
  book,
  isLoggedIn,
}: {
  book: PendingBook;
  isLoggedIn: boolean;
}) => {
  const router = useRouter();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<Book | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const showForm = async () => {
    setError('');
    setCheckFailed(false);
    setOpen(true);
    if (!isLoggedIn) return;
    setChecking(true);
    try {
      const records = await bookApi.getBookByISBN(
        book.isbn,
        book.provider_item_id
      );
      setExisting(
        records.find((record) => record.status === 'completed') ??
          records.find((record) => record.status === 'reading') ??
          records[0] ??
          null
      );
    } catch {
      setCheckFailed(true);
      setError('내 기록을 확인하지 못했어요. 다시 열어 주세요.');
    } finally {
      setChecking(false);
    }
  };
  const save = async (value: CompletedReadingInput) => {
    if (busy || checking || checkFailed) return;
    setBusy(true);
    try {
      const completion = {
        completed_date: value.completedDate,
        completed_year: value.completedYear,
        rating: value.rating ?? undefined,
        is_public: value.isPublic,
      };
      if (!isLoggedIn) {
        const pending = addPendingBook(readPendingShelf(), {
          ...book,
          status: 'completed',
          completion: value,
        });
        if (!writePendingShelf(pending))
          throw new Error('기록을 임시 보관하지 못했어요.');
        router.push(toPendingLoginPath(pending, window.location.pathname));
        return;
      }
      if (existing?.status === 'completed') return;
      if (existing)
        await bookApi.updateBook(existing.id, {
          status: 'completed',
          ...completion,
        });
      else
        await bookApi.createBook({
          ...toBookInput(book),
          status: 'completed',
          ...completion,
        });
      await cache.invalidateQueries();
      router.refresh();
      setOpen(false);
      toast.success('내 완독 기록을 저장했어요.');
    } catch {
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        variant='outline'
        className='gap-2'
        onClick={() => void showForm()}
      >
        <BookCheck aria-hidden className='size-4' />
        나도 읽었어요
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl'>
          <DialogTitle>내 완독 기록</DialogTitle>
          <DialogDescription>{book.title}</DialogDescription>
          {checking ? (
            <p role='status'>내 서재를 확인하고 있어요.</p>
          ) : existing?.status === 'completed' ? (
            <>
              <p>이미 내 서재에 완독 기록이 있어요.</p>
              <Button onClick={() => router.push(`/books/${existing.id}`)}>
                내 기록 보기
              </Button>
            </>
          ) : (
            <>
              {!isLoggedIn && (
                <p className='text-sm text-text-subtle'>
                  입력한 기록은 로그인 후 내 서재에 저장돼요.
                </p>
              )}
              {checkFailed && (
                <Button variant='outline' onClick={() => void showForm()}>
                  내 기록 다시 확인
                </Button>
              )}
              <CompleteReadingForm
                key={existing?.id ?? 'new'}
                initialIsPublic={existing?.is_public ?? true}
                busy={busy || checkFailed}
                error={error}
                onCancel={() => setOpen(false)}
                onSubmit={(value) => {
                  setError('');
                  void save(value);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
