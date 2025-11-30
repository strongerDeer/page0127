import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

/**
 * Middleware용 Supabase 클라이언트
 *
 * 학습 포인트:
 * - Next.js Middleware에서 사용 (라우팅 전에 실행)
 * - 인증 상태 확인 후 리디렉션 처리
 * - Request/Response 쿠키 모두 처리
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // 인증되지 않은 사용자가 보호된 페이지에 접근하면 로그인 페이지로 리디렉션
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
