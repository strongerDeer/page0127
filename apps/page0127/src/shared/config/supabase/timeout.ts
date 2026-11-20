/**
 * 사용자 대면 Supabase 조회에 상한을 거는 fetch 래퍼
 *
 * 왜 필요한가 (2026-08-23 운영 장애):
 * Supabase 데이터 API(PostgREST)만 단독으로 죽은 적이 있다. 그때 앱에는 상한이
 * 없어서, 홈의 Suspense 섹션들이 각자 응답을 기다리다 **Vercel 함수 한도인 60초**
 * 까지 스트림을 붙들었다. 첫 화면 자체는 0.4초에 도착했는데도 브라우저는 60초
 * 동안 로딩이었다. 상한이 있으면 같은 장애에서 "섹션 몇 개가 빠진 페이지가 몇 초
 * 만에 뜨는" 상태로 끝난다. 장애를 막지는 못하고, 피해 시간을 줄인다.
 *
 * ⚠️ AbortSignal.timeout() 을 쓰면 안 된다 — 상한이 지켜지지 않는다.
 * postgrest-js 는 fetch 예외를 잡아 재시도하는데, 그 가드가 **AbortError 만**
 * 즉시 통과시킨다(GET·HEAD·OPTIONS 는 최대 3회, 1s→2s→4s 백오프).
 * AbortSignal.timeout() 이 던지는 것은 TimeoutError 라 가드에 걸리지 않고
 * 재시도 루프로 들어간다. 실측: 상한 5ms 요청이 AbortSignal.timeout 으로는
 * 7036ms, AbortController 로는 5ms 에 끝났다.
 * → 반드시 AbortController.abort() 로 끊어 AbortError 를 만든다.
 *
 * 적용 범위: 사람이 화면을 기다리는 조회(server.ts, anon.ts)에만 건다.
 * 크론(admin.ts)은 배치라 오래 걸리는 게 정상이므로 제외한다.
 */

/**
 * 상한에 걸려 끊었다는 표식. 에러 메시지에 실려 Sentry·/admin/errors 까지 간다.
 *
 * 왜: 그냥 abort() 하면 메시지가 "This operation was aborted" 라, 사용자가 창을 닫아
 * 끊긴 요청과 **DB 가 5초 넘게 안 돌아온 것**이 구분되지 않는다. /admin/errors 는
 * AbortError 를 노이즈로 묻으므로(triage.ts) DB 가 느려져도 화면에 안 보였다.
 * 영어로 쓰는 이유: triage 는 한글 메시지를 "우리가 남긴 로그"로 낮춘다.
 */
export const DB_TIMEOUT_MARKER = '[db-timeout]';

/** 사용자 대면 조회 상한. 정상 응답은 서울 리전 기준 0.1~0.4초다. */
export const DB_TIMEOUT_MS = 5_000;

/**
 * 인증(GoTrue) 상한 — 조회보다 넉넉하게 준다.
 *
 * server.ts 의 클라이언트는 조회만 하는 게 아니다. app/auth/callback/route.ts 의
 * exchangeCodeForSession 이 같은 클라이언트를 쓰고, 그 호출은 Supabase 를 넘어
 * **구글·카카오까지 왕복**한다. 조회용 5초를 그대로 씌우면 남의 IdP 가 느린 날
 * 로그인이 실패한다. 랭킹 섹션이 조용히 빠지는 것과 달리 로그인 실패는 사용자가
 * 서비스에 들어오지 못하는 실패라, 같은 상한으로 묶지 않는다.
 */
export const AUTH_TIMEOUT_MS = 15_000;

/** Supabase 인증 엔드포인트인가 — GoTrue 는 `/auth/v1/` 아래에 있다. */
const isAuthRequest = (input: RequestInfo | URL): boolean => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  return url.includes('/auth/v1/');
};

