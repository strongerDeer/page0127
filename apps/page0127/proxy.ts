import { type NextRequest } from 'next/server';

import { updateSession } from '@/shared/config/supabase/middleware';
import {
  HERO_VARIANT_COOKIE,
  HERO_VARIANT_MAX_AGE_SEC,
  isHeroAbOn,
  pickHeroVariant,
  shouldAssignHeroVariant,
} from '@/shared/lib/experiment/heroVariant';
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
  // 홈 히어로 A/B — 홈에 처음 온 비로그인 방문자에게 그룹을 정한다(shared/lib/experiment/heroVariant)
  const abOn = isHeroAbOn(process.env.HERO_AB);
  const currentVariant = request.cookies.get(HERO_VARIANT_COOKIE)?.value;
  const assignedVariant = shouldAssignHeroVariant({
    abOn,
    pathname: request.nextUrl.pathname,
    cookieNames: request.cookies.getAll().map((c) => c.name),
    current: currentVariant,
  })
    ? pickHeroVariant()
    : null;
  // updateSession 이 응답을 만들 때 요청 쿠키를 그대로 넘긴다 → 그 전에 요청에도 넣어야
  // 같은 요청의 홈이 이 그룹으로 그려진다(응답 쿠키만 심으면 다음 요청부터 보인다)
  if (assignedVariant) {
    request.cookies.set(HERO_VARIANT_COOKIE, assignedVariant);
  }

  const { response, user } = await updateSession(request);

  if (assignedVariant) {
    response.cookies.set(HERO_VARIANT_COOKIE, assignedVariant, {
      path: '/',
      maxAge: HERO_VARIANT_MAX_AGE_SEC,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // GA 사용자 속성으로 보내려면 브라우저가 읽어야 한다 — 그룹 이름 외엔 아무것도 담지 않는다
      httpOnly: false,
    });
  } else if (!abOn && currentVariant) {
    // 스위치를 끄면 남은 그룹을 지운다 — 그래야 GA 사용자 속성도 더 이상 보내지 않는다
    response.cookies.delete(HERO_VARIANT_COOKIE);
  }

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
     * - sw.js · offline.html · icons/ (서비스워커·PWA 정적 자원 — 세션을 읽을 이유가 없다.
     *   sw.js 는 브라우저가 수시로 갱신 확인을 해서, 태우면 그때마다 Supabase 인증 호출이 나간다)
     * - public 폴더의 파일들 (.svg, .png 등)
     */
    '/((?!_next/static|_next/image|favicon.ico|monitoring|sw\\.js|offline\\.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
