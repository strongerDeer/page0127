import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * 관리자(service_role) Supabase 클라이언트 — ⚠️ 서버 전용
 *
 * service_role 키는 **RLS를 통째로 우회하는 마스터 키**다.
 * 이 키가 클라이언트 번들에 들어가면 누구나 DB 전체를 읽고 쓸 수 있다.
 *
 * 지켜야 할 것:
 * - 환경변수 이름에 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
 *   (붙이는 순간 Next.js가 클라이언트 번들에 인라인한다)
 * - 이 파일을 'use client' 컴포넌트에서 import하지 않는다.
 *   → 아래 런타임 가드가 그때 터진다.
 *
 * 쓰는 곳: cron 라우트처럼 사용자 세션 없이 RLS를 넘어야 하는 서버 작업.
 * 일반 요청은 쿠키 기반 createClient(server.ts)를 쓴다.
 */
export const createAdminClient = () => {
  // 번들러가 이 파일을 클라이언트로 끌고 갔다면 여기서 즉시 실패시킨다
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminClient는 서버에서만 호출할 수 있습니다. (service_role 키 노출 위험)'
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.');
  }
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.'
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      // 서버에서 쓰는 일회성 클라이언트 — 세션을 저장하거나 갱신하지 않는다
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
