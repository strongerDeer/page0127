import { NextRequest, NextResponse } from 'next/server';

import type { SupabaseClient, User } from '@supabase/supabase-js';

// OpenAI를 호출하는 라우트 — 호출 자체가 비싸고 UI에도 재시도 유도가 없어 가장 엄격하게 제한
const STRICT_PATHS = [
  '/api/taste-analysis/analyze',
  '/api/compatibility/analyze',
];

// 알라딘 API(비용 발생)를 호출하지만, 검색창 입력마다(debounce 400ms) 자동 호출되는
// 라이브 검색이라 strict(5회/분)로 묶으면 정상 사용자도 오타 수정 몇 번에 429를 본다.
// strict보다 여유 있게, standard보다는 낮게 별도 등급을 둔다.
const SEARCH_PATHS = ['/api/books/search'];

const STRICT_LIMIT = 5;
const SEARCH_LIMIT = 20;
const STANDARD_LIMIT = 60;
const WINDOW_MS = 60_000; // 1분

// Vercel Cron이 호출하는 라우트 — CRON_SECRET으로 이미 보호되는 서버 간 호출이라 제외
const EXCLUDED_PREFIXES = ['/api/cron'];

type Tier = 'strict' | 'search' | 'standard';

const TIER_LIMITS: Record<Tier, number> = {
  strict: STRICT_LIMIT,
  search: SEARCH_LIMIT,
  standard: STANDARD_LIMIT,
};

/** 요청 경로의 등급을 고른다. null이면 이 경로는 레이트 리밋 대상이 아니다. */
function getTier(pathname: string): Tier | null {
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }
  if (STRICT_PATHS.includes(pathname)) return 'strict';
  if (SEARCH_PATHS.includes(pathname)) return 'search';
  return 'standard';
}

/**
 * 로그인 사용자는 user.id로, 비로그인 사용자는 IP로 요청 횟수를 센다.
 * Vercel은 프록시를 거친 요청에 x-forwarded-for 헤더를 자동으로 붙여준다.
 *
 * 등급(tier)을 식별자 앞에 붙이는 이유:
 * 등급을 안 붙이면 strict(5회)·search(20회)·standard(60회) 라우트가 같은 카운터를
 * 공유하게 되어, 한 등급을 몇 번 쓰기만 해도 다른 등급 예산이 같이 줄어든다.
 * 등급별로 완전히 독립된 카운터를 쓰기 위해 붙인다.
 */
function getIdentifier(request: NextRequest, user: User | null, tier: Tier): string {
  const base = user
    ? `user:${user.id}`
    : `ip:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`;
  return `${tier}:${base}`;
}

/**
 * /api/* 요청에 레이트 리밋을 적용한다.
 * 제한을 넘으면 429 응답을, 통과하거나 적용 대상이 아니면 null을 반환한다.
 * increment_rate_limit RPC 자체가 실패해도 요청은 막지 않는다 — fail-open.
 */
export async function checkApiRateLimit(
  request: NextRequest,
  user: User | null,
  supabase: SupabaseClient
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const tier = getTier(pathname);

  if (tier === null) {
    return null;
  }

  const limit = TIER_LIMITS[tier];

  // 현재 몇 번째 1분 구간인지를 그 구간의 시작 시각으로 표현한다.
  // 예: 10:23:47 → 10:23:00 (같은 구간에 들어온 요청은 모두 같은 window_start를 갖는다)
  const windowStartMs = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;

  try {
    const identifier = getIdentifier(request, user, tier);
    const { data: count, error } = await supabase.rpc('increment_rate_limit', {
      p_identifier: identifier,
      p_window_start: new Date(windowStartMs).toISOString(),
    });

    if (error) {
      throw error;
    }

    if ((count as number) > limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStartMs + WINDOW_MS - Date.now()) / 1000)
      );
      return NextResponse.json(
        { error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds) },
        }
      );
    }
  } catch (error) {
    console.error('레이트 리밋 체크 실패 (요청은 통과시킴):', error);
  }

  return null;
}
