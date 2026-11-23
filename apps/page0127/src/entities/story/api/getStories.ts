import { unstable_cache } from 'next/cache';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

import { createAnonClient } from '@/shared/config/supabase/anon';
import { STORIES_CACHE_TAG } from '@/shared/lib/cache/cacheTags';

import {
  STORY_COLUMNS,
  STORY_SUMMARY_COLUMNS,
  toStory,
  toStorySummary,
} from '../model/toStory';

import type { StoryRow } from '../model/toStory';
import type { Story, StorySummary } from '../model/types';

import 'server-only';

/**
 * 공개된 책 이야기 읽기 — 쿠키 없는 anon 클라이언트 + RLS(공개 글만).
 *
 * 왜 unstable_cache 인가: 목록 하나를 /blog·책 정보 카드·사이트맵이 함께 쓴다.
 * 책 정보 페이지는 수천 권이라, 페이지마다 DB 를 부르지 않고 이 캐시 한 벌을 나눠 본다.
 * 어드민이 저장하면 태그로 지우므로(revalidateStoryPages) 하루 캐시여도 바로 바뀐다.
 *
 * 실패하면 던진다 — unstable_cache 는 던진 결과를 저장하지 않고,
 * ISR 페이지는 다시 만들다 실패하면 지난 판을 계속 보여 준다(빈 목록으로 굳지 않는다).
 * 단, 빌드 중에는 글이 없는 것으로 친다 — Supabase 주소가 없는 빌드(CI 타입 검사)나
 * 아직 stories 테이블이 없는 DB(마이그레이션 push 전)에서 빌드 자체가 깨지지 않게.
 * 그때 빠진 페이지는 첫 방문 때 만들어진다(dynamicParams).
 */
const isBuildPhase = () => process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

const hasSupabaseEnv = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

const ONE_DAY = 86400;

const loadPublishedStories = async (): Promise<StorySummary[]> => {
  const { data, error } = await createAnonClient()
    .from('stories')
    .select(STORY_SUMMARY_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data as StoryRow[] | null) ?? []).map(toStorySummary);
};

const cachedPublishedStories = unstable_cache(
  loadPublishedStories,
  ['stories-published'],
  { revalidate: ONE_DAY, tags: [STORIES_CACHE_TAG] }
);

/** 공개 글 목록(최신순, 본문 없음). DB 오류는 던진다 */
export const getPublishedStories = async (): Promise<StorySummary[]> => {
  if (!hasSupabaseEnv()) return [];
  try {
    return await cachedPublishedStories();
  } catch (error) {
    if (!isBuildPhase()) throw error;
    console.warn(
      '[blog] 빌드 중 책 이야기 목록 조회 실패 — 빈 목록으로 빌드:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
};

const loadPublishedStory = async (slug: string): Promise<Story | null> => {
  const { data, error } = await createAnonClient()
    .from('stories')
    .select(STORY_COLUMNS)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toStory(data as StoryRow) : null;
};

const cachedPublishedStory = unstable_cache(
  loadPublishedStory,
  ['stories-by-slug'],
  { revalidate: ONE_DAY, tags: [STORIES_CACHE_TAG] }
);

/** 공개 글 한 편(본문 포함). 없으면 null, DB 오류는 던진다 */
export const getPublishedStory = async (slug: string): Promise<Story | null> =>
  hasSupabaseEnv() ? cachedPublishedStory(slug) : null;

/**
 * 책 정보 페이지 카드용 — 그 책의 최신 공개 글. 실패해도 책 정보 페이지는 그려져야 하므로 null.
 */
export const getLatestStoryForBook = async (
  bookId: string
): Promise<StorySummary | null> => {
  try {
    const stories = await getPublishedStories();
    return stories.find((story) => story.bookId === bookId) ?? null;
  } catch (error) {
    console.warn(
      '[blog] 책 이야기 카드 조회 실패:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
};
