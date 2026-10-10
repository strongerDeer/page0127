'use client';

import { useEffect, useState } from 'react';

import { CoverImage } from '@repo/ui';

import { toRenderableSrc } from '@/shared/lib/imageHost';

import { toLoginNotice } from '../model/loginNotice';
import { type PendingShelf, readPendingShelf } from '../model/pendingShelf';

/** 표지는 몇 장만 — 많으면 로그인 버튼보다 눈에 띈다 */
const MAX_COVERS = 4;

/**
 * 로그인 화면 위쪽에서 "무엇을 하러 왔는지" 이어 준다.
 * 맛보기에서 고른 책·목표가 보관돼 있을 때만 보이고, 없으면 아무것도 그리지 않는다.
 */
export const PendingShelfNotice = () => {
  const [pending, setPending] = useState<PendingShelf | null>(null);

  // 저장소는 브라우저에만 있다 — 서버 렌더 때는 읽을 수 없어 마운트 후 한 번 읽는다
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 마운트 후에만 읽힌다
    setPending(readPendingShelf());
  }, []);

  const notice = toLoginNotice(pending);
  if (!pending || !notice) return null;

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
    <div className='mb-5 flex items-center gap-3 rounded-xl bg-accent px-4 py-3'>
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
  );
};
