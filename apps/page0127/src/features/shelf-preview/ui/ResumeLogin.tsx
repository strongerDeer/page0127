'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui';

import {
  clearPendingShelf,
  readPendingShelf,
  writePendingShelf,
} from '../model/pendingShelf';
import {
  preferLocalSelection,
  type TransferResult,
} from '../model/resolveTransfer';

/** 이미 로그인된 브라우저에서는 책을 보여 주고 확인받는다. 링크 열기만으로 기록을 쓰지 않는다. */
export const ResumeLogin = ({
  transfer,
  destination,
}: {
  transfer: TransferResult;
  destination: string;
}) => {
  const router = useRouter();
  const [result, setResult] = useState(transfer);
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기존 브라우저의 원본 선택은 마운트 후에 읽는다
    setResult(preferLocalSelection(transfer, readPendingShelf()));
  }, [transfer]);

  const handleContinue = () => {
    if (!result.pending || result.failed > 0) return;
    if (!writePendingShelf(result.pending, result.pending.savedAt)) {
      setStorageFailed(true);
      return;
    }
    router.replace(destination);
  };
  const pending = result.pending;
  const handleCancel = () => {
    const local = readPendingShelf();
    // 이 선택과 일치하는 보관분만 버린다. 홈으로 간 뒤 자동 담기가 실행되지 않게 한다.
    if (local && preferLocalSelection(transfer, local).pending === local)
      clearPendingShelf();
  };
  const failed = storageFailed || result.failed > 0 || !pending;
  return (
    <div className='mx-auto max-w-md space-y-4 px-4 py-16'>
      <h1 className='heading-2'>
        {failed
          ? '선택한 책을 확인해 주세요'
          : '선택한 내용을 내 서재에 저장할까요?'}
      </h1>
      {failed ? (
        <>
          <p role='alert' className='text-sm text-text-subtle'>
            {storageFailed
              ? '브라우저의 저장 공간을 허용한 뒤 다시 시도해 주세요.'
              : '일부 선택을 불러오지 못했어요. 다시 시도하거나 홈에서 책을 확인해 주세요.'}
          </p>
          <Button onClick={() => window.location.reload()}>다시 시도</Button>
          <Link
            href='/'
            onClick={handleCancel}
            className='ml-4 text-sm underline'
          >
            홈으로
          </Link>
        </>
      ) : (
        pending && (
          <>
            <p className='text-sm text-text-subtle'>
              이미 로그인되어 있어요. 저장할 내용을 확인해 주세요.
            </p>
            {pending.books.length > 0 && (
              <ul className='max-h-72 list-inside list-disc overflow-y-auto text-sm'>
                {pending.books.map((book) => (
                  <li key={book.isbn}>
                    {book.title} ·{' '}
                    {book.status === 'want_to_read' ? '읽고 싶은 책' : '완독'}
                  </li>
                ))}
              </ul>
            )}
            {pending.goal && (
              <p>
                {pending.goal.year}년 독서 목표 {pending.goal.target}권
              </p>
            )}
            <Button onClick={handleContinue}>내 서재에 저장하기</Button>
            <Link
              href='/'
              onClick={handleCancel}
              className='ml-4 text-sm underline'
            >
              취소
            </Link>
          </>
        )
      )}
    </div>
  );
};
