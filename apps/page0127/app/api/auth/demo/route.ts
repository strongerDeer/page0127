import { type NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';
import { isDemoLoginEnabled } from '@/shared/lib/demo/demoAccount';

/**
 * 체험 계정으로 로그인 — 로그인 화면의 「체험 계정으로 둘러보기」 버튼(form POST)이 부른다.
 *
 * 흐름:
 *   1. 서버가 service_role 로 체험 계정의 매직 링크 토큰을 만든다(generateLink — 메일은 보내지 않는다)
 *   2. 같은 서버가 그 토큰을 바로 검증해(verifyOtp) 세션을 만든다
 *   3. 세션은 쿠키로 심긴다 → 그다음부터는 소셜 로그인과 똑같이 proxy 가 쿠키로 사용자를 안다
 *
 * 왜 비밀번호 로그인이 아닌가:
 *   비밀번호 로그인은 Supabase 의 Email 공급자를 켜야 한다. 켜면 누구나 anon 키로 이메일 가입을
 *   시도할 수 있다. 매직 링크 토큰을 서버에서 만들고 서버에서 검증하면 Email 공급자를 꺼 둔 채로도
 *   세션을 만들 수 있다(2026-11-21 로컬 GoTrue 에서 확인: Email 꺼짐 → 외부 이메일 가입 거절,
 *   generateLink + verifyOtp 는 세션 발급).
 *   토큰은 브라우저로 나가지 않으므로 가로챌 링크도 없다.
 *
 * 체험 계정이 맞는지(app_metadata.demo)는 시드 스크립트가 붙인다
 * (scripts/demo/seed-demo-account.mjs). 여기서는 환경변수의 이메일로만 로그인한다.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);

  // 기능이 꺼져 있으면 라우트가 없는 것처럼 군다
  const email = process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase();
  if (!isDemoLoginEnabled() || !email) {
    return new NextResponse(null, { status: 404 });
  }

  // 다른 사이트가 이 폼을 대신 보내 방문자를 체험 계정으로 바꿔치기하지 못하게 한다(login CSRF)
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== origin) {
    return new NextResponse(null, { status: 403 });
  }

  const failed = () =>
    NextResponse.redirect(`${origin}/login?demo=failed`, { status: 303 });

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash || link.user.app_metadata?.demo !== true) {
    // 체험 표시가 없는 계정이면 로그인시키지 않는다 — 읽기 전용 보호가 걸리지 않기 때문이다
    console.error(
      '[demo-login] 토큰 발급 실패:',
      linkError?.message ?? 'app_metadata.demo 가 없는 계정'
    );
    return failed();
  }

  const supabase = await createClient();
  const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (verifyError || !session.user) {
    console.error('[demo-login] 세션 생성 실패:', verifyError?.message);
    return failed();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .maybeSingle();

  // 303: POST 뒤에 GET 으로 이동시킨다(새로고침해도 폼이 다시 전송되지 않는다)
  return NextResponse.redirect(
    `${origin}/${profile?.username ?? 'dashboard'}`,
    { status: 303 }
  );
}
