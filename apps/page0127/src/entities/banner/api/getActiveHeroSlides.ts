import { createClient } from '@/shared/config/supabase/server';

import { slidesOrFallback } from '../lib/mapSlides';

import type { HeroSlide, HeroSlideRow } from '../types';

/**
 * 켜진 배너 슬라이드를 sort_order 순으로 읽는다.
 * 결과가 0개면 호출부가 준 폴백(코드 상수)을 반환해 랜딩이 비지 않게 한다.
 * RLS가 is_active=true만 노출하므로 anon 키로 안전하게 읽는다.
 */
export async function getActiveHeroSlides(
  fallback: HeroSlide[]
): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hero_slides')
    .select(
      'id, eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[banner] 슬라이드 조회 실패:', error.message);
    return fallback;
  }
  return slidesOrFallback((data as HeroSlideRow[]) ?? [], fallback);
}
