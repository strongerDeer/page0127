import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

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

  // 보호된 경로 prefix 목록 — app/(protected) 그룹과 동기화한다.
  // 여기에 누락되더라도 (protected)/layout.tsx 의 가드가 안전망으로 동작한다.
  // '/dashboard'는 이제 로그인 사용자의 /{username}으로 리다이렉트만 하는
  // 얇은 스텁이라 보호가 필요 없다 (안 걸려도 로그인 자체는 각 실제 기능에서 확인한다).
  const PROTECTED_PREFIXES = [
    '/admin',
    '/books',
    '/feed',
    '/search',
    '/settings',
    '/notifications',
  ];

  // /books 하위지만 로그인 없이 열어두는 경로 — app/(public)/books 와 동기화한다.
  // 카탈로그와 책 정보는 서비스의 얼굴이자 SEO 자산이다.
  // 로그인은 "담아둘 때" 필요하지 "구경할 때" 필요한 게 아니다.
  const PUBLIC_EXCEPTIONS = ['/books/all', '/books/info'];

  const { pathname } = request.nextUrl;

  const isPublicException = PUBLIC_EXCEPTIONS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isProtected =
    !isPublicException &&
    PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

  // 비로그인 사용자가 보호된 경로에 접근하면 로그인 페이지로 리디렉션
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return { response: NextResponse.redirect(url), user, supabase };
  }

  return { response: supabaseResponse, user, supabase };
}
