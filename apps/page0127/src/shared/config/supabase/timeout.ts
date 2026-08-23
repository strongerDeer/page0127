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

/** 사용자 대면 조회 상한. 정상 응답은 서울 리전 기준 0.1~0.4초다. */
export const DB_TIMEOUT_MS = 5_000;

export const createTimeoutFetch = (
  timeoutMs: number = DB_TIMEOUT_MS
): typeof fetch => {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // 호출자가 이미 signal 을 넘겼다면(supabase-js 의 .abortSignal() 등)
    // 둘 중 먼저 끊기는 쪽을 따른다 — 남의 취소를 덮어쓰지 않는다.
    const signal = init?.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;

    try {
      return await fetch(input, { ...init, signal });
    } finally {
      clearTimeout(timer);
    }
  };
};
