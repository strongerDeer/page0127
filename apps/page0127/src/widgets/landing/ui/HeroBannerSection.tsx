import { createClient } from '@/shared/config/supabase/server';

import { getActiveHeroSlides } from '@/entities/banner/api/getActiveHeroSlides';

import { HERO_SLIDES } from '@/widgets/landing/model/heroSlides';
import { HeroBanner } from '@/widgets/landing/ui/HeroBanner';

type RankingRow = { book_info: { cover_image: string | null } | null };

/**
 * 히어로 배너 Server Component
 *
 * 배너에 세울 책 표지를 실제 DB에서 가져온다.
 * 기존 히어로는 이미지가 0개였다 — "책장을 보면 그 사람이 보인다"는
 * 카피는 책장을 보여줄 때만 성립한다.
 *
 * 표지를 못 가져와도 배너는 카피만으로 렌더된다(랜딩이 죽지 않는다).
 */
export const HeroBannerSection = async () => {
  const supabase = await createClient();

  // 배너에 세울 책 표지 후보 12권(슬라이드 수는 DB에 따라 가변, HeroBanner가 순환 사용).
  const { data } = await supabase.rpc('get_most_read_books', {
    limit_count: 12,
  });

  const covers = ((data as RankingRow[] | null) ?? [])
    .map((row) => row.book_info?.cover_image)
    .filter((url): url is string => Boolean(url));

  // 켜진 슬라이드를 DB에서, 비면 코드 상수 폴백
  const slides = await getActiveHeroSlides(HERO_SLIDES);

  return <HeroBanner slides={slides} covers={covers} />;
};
