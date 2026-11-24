import { cache } from 'react';

import { createClient } from '@/shared/config/supabase/server';

import { fillEvidenceProviderIds } from '../model/fillEvidenceProviderIds';

import type { PublicTasteHistoryItem } from '../types';

/**
 * 서재 주인의 취향 이력(최신순 최대 10건) — 방문자도 볼 수 있는 칸만.
 *
 * taste_analyses 테이블은 RLS 로 본인만 읽을 수 있다. 공개해도 되는 칸만 돌려주는
 * get_public_taste_history(SECURITY DEFINER) 를 부른다.
 * 실패하면 빈 배열: 취향 카드만 사라지고 서재는 그대로 보인다.
 *
 * React `cache` — 서재 페이지는 메타데이터(공유 제목의 성향 이름)와 본문이 같은 렌더에서
 * 이 함수를 각각 부른다. 한 번만 조회하고 나눠 쓴다.
 */
export const getPublicTasteHistory = cache(
  async (userId: string): Promise<PublicTasteHistoryItem[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_public_taste_history', {
      p_user_id: userId,
    });

    if (error) {
      console.error('취향 이력 조회 실패:', error.message);
      return [];
    }
    const items = (data as PublicTasteHistoryItem[] | null) ?? [];

    // 옛 분석의 근거 책 표지를 YES24 작은 사본으로 — 번호를 못 찾아도 화면은 그대로
    return fillEvidenceProviderIds(items, async (bookIds) => {
      const { data: rows, error: lookupError } = await supabase
        .from('books')
        .select('id, provider_item_id')
        .in('id', bookIds);
      if (lookupError) {
        console.error('근거 책 상품번호 조회 실패:', lookupError.message);
        return new Map();
      }
      return new Map(
        (rows ?? []).map((row) => [
          row.id as string,
          row.provider_item_id as string | null,
        ])
      );
    });
  }
);
