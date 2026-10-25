import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getActiveHeroSlides } from '@/entities/banner/api/getActiveHeroSlides';
import { toCoverSource } from '@/entities/book';

import { HeroBanner } from '@/widgets/landing/ui/HeroBanner';

// book_info 는 to_jsonb(global_books.*) 라 provider_item_id 도 함께 온다
type RankingRow = {
  book_info: {
    cover_image: string | null;
    provider_item_id: string | null;
  } | null;
};

/**
 * 히어로 배너 Server Component
 *
 * 어드민(hero_slides)에 켜 둔 슬라이드가 있을 때만 나온다. 없으면 자리째 비운다.
 * 예전엔 코드 폴백 슬라이드 다섯 장이 늘 돌았는데, 모두 같은 책 표지 구도라
 * 넘겨도 같은 그림이었다(2026-10-25 HJ: "책 형태가 너무 똑같아서 별로").
 * 알릴 것이 있을 때 어드민에서 등록하면 홈 맨 위에 선다.
 *
 * 표지를 못 가져와도 배너는 카피만으로 렌더된다(랜딩이 죽지 않는다).
 */
export const HeroBannerSection = async () => {
  // 로그인 여부에 따라 보여줄 배너가 다르다 — "지금 가입하세요"를 이미 가입한
  // 사람에게 보여주면 그 배너는 틀린 말을 하고, 눌러도 로그인 페이지를 거쳐
  // 제자리로 돌아온다(운영 배너 4개가 전부 그 상태였다).
  const user = await getCurrentUser();
  const slides = await getActiveHeroSlides([], Boolean(user));
  // 슬라이드가 없으면 표지 조회도 하지 않는다
  if (slides.length === 0) return null;

  const supabase = await createClient();

  // 배너에 세울 책 표지 후보 12권(슬라이드 수는 DB에 따라 가변, HeroBanner가 순환 사용).
  const { data } = await supabase.rpc('get_most_read_books', {
    limit_count: 12,
  });

  const covers = ((data as RankingRow[] | null) ?? [])
    .map((row) => toCoverSource(row.book_info ?? { cover_image: null }))
    .filter((cover) => cover.src !== null);

  return <HeroBanner slides={slides} covers={covers} />;
};
