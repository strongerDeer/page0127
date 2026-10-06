import { createAnonClient } from '@/shared/config/supabase/anon';

import { toRenderableSrc } from '../model/imageHost';
import { cacheAbout } from './aboutCache';

import type { ShelfBook } from '../model/coverRows';

import 'server-only';

type Row = {
  id: string;
  title: string;
  cover_image: string | null;
  spine_image: string | null;
};

const RECENT_LIMIT = 24;

/**
 * 최근 등록된 도서의 표지·책등 (1시간 캐시 — aboutCache 참고).
 *
 * 쿠키 없는 익명 클라이언트를 쓴다 — 결과를 캐시해 모든 방문자에게 같이 돌려주므로
 * 보는 사람의 세션이 섞이면 안 된다. global_books 는 책 정보(공개 데이터)다.
 */
const loadRecentBooks = async (): Promise<ShelfBook[]> => {
  const { data, error } = await createAnonClient()
    .from('global_books')
    .select('id, title, cover_image, spine_image')
    .not('cover_image', 'is', null)
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw new Error(error.message);

  // 그릴 수 없는 호스트(알라딘 잔존 등)는 여기서 비운다 — 화면에서 걸러서는 늦다
  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    coverImage: toRenderableSrc(r.cover_image, storage),
    spineImage: toRenderableSrc(r.spine_image, storage),
  }));
};

/** 표지 띠는 장식이다 — 실패하면 빈 목록(띠가 숨는다) */
export const getRecentBooks = cacheAbout('recent-books', loadRecentBooks, []);
