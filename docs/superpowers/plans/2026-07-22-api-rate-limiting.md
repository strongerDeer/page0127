# API 전역 레이트 리미팅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/api/*` 전체 라우트에 미들웨어 한 곳에서 요청 빈도 제한을 걸어, 로그인 여부와 관계없이 같은 사용자(또는 IP)가 짧은 시간에 반복 호출하는 것을 막는다.

**Architecture:** 이미 쓰고 있는 Supabase Postgres에 카운터 테이블(`rate_limits`)과 원자적 증가 함수(`increment_rate_limit`)를 추가하고(새 외부 서비스 가입 없음), `src/shared/lib/rate-limit/index.ts`에서 이 함수를 호출해 등급별(strict/standard) 제한을 판단한다. 기존 `middleware.ts` → `updateSession()` 흐름에 연결하되, `updateSession()`이 이미 매 요청 만들고 있는 Supabase 클라이언트와 로그인 여부(`user`)를 그대로 재사용한다.

**Tech Stack:** Next.js 16 Middleware(Edge 런타임), Supabase Postgres(`@supabase/ssr`의 기존 클라이언트 재사용).

**설계 근거:** `docs/superpowers/specs/2026-07-22-api-rate-limiting-design.md`

## Global Constraints

- 패키지 매니저는 **npm** — 모든 명령은 `apps/page0127` 안에서 `npm run <script>`로 실행한다.
- **이 프로젝트엔 자동화 테스트 프레임워크가 없다.** 각 태스크의 "테스트" 단계는 `npm run type-check` + `npm run lint` + **개발 서버/Supabase Studio에서 직접 확인하는 수동 검증**으로 대체한다.
- **이 프로젝트는 사용자가 터미널 명령어를 직접 입력하며 학습하는 것을 선호한다(CLAUDE.md).** 아래 각 Step의 `Run:` 명령어는 실행자가 자동으로 실행하지 말고, 사용자에게 그대로 제시해 사용자가 직접 터미널에 입력하고 결과를 알려주는 방식으로 진행한다.
- 이 프로젝트는 **Supabase CLI가 연결돼 있지 않다** (`supabase/config.toml` 없음) — 마이그레이션은 Supabase Studio의 SQL Editor에 파일 내용을 붙여넣어 수동으로 적용한다 (기존 `ai_usage_logs` 마이그레이션과 동일한 방식).
- 코드 주석은 "학습 포인트"가 필요한 곳에만 한국어로 짧게 단다.
- Import 경로는 `@/*` → `apps/page0127/src/*` (예: `@/shared/lib/rate-limit`).
- 새 외부 서비스(Upstash 등)는 도입하지 않는다 — "관리할 서비스를 늘리고 싶지 않다"는 사용자 요청에 따른 제약.

---

## Task 1: Supabase 마이그레이션 — `rate_limits` 테이블 + `increment_rate_limit` 함수

**Files:**
- Create: `supabase/migrations/20260722_create_rate_limits.sql`

**Interfaces:**
- Produces: RPC `increment_rate_limit(p_identifier TEXT, p_window_start TIMESTAMPTZ) RETURNS INTEGER` — Task 2가 `supabase.rpc('increment_rate_limit', {...})`로 호출한다.

