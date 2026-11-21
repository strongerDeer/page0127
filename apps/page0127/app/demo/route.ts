import { NextResponse } from 'next/server';

import { isDemoLoginEnabled } from '@/shared/lib/demo/demoAccount';

import type { NextRequest } from 'next/server';

/**
 * 이력서·포트폴리오에 적는 체험 입구 — `page0127.com/demo`
 *
 * 체험 버튼은 이 주소로 온 사람에게만 보인다. 일반 로그인 화면에 늘 두면
 * 가입하려던 사람이 체험 계정으로 들어가 "저장이 안 되네" 하고 떠날 수 있다.
 * 기능이 꺼져 있으면(DEMO_ACCOUNT_EMAIL 없음) 그냥 로그인 화면으로 보낸다.
 */
export const GET = (request: NextRequest) => {
  const target = new URL('/login', request.nextUrl.origin);
  if (isDemoLoginEnabled()) target.searchParams.set('demo', '1');
  return NextResponse.redirect(target, 307);
};
