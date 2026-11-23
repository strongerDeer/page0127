'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/shared/config/supabase/server';
import {
  DEMO_READ_ONLY_MESSAGE,
  isDemoUser,
} from '@/shared/lib/demo/demoAccount';

export type SearchIndexableResult =
  | { status: 'success'; searchIndexable: boolean }
  | { status: 'error'; message: string };

/**
 * "검색엔진에 내 서재 보이기" 스위치 저장 (Server Action)
 *
 * - 누구의 값을 바꿀지는 클라이언트가 정하지 않는다 — 쿠키 세션의 user.id 만 쓴다.
 * - 저장 후 서재 경로를 무효화해 다음 요청부터 robots 메타가 바로 바뀌게 한다.
 *   (sitemap 은 요청마다 DB 를 읽으므로 따로 할 일이 없다)
 */
export const updateSearchIndexableAction = async (
  searchIndexable: boolean
): Promise<SearchIndexableResult> => {
  if (typeof searchIndexable !== 'boolean') {
    return { status: 'error', message: '잘못된 요청이에요.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }
  if (isDemoUser(user)) {
    return { status: 'error', message: DEMO_READ_ONLY_MESSAGE };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      search_indexable: searchIndexable,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('username')
    .maybeSingle();

  if (error) {
    console.error('검색 노출 설정 저장 실패:', error.message);
    return {
      status: 'error',
      message: '설정 저장에 실패했어요. 다시 시도해 주세요.',
    };
  }

  if (data?.username) {
    // 서재와 그 아래(배지·책 기록) 전부
    revalidatePath(`/${data.username}`, 'layout');
  }

  return { status: 'success', searchIndexable };
};
