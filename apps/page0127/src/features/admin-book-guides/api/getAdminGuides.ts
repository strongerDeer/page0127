import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { applyTokenSearch } from '@/shared/lib/tokenSearch';

import { parseBookGuideSections } from '@/entities/book-guide';

import type { BookGuideSection } from '@/entities/book-guide';

export type AdminGuideRow = {
  globalBookId: string;
  title: string;
  status: 'draft' | 'published';
  updatedAt: string;
};

export type AdminBookHit = { id: string; title: string; author: string | null };

type GuideJoinRow = {
  global_book_id: string;
  status: 'draft' | 'published';
  updated_at: string;
  global_books: { title: string } | null;
};

/** 만들어 둔 가이드 목록(발행·초안 모두) — 최근 고친 순 */
export const getAdminGuides = async (): Promise<AdminGuideRow[]> => {
  await assertAdmin();
  const { data, error } = await createAdminClient()
    .from('book_guides')
    .select('global_book_id, status, updated_at, global_books(title)')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as GuideJoinRow[]).map((row) => ({
    globalBookId: row.global_book_id,
    title: row.global_books?.title ?? '(책 없음)',
    status: row.status,
    updatedAt: row.updated_at,
  }));
};

/** 가이드를 붙일 책 찾기 — 전체 도서(global_books)에서 제목·저자 단어 검색 */
export const searchGuideBooks = async (q: string): Promise<AdminBookHit[]> => {
  await assertAdmin();
  if (!q.trim()) return [];
  const { data, error } = await applyTokenSearch(
    createAdminClient().from('global_books').select('id, title, author'),
    q,
    ['title', 'author']
  ).limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminBookHit[];
};

export type AdminGuideDetail = {
  book: { id: string; title: string };
  status: 'draft' | 'published';
  /** 저장된 값이 깨졌으면 null — 편집기는 빈 상태로 열고 원본은 rawSections 로 보여 준다 */
  sections: BookGuideSection[] | null;
  rawSections: unknown;
};

/** 편집기용 — 책 하나와 그 가이드(초안 포함). 책이 없으면 null */
export const getAdminGuide = async (
  globalBookId: string
): Promise<AdminGuideDetail | null> => {
  await assertAdmin();
  const client = createAdminClient();
  const [book, guide] = await Promise.all([
    client
      .from('global_books')
      .select('id, title')
      .eq('id', globalBookId)
      .maybeSingle(),
    client
      .from('book_guides')
      .select('status, sections')
      .eq('global_book_id', globalBookId)
      .maybeSingle(),
  ]);
  if (book.error) throw new Error(book.error.message);
  if (guide.error) throw new Error(guide.error.message);
  if (!book.data) return null;

  return {
    book: book.data as { id: string; title: string },
    status: (guide.data?.status as 'draft' | 'published') ?? 'draft',
    sections: guide.data ? parseBookGuideSections(guide.data.sections) : [],
    rawSections: guide.data?.sections ?? [],
  };
};
