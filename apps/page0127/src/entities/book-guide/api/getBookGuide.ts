import { parseBookGuideSections } from '../model/bookGuideSchema';

import type { BookGuideSection } from '../model/bookGuideSchema';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 발행된 읽기 가이드 — 없거나 모양이 깨졌으면 null.
 *
 * - 발행 여부는 RLS 가 거르지만(익명은 published 만 읽힘) 조건도 직접 적는다.
 *   어드민 미리보기처럼 service role 로 부를 때 draft 가 섞이지 않게.
 * - 실패해도 throw 하지 않는다. 책 정보 페이지의 곁들이는 칸이라 페이지를 막으면 안 된다.
 *
 * 클라이언트를 인자로 받는 이유: next/headers 를 끌어오지 않아 index 를 어디서든 import 할 수 있게.
 */
export const getBookGuide = async (
  client: SupabaseClient,
  globalBookId: string
): Promise<BookGuideSection[] | null> => {
  const { data, error } = await client
    .from('book_guides')
    .select('sections')
    .eq('global_book_id', globalBookId)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) return null;
  return parseBookGuideSections(data.sections);
};
