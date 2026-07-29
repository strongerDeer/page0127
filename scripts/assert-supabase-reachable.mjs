/**
 * Supabase 키가 "있는지" 가 아니라 "먹히는지" 확인한다.
 *
 * 왜 필요한가 (2026-07-29 사고):
 * ci.yml 은 secret 의 길이만 봤다. URL 과 키가 서로 다른 프로젝트 것이라 실제로는
 * DB에 전혀 못 닿는 상태였는데도 "secrets 정상" 으로 표시됐고, 그 상태로 E2E 8개 중
 * 7개가 통과했다. 앱이 조회 실패를 삼키고 렌더를 계속하기 때문이다.
 *
 * 길이 검사는 "봉투가 비지 않았다" 를 확인할 뿐 "열쇠가 맞는다" 를 확인하지 않는다.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const fail = (msg) => {
  // ::error:: 는 GitHub Actions 가 로그에서 빨갛게 띄우고 요약에도 올린다
  console.error(`::error::${msg}`);
  process.exit(1);
};

if (!url || !anonKey) {
  fail(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다.'
  );
}

let origin;
try {
  origin = new URL(url).origin;
} catch {
  fail(`NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다: ${url}`);
}

/**
 * PostgREST 루트(/rest/v1/)는 인증만 통과하면 200 을 준다.
 * 테이블 이름을 몰라도 되고 RLS 도 타지 않아 "키가 이 프로젝트 것인가" 만 정확히 가른다.
 */
const endpoint = `${origin}/rest/v1/`;
const timeoutMs = 10_000;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

let res;
try {
  res = await fetch(endpoint, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    signal: controller.signal,
  });
} catch (e) {
  const reason = e?.name === 'AbortError' ? `${timeoutMs}ms 내 무응답` : e?.message;
  fail(`Supabase 에 닿지 못했습니다 (${origin}): ${reason}`);
} finally {
  clearTimeout(timer);
}

if (res.status === 401 || res.status === 403) {
  fail(
    `Supabase 키가 거부됐습니다 (HTTP ${res.status}). ` +
      `URL 과 ANON_KEY 가 같은 프로젝트 것인지 확인하세요 — ${origin}`
  );
}

if (!res.ok) {
  fail(`Supabase 응답이 비정상입니다 (HTTP ${res.status}) — ${origin}`);
}

console.log(`Supabase 연결 검사 통과: ${origin} (HTTP ${res.status})`);