- [ ] **Step 1: 마이그레이션 파일 작성**

  ```sql
  -- ============================================================
  -- API 레이트 리미팅 카운터
  --
  -- 왜 필요한가:
  --   전체 API에 요청 횟수 제한이 없어서, 로그인 여부와 관계없이
  --   같은 사용자(또는 IP)가 짧은 시간에 반복 호출해도 막을 방법이 없었다.
  --   특히 taste-analysis/compatibility(OpenAI)·books/search(알라딘)는
  --   호출마다 외부 유료 API 비용이 발생한다.
  --   (docs/superpowers/specs/2026-07-22-api-rate-limiting-design.md)
  --
  -- 방식: 고정 윈도우(fixed window) 카운터.
  --   "1분에 5번까지" 같은 규칙을 (식별자, 분 단위 시각) 조합의 행 하나로
  --   세고, INSERT ... ON CONFLICT DO UPDATE로 동시 요청도 안전하게 증가시킨다
  --   (Postgres가 행 잠금으로 순서를 보장해준다).
  -- ============================================================

  CREATE TABLE IF NOT EXISTS public.rate_limits (
      identifier   TEXT        NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      count        INTEGER     NOT NULL DEFAULT 1,
      PRIMARY KEY (identifier, window_start)
  );

  COMMENT ON TABLE public.rate_limits IS
      'API 레이트 리미팅 카운터. identifier(user:<id> 또는 ip:<ip>)별로 1분 단위 요청 횟수를 센다.';

  -- 청소 쿼리(window_start 기준 삭제)가 이 인덱스를 탄다.
  CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
      ON public.rate_limits (window_start);

  -- RLS 활성화 + 정책 없음 = anon/authenticated는 테이블에 직접 접근 불가.
  -- 아래 SECURITY DEFINER 함수를 통해서만 읽고 쓸 수 있다.
  ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;


  -- ── 카운트 증가 + 현재 값 반환 (원자적) + 오래된 행 청소 ────────
  --
  -- 같은 (identifier, window_start) 조합에 동시에 여러 요청이 들어와도
  -- Postgres의 UPSERT가 행 잠금으로 순서를 보장하므로 카운트 누락이 없다.
  --
  -- 청소는 별도 cron 없이 이 함수 안에서 1000번에 1번 꼴로 확률적으로
  -- 1시간 지난 행을 지운다 (cron 라우트를 새로 만들지 않기 위한 선택).

  CREATE OR REPLACE FUNCTION public.increment_rate_limit(
      p_identifier   TEXT,
      p_window_start TIMESTAMPTZ
  )
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
      result INTEGER;
  BEGIN
      INSERT INTO public.rate_limits (identifier, window_start, count)
      VALUES (p_identifier, p_window_start, 1)
      ON CONFLICT (identifier, window_start)
      DO UPDATE SET count = public.rate_limits.count + 1
      RETURNING count INTO result;

      IF random() < 0.001 THEN
          DELETE FROM public.rate_limits
          WHERE window_start < NOW() - INTERVAL '1 hour';
      END IF;

      RETURN result;
  END;
  $$;

  COMMENT ON FUNCTION public.increment_rate_limit IS
      '식별자의 이번 윈도우(분 단위) 요청 횟수를 1 증가시키고 증가된 값을 반환한다. 1000분의 1 확률로 1시간 지난 행도 함께 청소한다.';

  -- 미들웨어가 로그인 여부와 무관하게(비로그인도 books/search를 호출하므로)
  -- 호출해야 하므로 anon/authenticated 둘 다에게 실행 권한을 준다.
  GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ)
      TO anon, authenticated;
  ```