/**
 * 상한에 걸린 조회를 한 번 더 보낼 때의 상한.
 *
 * 왜 다시 보내나 (2026-11-20 홈 [db-timeout] 하루 5건):
 * 실패는 전부 캐시 배경 갱신이었고, 같은 시각 Supabase 대시보드에는 느린 요청도
 * 에러도 없었다(24시간 평균 195ms) — 요청이 **Supabase 에 닿지도 못했다.**
 * 서버리스 인스턴스는 한가하면 얼어붙는데(freeze), 얼기 전에 열어 둔 keep-alive
 * 연결을 그사이 상대가 끊어도 Node 는 모른다. 깨어나 그 죽은 연결로 보낸 첫 요청은
 * 대답 없이 상한까지 매달린다. 끊으면(abort) 그 소켓은 버려지므로, 다시 보내면
 * **새 연결**로 나가 정상 속도(0.1~0.4초)로 돌아온다.
 *
 * 5초보다 짧게 잡는 이유: 새 연결이면 금방 오고, 그래도 안 오면 진짜 DB 장애다.
 * 사람이 기다리는 최악의 시간을 5 + 3 = 8초로 묶는다.
 */
export const DB_RETRY_TIMEOUT_MS = 3_000;

/**
 * 다시 보내도 안전한 요청인가 — 읽기(GET·HEAD)만.
 * rpc 는 POST 라 같은 요청이 두 번 반영될 수 있어(increment_rate_limit 등) 제외한다.
 */
const isRetryableMethod = (
  input: RequestInfo | URL,
  init?: RequestInit
): boolean => {
  const method = (
    init?.method ??
    (typeof input === 'object' && 'method' in input ? input.method : 'GET')
  ).toUpperCase();
  return method === 'GET' || method === 'HEAD';
};

/** 이 에러가 우리가 건 상한(타임아웃) 때문인가 — 호출자의 취소와 구분한다. */
const isDbTimeout = (error: unknown): boolean =>
  error instanceof Error &&
  error.name === 'AbortError' &&
  error.message.includes(DB_TIMEOUT_MARKER);

/** 상한을 건 fetch 한 번. 넘으면 AbortError(+[db-timeout] 표식)로 끊는다. */
const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  // 이유(reason)는 이름이 AbortError 인 DOMException 이어야 한다 — postgrest-js 의
  // 재시도 가드가 name === 'AbortError' 로 판정한다(위 ⚠️). 메시지만 바꾼다.
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException(
          `Supabase did not respond within ${timeoutMs}ms ${DB_TIMEOUT_MARKER}`,
          'AbortError'
        )
      ),
    timeoutMs
  );

  // 호출자가 이미 signal 을 넘겼다면(supabase-js 의 .abortSignal() 등)
  // 둘 중 먼저 끊기는 쪽을 따른다 — 남의 취소를 덮어쓰지 않는다.
  //
  // AbortSignal.any 의 존재를 확인하고 쓰는 이유: 이 래퍼는 proxy.ts(미들웨어)를
  // 통해 **Edge 런타임**에서도 돈다. 거기엔 이 API 가 없을 수 있고, 없는 채로
  // 호출하면 모든 요청이 미들웨어에서 터진다 — 상한을 걸려다 사이트를 세우는 셈이다.
  // 없으면 상한만 적용한다(현재 코드베이스에 signal 을 넘기는 호출부는 없다).
  const signal =
    init?.signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;

  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
};

export const createTimeoutFetch = ({
  dbMs = DB_TIMEOUT_MS,
  authMs = AUTH_TIMEOUT_MS,
  retryMs = DB_RETRY_TIMEOUT_MS,
} = {}): typeof fetch => {
  return async (input, init) => {
    // 인증은 남의 IdP 까지 왕복하고 상한도 넉넉해서(15초) 다시 보내지 않는다
    if (isAuthRequest(input)) return fetchWithTimeout(input, init, authMs);

    try {
      return await fetchWithTimeout(input, init, dbMs);
    } catch (error) {
      // 우리가 건 상한에 걸린 읽기만, 호출자가 취소하지 않았을 때만 한 번 더 보낸다
      if (
        !isDbTimeout(error) ||
        !isRetryableMethod(input, init) ||
        init?.signal?.aborted
      ) {
        throw error;
      }
      // warn: 알림(error)은 울리지 않고 로그로만 남긴다. 재시도가 성공했는지는
      // 뒤따르는 에러가 없는 것으로 안다 — "죽은 연결" 가설의 근거가 쌓인다.
      console.warn('[db-timeout] 새 연결로 한 번 더 보냄');
      return fetchWithTimeout(input, init, retryMs);
    }
  };
};
