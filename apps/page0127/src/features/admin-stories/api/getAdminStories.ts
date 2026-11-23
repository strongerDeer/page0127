import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { toStory } from '@/entities/story/model/toStory';

import type { Story } from '@/entities/story';
import type { StoryRow } from '@/entities/story/model/toStory';

import 'server-only';

export type AdminStoryListItem = {
  id: string;
  slug: string;
  title: string;
  bookTitle: string;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminStory = Story & {
  isPublished: boolean;
};

/** 어드민 글 목록 — 초안 포함, 최근에 고친 것부터. 실패하면 null */
export async function getAdminStories(): Promise<AdminStoryListItem[] | null> {
  await assertAdmin();
  const { data, error } = await createAdminClient()
    .from('stories')
    .select(
      'id, slug, title, book_title, is_published, published_at, updated_at'
    )
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[admin] 책 이야기 목록 조회 실패:', error.message);
    return null;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    bookTitle: row.book_title as string,
    isPublished: Boolean(row.is_published),
    publishedAt: (row.published_at as string | null) ?? null,
    updatedAt: row.updated_at as string,
  }));
}

/** 편집할 글 한 편(초안 포함). 없으면 null */
export async function getAdminStory(id: string): Promise<AdminStory | null> {
  await assertAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await createAdminClient()
    .from('stories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`책 이야기 조회 실패: ${error.message}`);
  if (!data) return null;
  return {
    ...toStory(data as StoryRow),
    isPublished: Boolean((data as { is_published: boolean }).is_published),
  };
}