- [ ] **Step 2: Supabase Studio에서 마이그레이션 적용**

  1. [Supabase 대시보드](https://supabase.com/dashboard) → 이 프로젝트 선택 → 왼쪽 메뉴 "SQL Editor"
  2. "New query" 클릭 후 위 Step 1의 SQL 전체를 붙여넣기
  3. "Run" 클릭
  Expected: `Success. No rows returned` 메시지

- [ ] **Step 3: 함수가 실제로 동작하는지 SQL Editor에서 직접 확인**

  같은 SQL Editor에 새 쿼리로 아래를 두 번 연속 실행한다:

  ```sql
  SELECT increment_rate_limit('test-identifier', date_trunc('minute', now()));
  ```

  Expected: 첫 번째 실행 결과는 `1`, 두 번째 실행 결과는 `2` (같은 1분 구간 안이므로 누적됨)

  확인 후 테스트로 넣은 행은 지워둔다:

  ```sql
  DELETE FROM rate_limits WHERE identifier = 'test-identifier';
  ```

- [ ] **Step 4: 커밋**

  ```bash
  git add supabase/migrations/20260722_create_rate_limits.sql
  git commit -m "feat: 레이트 리미팅 카운터 테이블 및 함수 추가"
  ```

---

## Task 2: Rate limit 라이브러리 작성

**Files:**
- Create: `apps/page0127/src/shared/lib/rate-limit/index.ts`

**Interfaces:**
- Consumes: RPC `increment_rate_limit` (Task 1)
- Produces: `checkApiRateLimit(request: NextRequest, user: User | null, supabase: SupabaseClient): Promise<NextResponse | null>` — Task 4에서 미들웨어가 이 함수를 호출한다. `null`이면 통과, `NextResponse`(429)면 그대로 반환하면 된다.

- [ ] **Step 1: `index.ts` 작성**

  ```ts
  import { NextRequest, NextResponse } from 'next/server';

  import type { SupabaseClient, User } from '@supabase/supabase-js';

  // 외부 유료 API(OpenAI, 알라딘)를 호출하는 라우트 — 더 엄격한 제한
  const STRICT_PATHS = [
    '/api/taste-analysis/analyze',
    '/api/compatibility/analyze',
    '/api/books/search',
  ];

  const STRICT_LIMIT = 5;
  const STANDARD_LIMIT = 60;
  const WINDOW_MS = 60_000; // 1분

  // Vercel Cron이 호출하는 라우트 — CRON_SECRET으로 이미 보호되는 서버 간 호출이라 제외
  const EXCLUDED_PREFIXES = ['/api/cron'];

  /** 요청 경로의 제한 횟수를 고른다. null이면 이 경로는 레이트 리밋 대상이 아니다. */
  function getLimit(pathname: string): number | null {
    if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return null;
    }
    return STRICT_PATHS.includes(pathname) ? STRICT_LIMIT : STANDARD_LIMIT;
  }

  /**
   * 로그인 사용자는 user.id로, 비로그인 사용자는 IP로 요청 횟수를 센다.
   * Vercel은 프록시를 거친 요청에 x-forwarded-for 헤더를 자동으로 붙여준다.
   */
  function getIdentifier(request: NextRequest, user: User | null): string {
    if (user) {
      return `user:${user.id}`;
    }
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    return `ip:${ip}`;
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
    const limit = getLimit(pathname);

    if (limit === null) {
      return null;
    }

    // 현재 몇 번째 1분 구간인지를 그 구간의 시작 시각으로 표현한다.
    // 예: 10:23:47 → 10:23:00 (같은 구간에 들어온 요청은 모두 같은 window_start를 갖는다)
    const windowStartMs = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;

    try {
      const identifier = getIdentifier(request, user);
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
  ```

- [ ] **Step 2: 타입 체크로 오타·타입 오류 확인**

  Run: `cd apps/page0127 && npm run type-check`
  Expected: 에러 없이 종료 (아직 `checkApiRateLimit`을 쓰는 곳이 없어도, export된 함수라 "사용되지 않음" 경고는 나지 않는다)

- [ ] **Step 3: 커밋**

  ```bash
  git add apps/page0127/src/shared/lib/rate-limit
  git commit -m "feat: rate-limit 라이브러리 추가 (Supabase 기반)"
  ```

---

## Task 3: `updateSession()`이 `{ response, user, supabase }`를 반환하도록 리팩터링

동작 변화 없는 순수 리팩터링 — Task 4에서 `user`와 `supabase` 클라이언트를 재사용하기 위한 사전 작업. 이 태스크가 끝난 시점에도 기존 로그인 리다이렉트 동작은 완전히 동일해야 한다.

**Files:**
- Modify: `apps/page0127/src/shared/config/supabase/middleware.ts` (전체)
- Modify: `apps/page0127/middleware.ts` (전체)

**Interfaces:**
- Produces: `updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null; supabase: SupabaseClient }>` — Task 4가 이 반환값을 사용한다.

- [ ] **Step 1: 리팩터링 전 동작 기록 (회귀 확인용)**

  `npm run dev`로 개발 서버를 켠 상태에서, 로그아웃 상태로 브라우저에서 `http://localhost:3000/settings` 접속 → `/login`으로 리다이렉트되는지 확인해둔다. (이 동작이 Step 5 이후에도 그대로여야 한다.)

- [ ] **Step 2: `supabase/middleware.ts`를 아래 내용으로 전체 교체**

  ```ts
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
  ```

- [ ] **Step 3: 최상위 `middleware.ts`를 아래 내용으로 전체 교체 (아직 레이트 리밋은 연결하지 않음)**

  ```ts
  import { type NextRequest } from 'next/server';

  import { updateSession } from '@/shared/config/supabase/middleware';

  /**
   * Next.js Middleware
   *
   * 학습 포인트:
   * - 모든 라우팅 전에 실행되는 함수
   * - 인증 상태 확인 후 리디렉션 처리
   * - matcher로 실행할 경로 지정 (성능 최적화)
   */
  export async function middleware(request: NextRequest) {
    const { response } = await updateSession(request);
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
  ```

- [ ] **Step 4: 타입 체크**

  Run: `cd apps/page0127 && npm run type-check`
  Expected: 에러 없이 종료

- [ ] **Step 5: 회귀 확인 — Step 1과 동일한 동작인지 재확인**

  `npm run dev`로 개발 서버를 켠 상태에서, 로그아웃 상태로 브라우저에서 `http://localhost:3000/settings` 접속 → 여전히 `/login`으로 리다이렉트되는지 확인. 로그인한 상태로 같은 주소 접속 시 정상적으로 페이지가 뜨는지도 확인.
  Expected: Step 1과 동일한 동작 (변화 없음)

- [ ] **Step 6: 커밋**

  ```bash
  git add apps/page0127/middleware.ts apps/page0127/src/shared/config/supabase/middleware.ts
  git commit -m "refactor: updateSession이 user와 supabase 클라이언트를 함께 반환하도록 변경"
  ```

---

## Task 4: `middleware.ts`에 레이트 리밋 체크 연결

**Files:**
- Modify: `apps/page0127/middleware.ts`

**Interfaces:**
- Consumes: `updateSession()` → `{ response, user, supabase }` (Task 3), `checkApiRateLimit(request, user, supabase)` → `NextResponse | null` (Task 2)

- [ ] **Step 1: `middleware.ts`에 레이트 리밋 체크 추가**

  ```ts
  import { type NextRequest } from 'next/server';

  import { checkApiRateLimit } from '@/shared/lib/rate-limit';
  import { updateSession } from '@/shared/config/supabase/middleware';

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
  ```

- [ ] **Step 2: 타입 체크 + 린트**

  Run: `cd apps/page0127 && npm run type-check && npm run lint`
  Expected: 에러 없이 종료

- [ ] **Step 3: strict 등급 확인 — 로그인 없이 `/api/books/search`를 6번 연속 호출**

  `npm run dev`로 개발 서버를 켠 상태에서 새 터미널에 아래를 입력한다:

  ```bash
  for i in 1 2 3 4 5 6; do
    curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/books/search?query=test"
  done
  ```

  Expected: 처음 5줄은 `200`, 마지막 6번째 줄은 `429`

- [ ] **Step 4: standard 등급 확인 — `/api/books/ranking`을 61번 연속 호출**

  ```bash
  for i in $(seq 1 61); do
    curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/books/ranking"
  done | tail -5
  ```

  Expected: 마지막 줄(61번째 호출)이 `429`, 그 이전 줄들은 `200`

- [ ] **Step 5: cron 라우트 제외 확인 — `/api/cron/snapshot-rankings`는 레이트 리밋 없이 그대로 기존 응답이 오는지 확인**

  ```bash
  for i in 1 2 3 4 5 6; do
    curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/cron/snapshot-rankings"
  done
  ```

  Expected: 6줄 모두 동일한 코드(예: `401` — `CRON_SECRET` 헤더가 없어서 나는 기존 응답), `429`는 한 번도 나오지 않음

- [ ] **Step 6: Supabase Studio에서 실제로 카운트가 쌓이는지 눈으로 확인**

  Supabase 대시보드 → Table Editor → `rate_limits` 테이블 열기.
  Expected: Step 3~5에서 호출한 `ip:...` 식별자 행들이 보이고, `count` 값이 호출 횟수와 일치함

- [ ] **Step 7: 커밋**

  ```bash
  git add apps/page0127/middleware.ts
  git commit -m "feat: API 전역 레이트 리미팅 연결"
  ```
