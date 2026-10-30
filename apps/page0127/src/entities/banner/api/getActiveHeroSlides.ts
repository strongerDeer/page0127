import { unstable_cache } from 'next/cache';

import { createAnonClient } from '@/shared/config/supabase/anon';

import { filterForViewer } from '../lib/audience';
import { slidesOrFallback } from '../lib/mapSlides';
import { HERO_SLIDE_COLUMNS } from '../types';

import type { HeroSlide, HeroSlideRow } from '../types';

import 'server-only';

/** 어드민에서 슬라이드를 바꿀 때 지우는 캐시 태그 (features/admin-banners/api/slideActions.ts) */
export const HERO_SLIDES_CACHE_TAG = 'hero-slides';

/**
 * 게시 중인 슬라이드를 몇 초 동안 캐시하나.
 *
 * 예약 게시(starts_at·ends_at)는 RLS 가 조회 시각의 now() 로 거르므로, 캐시하는 동안은
 * 시작·종료가 최대 이만큼 늦게 반영된다. 5분이면 운영상 문제없다.
 * 어드민에서 저장·삭제하면 태그로 바로 지우므로 그때는 기다리지 않는다.
 */
const HERO_SLIDES_REVALIDATE_SECONDS = 300;

/**
 * 게시 중인 슬라이드 전부(대상 구분 없이) — 실패하면 던진다.
 *
 * 쿠키 없는 anon 클라이언트: 결과를 모든 방문자가 같이 쓰므로 세션이 섞이면 안 된다.
 * 대상(audience) 판정은 캐시 바깥에서 보는 사람마다 한다.
 * 던지는 이유: unstable_cache 는 던진 결과를 저장하지 않으므로, 일시 오류가
 * 5분 동안 "배너 없음"으로 굳지 않는다 (widgets/about/api/aboutCache.ts 와 같은 이유).
 */
const loadPublishedSlides = async (): Promise<HeroSlideRow[]> => {
  const { data, error } = await createAnonClient()
    .from('hero_slides')
    .select(HERO_SLIDE_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as HeroSlideRow[] | null) ?? [];
};

const cachedPublishedSlides = unstable_cache(
  loadPublishedSlides,
  ['hero-slides', 'published'],
  { revalidate: HERO_SLIDES_REVALIDATE_SECONDS, tags: [HERO_SLIDES_CACHE_TAG] }
);

/**
 * 지금 이 사람에게 보여줄 배너 슬라이드를 sort_order 순으로 읽는다.
 *
 * 걸러지는 곳이 둘로 나뉜다.
 * - **활성·기간**은 RLS 가 본다(`anyone can read published slides`). 예약 시작 전
 *   배너의 문구가 anon 키로 미리 읽히면 안 되므로 DB 에서 막는다.
 * - **대상**은 여기서 본다. RLS 에 auth.uid() 를 넣으면 비로그인 캐시와 로그인
 *   캐시가 섞이기 때문에 정책에 담지 않았다.
 *
 * 왜 캐시하나(2026-10-30 [db-timeout] PAGE0127-26): 홈을 열 때마다 DB 를 직접 읽어서,
 * Supabase 가 한 번 5초 넘게 늦으면 그 요청의 배너가 빠지고 에러가 남았다.
 * 슬라이드는 어드민에서 가끔 바꾸는 값이라 매 요청 읽을 이유가 없다.
 * ⚠️ 캐시 조회라 Suspense 안이 아니라 셸 전에(page 에서) 읽어야 한다 —
 * 늦게 등록된 배경 갱신은 waitUntil 에 실리지 않아 끊긴다(ShelfPreviewSection 주석).
 *
 * 결과가 0개면 호출부가 준 폴백(코드 상수)을 반환해 랜딩이 비지 않게 한다.
 *
 * @param isMember 보는 사람이 로그인 상태인가
 */
export async function getActiveHeroSlides(
  fallback: HeroSlide[],
  isMember: boolean
): Promise<HeroSlide[]> {
  try {
    const visible = filterForViewer(await cachedPublishedSlides(), isMember);
    return slidesOrFallback(visible, fallback);
  } catch (error) {
    console.error(
      '[banner] 슬라이드 조회 실패:',
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}
