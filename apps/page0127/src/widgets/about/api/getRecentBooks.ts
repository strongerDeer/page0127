import { createAnonClient } from '@/shared/config/supabase/anon';

import { toRenderableSrc } from '../model/imageHost';

import type { ShelfBook } from '../model/coverRows';

import 'server-only';

type Row = {
  id: string;
  title: string;
  cover_image: string | null;
  spine_image: string | null;
};

/**
 * 최근 등록된 도서의 표지·책등.
 *
 * 쿠키 없는 익명 클라이언트를 쓴다 — server.ts 의 createClient 는 cookies() 를 읽어
 * 페이지를 동적 렌더로 바꾸므로 revalidate(정적 생성)가 무력해진다.
 * global_books 는 책 정보(공개 데이터)라 사용자 기록이 섞이지 않는다.
 */
export const getRecentBooks = async (limit = 24): Promise<ShelfBook[]> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('global_books')
    .select('id, title, cover_image, spine_image')
    .not('cover_image', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // 표지 띠는 장식이다 — 실패해도 페이지는 그린다
    console.error('[about] 최근 도서 조회 실패:', error.message);
    return [];
  }

  // 그릴 수 없는 호스트(알라딘 잔존 등)는 여기서 비운다 — 화면에서 걸러서는 늦다
  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    coverImage: toRenderableSrc(r.cover_image, storage),
    spineImage: toRenderableSrc(r.spine_image, storage),
  }));
};
