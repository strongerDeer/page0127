import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type { HeroSlideRow } from '@/entities/banner/types';

export async function getAllSlides(): Promise<HeroSlideRow[]> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('hero_slides')
    .select(
      'id, eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order, is_active'
    )
    .order('sort_order', { ascending: true });

  if (error) console.error('[admin] 배너 목록 조회 실패:', error.message);
  return (data as HeroSlideRow[]) ?? [];
}
