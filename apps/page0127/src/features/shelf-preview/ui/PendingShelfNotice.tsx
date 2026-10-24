'use client';

import { useEffect, useState } from 'react';

import { CoverImage } from '@repo/ui';

import { toRenderableSrc } from '@/shared/lib/imageHost';

import { toLoginNotice } from '../model/loginNotice';
import {
  encodeShelfTransfer,
  SHELF_TRANSFER_PARAM,
} from '../model/loginTransfer';
import {
  type PendingShelf,
  readPendingShelf,
  writePendingShelf,
} from '../model/pendingShelf';
import {
  preferLocalSelection,
  type TransferResult,
} from '../model/resolveTransfer';

/** 표지는 몇 장만 — 많으면 로그인 버튼보다 눈에 띈다 */
const MAX_COVERS = 4;

/**
 * 로그인 화면 위쪽에서 "무엇을 하러 왔는지" 이어 준다.
 * 맛보기에서 고른 책·목표가 보관돼 있을 때만 보이고, 없으면 아무것도 그리지 않는다.
 */
export const PendingShelfNotice = ({
  transfer,
}: {
  transfer?: TransferResult | null;
}) => {
  const [pending, setPending] = useState<PendingShelf | null>(
    transfer?.pending ?? null
  );
  const [storageFailed, setStorageFailed] = useState(false);
  const [failed, setFailed] = useState(transfer?.failed ?? 0);

  // 저장소는 브라우저에만 있다 — 서버 렌더 때는 읽을 수 없어 마운트 후 한 번 읽는다
  useEffect(() => {
    const local = readPendingShelf();
    const result = transfer ? preferLocalSelection(transfer, local) : null;
    const next = result ? result.pending : local;
    if (
      result?.pending &&
      !writePendingShelf(result.pending, result.pending.savedAt)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 브라우저의 저장소 접근 실패를 알린다
      setStorageFailed(true);
    }
    setFailed(result?.failed ?? 0);
    setPending(next);
    // 이전 버전의 보관분이나 /login 직접 진입도 외부 브라우저에 가져갈 수 있게 한다.
    if (next && !transfer) {
      const url = new URL(window.location.href);
      try {
        url.searchParams.set(
          SHELF_TRANSFER_PARAM,
          encodeShelfTransfer(next, next.savedAt)
        );
        window.history.replaceState(
          null,
          '',
          `${url.pathname}${url.search}${url.hash}`
        );
      } catch {
        /* 오래된 보관분은 현재 브라우저에서 계속 쓸 수 있다 */
      }
    }
  }, [transfer]);

  const notice = toLoginNotice(pending);
  if (storageFailed)
    return (
      <p role='alert' className='mb-4 text-sm text-destructive'>
        선택한 책을 보관하지 못했어요. 브라우저의 저장 공간을 허용한 뒤
        새로고침해 주세요.
      </p>
    );
  if (!pending || !notice)
    return failed ? (
      <p role='alert' className='mb-4 text-sm text-destructive'>
        선택한 책을 불러오지 못했어요. 새로고침하거나 원래 화면에서 다시 선택해
        주세요.
      </p>
    ) : null;

  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const covers = pending.books
    .map((b) => ({
      isbn: b.isbn,
      src: toRenderableSrc(b.cover_image, storage),
    }))
    .filter((c) => c.src)
    .slice(0, MAX_COVERS);
  const rest = pending.books.length - covers.length;

  return (
    <div className='mb-5 space-y-2'>
      {failed > 0 && (
        <p role='alert' className='text-sm text-destructive'>
          {failed}권을 불러오지 못했어요. 아래에는 불러온 책만 표시돼요.
          새로고침하거나 원래 화면에서 다시 선택해 주세요.
        </p>
      )}
      <div className='flex items-center gap-3 rounded-xl bg-accent px-4 py-3'>
        {covers.length > 0 && (
          <div aria-hidden='true' className='flex shrink-0 -space-x-3'>
            {covers.map((c) => (
              <CoverImage
                key={c.isbn}
                src={c.src}
                alt=''
                width={28}
                height={42}
                className='h-10.5 w-7 rounded-sm object-cover shadow ring-2 ring-accent'
              />
            ))}
            {rest > 0 && (
              <span className='flex h-10.5 w-7 items-center justify-center rounded-sm bg-card text-[10px] font-bold text-text-subtle ring-2 ring-accent'>
                +{rest}
              </span>
            )}
          </div>
        )}
        <p className='break-keep text-left text-sm font-medium text-text-strong'>
          {notice}
        </p>
      </div>
    </div>
  );
};
