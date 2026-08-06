import { createClient } from '@/shared/config/supabase/server';

import { getActiveHeroSlides } from '@/entities/banner/api/getActiveHeroSlides';

import { heroSlidesFor } from '@/widgets/landing/model/heroSlides';
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

  // 로그인 여부에 따라 보여줄 배너가 다르다 — "지금 가입하세요"를 이미 가입한
  // 사람에게 보여주면 그 배너는 틀린 말을 하고, 눌러도 로그인 페이지를 거쳐
  // 제자리로 돌아온다(운영 배너 4개가 전부 그 상태였다).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 켜진 슬라이드를 DB에서, 비면 코드 폴백.
  // 폴백을 요청 시점으로 만드는 이유: eyebrow 의 연도가 해가 바뀌어도 따라가야 한다
  // (모듈 상수로 두면 서버가 떠 있는 동안 작년 연도가 박혀 있는다).
  const slides = await getActiveHeroSlides(
    heroSlidesFor(new Date()),
    Boolean(user)
  );

  return <HeroBanner slides={slides} covers={covers} />;
};
