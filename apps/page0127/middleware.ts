import { type NextRequest } from 'next/server';

import { updateSession } from '@/shared/config/supabase/middleware';
import { checkApiRateLimit } from '@/shared/lib/rate-limit';

/**
 * Next.js Middleware
 *
 * 학습 포인트:
 * - 모든 라우팅 전에 실행되는 함수
 * - 인증 상태 확인 후 리디렉션 처리
 * - /api/* 요청은 인증 처리 후 레이트 리밋 체크를 추가로 거친다
 * - matcher로 실행할 경로 지정 (성능 최적화)
 */
export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResponse = await checkApiRateLimit(request, user, supabase);
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
     * - public 폴더의 파일들 (.svg, .png 등)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
