import { type NextRequest } from 'next/server';

import { updateSession } from '@/shared/config/supabase/middleware';
import { checkApiRateLimit } from '@/shared/lib/rate-limit';

/**
 * Next.js Proxy (구 Middleware)
 *
 * 학습 포인트:
 * - Next.js 16부터 `middleware` 파일 규칙은 `proxy`로 이름이 바뀌었다.
 *   (Express.js의 middleware와 혼동을 피하고, "앱 앞단의 네트워크 경계"라는
 *    역할을 더 분명히 하려는 의도)
 * - 파일명(proxy.ts)과 export 함수명(proxy)만 바뀔 뿐, 동작·시그니처는 동일하다.
 * - 모든 라우팅 전에 실행되는 함수
 * - 인증 상태 확인 후 리디렉션 처리
 * - /api/* 요청은 인증 처리 후 레이트 리밋 체크를 추가로 거친다
 * - matcher로 실행할 경로 지정 (성능 최적화)
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResponse = await checkApiRateLimit(request, user);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 경로에서 실행:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - monitoring (Sentry 터널 라우트 — 인증/세션 로직을 우회해야 에러 전송이 막히지 않음)
     * - public 폴더의 파일들 (.svg, .png 등)
     */
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
