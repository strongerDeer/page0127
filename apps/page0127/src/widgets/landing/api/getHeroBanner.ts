import { unstable_cache } from 'next/cache';

import { createAnonClient } from '@/shared/config/supabase/anon';

import { getActiveHeroSlides } from '@/entities/banner/api/getActiveHeroSlides';
import { toCoverSource } from '@/entities/book';

import type { HeroSlide } from '@/entities/banner/types';
import type { CoverSource } from '@/entities/book';

import 'server-only';

// book_info 는 to_jsonb(global_books.*) 라 provider_item_id 도 함께 온다
type RankingRow = {
  book_info: {
    cover_image: string | null;
    provider_item_id: string | null;
  } | null;
};

export type HeroBannerData = {
  slides: HeroSlide[];
  covers: CoverSource[];
};

/**
 * 배너에 세울 책 표지 후보 12권 — 1시간 캐시, 실패하면 던진다.
 *
 * 많이 읽힌 책 순위라 자주 바뀌지 않는다. 쿠키 없는 anon 클라이언트로 모두가 같은 값을 쓴다.
 * (슬라이드 수는 DB 에 따라 가변, HeroBanner 가 순환 사용)
 */
const loadCovers = async (): Promise<CoverSource[]> => {
  const { data, error } = await createAnonClient().rpc('get_most_read_books', {
    limit_count: 12,
  });
  if (error) throw new Error(error.message);

  return ((data as RankingRow[] | null) ?? [])
    .map((row) => toCoverSource(row.book_info ?? { cover_image: null }))
    .filter((cover) => cover.src !== null);
};

const cachedCovers = unstable_cache(loadCovers, ['hero-banner', 'covers'], {
  revalidate: 3600,
});

/**
 * 홈 배너 데이터. 보여줄 슬라이드가 없으면 null — 배너 자리째 비운다.
 *
 * 둘 다 캐시 조회라 page 가 셸 전에 읽는다(getActiveHeroSlides 주석).
 * 표지를 못 가져와도 배너는 카피만으로 그린다.
 *
 * @param isMember 보는 사람이 로그인 상태인가 — 대상별 배너가 갈린다
 */
export const getHeroBanner = async (
  isMember: boolean
): Promise<HeroBannerData | null> => {
  const slides = await getActiveHeroSlides([], isMember);
  // 슬라이드가 없으면 표지 조회도 하지 않는다
  if (slides.length === 0) return null;

  const covers = await cachedCovers().catch((error: unknown) => {
    console.error(
      '[banner] 표지 조회 실패:',
      error instanceof Error ? error.message : error
    );
    return [];
  });
  return { slides, covers };
};
