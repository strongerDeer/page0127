import { unstable_cache } from 'next/cache';

import { createAnonClient } from '@/shared/config/supabase/anon';

import { HOME_SHELF_PICK_ISBNS } from '../config/picks';
import { fromGlobalBookRow, orderByIsbnList } from '../model/toShelfPick';

import type { PickRow } from '../model/toShelfPick';
import type { ShelfPick } from '../model/types';

import 'server-only';

const PICK_COLUMNS =
  'isbn, provider_item_id, title, author, publisher, cover_image, spine_image, pub_date, category, source';

/**
 * 실패하면 던진다 — unstable_cache 는 던진 결과를 저장하지 않으므로
 * 일시 오류가 한 시간 동안 빈 그리드로 굳지 않는다 (widgets/about/api/aboutCache.ts 와 같은 이유).
 * 쿠키 없는 anon 클라이언트: 모든 방문자에게 같은 결과를 돌려주므로 세션이 섞이면 안 된다.
 */
const loadPicks = async (): Promise<ShelfPick[]> => {
  const { data, error } = await createAnonClient()
    .from('global_books')
    .select(PICK_COLUMNS)
    .in('isbn', [...HOME_SHELF_PICK_ISBNS]);
  if (error) throw new Error(error.message);

  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return orderByIsbnList(
    (data as PickRow[] | null) ?? [],
    HOME_SHELF_PICK_ISBNS
  ).map((row) => fromGlobalBookRow(row, storage));
};

const cachedPicks = unstable_cache(loadPicks, ['shelf-preview', 'picks'], {
  revalidate: 3600,
});

/** 그리드가 비어도 검색·목표로 이어지므로 실패는 빈 목록으로 삼킨다 */
export const getShelfPicks = async (): Promise<ShelfPick[]> => {
  try {
    return await cachedPicks();
  } catch (error) {
    console.error(
      '[shelf-preview] 10권 조회 실패:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
};
