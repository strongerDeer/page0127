import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { isProtectedPath } from '@/shared/lib/auth/protectedRoutes';

import { createTimeoutFetch } from './timeout';

import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Middleware용 Supabase 클라이언트
 *
 * 학습 포인트:
 * - Next.js Middleware에서 사용 (라우팅 전에 실행)
 * - 인증 상태 확인 후 리디렉션 처리
 * - Request/Response 쿠키 모두 처리
 * - user와 supabase 클라이언트를 반환값에 포함시켜 상위 middleware.ts가
 *   재사용한다 (레이트 리밋 체크에서 다시 만들지 않기 위함)
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
  supabase: SupabaseClient;
}> {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 여기서 하는 인증 호출은 세션 확인뿐이라 외부 IdP 왕복이 없다.
      // 그래서 콜백용 15초가 아니라 짧게 잡는다 — 이 호출은 **매 요청** 걸리므로
      // 상한이 길면 Auth 가 느려질 때 사이트 전체가 그만큼 멈춘다.
      //
      // 알고 쓸 것: 아래 getUser() 는 error 를 보지 않고 user 만 꺼내므로, 상한에
      // 걸리면 로그인한 사용자도 user=null 이 되어 보호 경로에서 /login 으로 간다.
      // 상한이 없을 때의 대안이 "60초 뒤 함수 타임아웃"이라 이쪽을 택했다.
      global: { fetch: createTimeoutFetch({ authMs: 5_000 }) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 중요: getUser()를 호출해야 세션이 갱신됨
  // getSession()은 세션을 갱신하지 않으므로 사용하면 안 됨
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 경로 판정은 shared/lib/auth/protectedRoutes 한 곳에 있다.
  // 로그아웃(useLogout)도 같은 함수를 써서 "막는 곳"과 "머물러도 되는 곳"이 어긋나지 않는다.
  const { pathname } = request.nextUrl;
  const isProtected = isProtectedPath(pathname);

  // 비로그인 사용자가 보호된 경로에 접근하면 로그인 페이지로 리디렉션.
  // 원래 가려던 곳을 redirect 로 남겨, 로그인 뒤 그리로 돌아가게 한다
  // (안 남기면 로그인 후 본인 서재로만 가서 하려던 일을 잃는다).
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set(
      'redirect',
      `${pathname}${request.nextUrl.search}${request.nextUrl.hash}`
    );
    return { response: NextResponse.redirect(url), user, supabase };
  }

  return { response: supabaseResponse, user, supabase };
}
