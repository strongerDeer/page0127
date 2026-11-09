import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import {
  type AuthUser,
  getVerifiedClaimsUser,
} from '@/shared/lib/auth/getVerifiedUser';
import { isProtectedPath } from '@/shared/lib/auth/protectedRoutes';

import { copyAuthResponse } from './response';
import { createTimeoutFetch } from './timeout';

import type { SupabaseClient } from '@supabase/supabase-js';

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
  user: AuthUser | null;
  supabase: SupabaseClient;
}> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // PWA 재실행 시 만료된 토큰을 갱신할 시간을 준다(인증 15초, DB 5초).
      global: { fetch: createTimeoutFetch() },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          const previousResponse = supabaseResponse;
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // next() snapshots request headers. Rebuild after rotating the cookies,
          // so Server Components receive the refreshed tokens in this same request.
          supabaseResponse = copyAuthResponse(
            previousResponse,
            NextResponse.next({ request })
          );
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) => {
            supabaseResponse.headers.set(name, value);
          });
        },
      },
    }
  );

  // Verify the JWT signature (getClaims); never authorize from getSession() or raw cookies.
  // 비대칭 서명키면 서버 안에서 검증이 끝나 Auth 왕복이 없다. 만료가 가까우면 먼저 갱신해
  // 위 setAll 로 새 쿠키를 심는 흐름은 getUser 때와 같다.
  let user: AuthUser | null;
  try {
    user = await getVerifiedClaimsUser(supabase.auth);
  } catch {
    // Fail closed without redirecting to login or clearing a recoverable session.
    const message =
      '로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.';
    const response = request.nextUrl.pathname.startsWith('/api/')
      ? NextResponse.json({ error: message }, { status: 503 })
      : new NextResponse(
          `<!doctype html><html lang="ko"><meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>잠시 연결이 원활하지 않아요 · page0127.</title>
          <body style="font-family:system-ui,sans-serif;max-width:28rem;margin:15vh auto;padding:24px;line-height:1.7">
          <h1 style="font-size:1.3rem">잠시 연결이 원활하지 않아요</h1>
          <p>${message}</p><a href="">다시 시도</a></body></html>`,
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Retry-After', '3');
    return {
      response: copyAuthResponse(supabaseResponse, response),
      user: null,
      supabase,
    };
  }

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
    return {
      response: copyAuthResponse(supabaseResponse, NextResponse.redirect(url)),
      user,
      supabase,
    };
  }

  return { response: supabaseResponse, user, supabase };
}
