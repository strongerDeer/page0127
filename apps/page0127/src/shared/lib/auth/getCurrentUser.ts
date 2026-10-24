import { cache } from 'react';

import { createClient } from '@/shared/config/supabase/server';

import type { User } from '@supabase/supabase-js';

/**
 * 지금 요청의 로그인 유저(없으면 null) — 서버 렌더 한 번에 Auth 서버를 한 번만 부른다.
 *
 * 한 화면을 그릴 때 레이아웃·AppShell·페이지·generateMetadata·위젯이 저마다
 * `supabase.auth.getUser()` 를 부르면, 매번 Supabase Auth 서버로 왕복이 생긴다
 * (getUser 는 쿠키만 읽는 getSession 과 달리 토큰을 서버에서 검증한다).
 * React `cache` 로 감싸면 같은 렌더 안에서는 첫 호출 결과를 나눠 쓴다.
 *
 * - 캐시 범위는 서버 요청 하나다. 다른 사용자·다른 요청과 섞이지 않는다.
 * - Server Action·Route Handler 처럼 RSC 렌더 밖에서는 cache 가 매번 새로 부른다
 *   (그쪽은 원래 요청당 한 번이라 손해가 없다).
 * - 세션 갱신(쿠키 재발급)은 proxy(middleware.ts)의 getUser 가 맡는다. 여기는 읽기만 한다.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
