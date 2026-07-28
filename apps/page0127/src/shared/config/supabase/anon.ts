import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import 'server-only';

/**
 * 익명(anon) Supabase 클라이언트 — 쿠키를 읽지 않는다
 *
 * 쓰는 곳: **OG 이미지·메타데이터처럼 "누가 보든 같아야" 하는 조회.**
 *
 * 왜 server.ts의 createClient를 쓰면 안 되나:
 * 그쪽은 cookies()를 읽어 **보는 사람의 세션**으로 조회한다. 그래서 소유자가 자기
 * OG URL을 직접 열면 비공개 책까지 집계되어, 크롤러가 받아 간 카드와 숫자가 달라진다.
 * 공유 카드는 링크를 받은 사람이 볼 것과 같아야 하므로 세션을 아예 지운다.
 *
 * ⚠️ 이 클라이언트를 써도 쿼리에 `is_public = true` 는 직접 명시한다.
 * RLS는 익명 방문자를 걸러줄 뿐이라, 조건을 생략한 쿼리는 세션 유무로 숫자가 갈린다.
 * (같은 이유로 /books/info/[id] 의 통계 쿼리도 조건을 명시하고 있다)
 */
export const createAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.');
  }
  if (!anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.'
    );
  }

  return createSupabaseClient(url, anonKey, {
    auth: {
      // 세션을 저장·갱신하지 않는 일회성 클라이언트
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
