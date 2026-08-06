import { createClient } from '@/shared/config/supabase/server';

import { filterForViewer } from '../lib/audience';
import { slidesOrFallback } from '../lib/mapSlides';
import { HERO_SLIDE_COLUMNS } from '../types';

import type { HeroSlide, HeroSlideRow } from '../types';

/**
 * 지금 이 사람에게 보여줄 배너 슬라이드를 sort_order 순으로 읽는다.
 *
 * 걸러지는 곳이 둘로 나뉜다.
 * - **활성·기간**은 RLS 가 본다(`anyone can read published slides`). 예약 시작 전
 *   배너의 문구가 anon 키로 미리 읽히면 안 되므로 DB 에서 막는다.
 * - **대상**은 여기서 본다. RLS 에 auth.uid() 를 넣으면 비로그인 캐시와 로그인
 *   캐시가 섞이기 때문에 정책에 담지 않았다.
 *
 * 결과가 0개면 호출부가 준 폴백(코드 상수)을 반환해 랜딩이 비지 않게 한다.
 *
 * @param isMember 보는 사람이 로그인 상태인가
 */
export async function getActiveHeroSlides(
  fallback: HeroSlide[],
  isMember: boolean
): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hero_slides')
    .select(HERO_SLIDE_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[banner] 슬라이드 조회 실패:', error.message);
    return fallback;
  }

  const visible = filterForViewer((data as HeroSlideRow[]) ?? [], isMember);
  return slidesOrFallback(visible, fallback);
}
