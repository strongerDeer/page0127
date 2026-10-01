/**
 * profiles 에서 **누구나 읽어도 되는** 컬럼. 프로필 조회는 `select('*')` 대신 이것을 쓴다.
 *
 * 왜 `*` 를 쓰면 안 되나:
 * profiles.email·status·suspended_until 은 anon·authenticated 에게 SELECT 권한이 없다(컬럼 단위 권한,
 * 20261001000000_hide_profile_email.sql). 이전엔 공개 anon 키로 REST 를 한 번 부르면
 * 회원 이메일 전체가 나왔다(2026-10-01 운영 실측). 권한 없는 컬럼이 하나라도 섞이면
 * Postgres 는 **쿼리 전체를 42501 로 거절**하므로 `*` 는 이제 무조건 실패한다.
 *
 * ⚠️ profiles 에 컬럼을 추가하면 세 곳을 함께 고친다 — 이 목록, `Profile` 타입,
 *    그리고 마이그레이션의 `grant select (...)` 목록. 하나라도 빠지면 조회가 42501 로 죽는다.
 *
 * 본인 이메일이 필요하면 profiles 가 아니라 로그인 세션(`user.email`)에서 읽는다.
 */
// 배열을 join 하지 않고 리터럴 한 줄로 둔다 — supabase-js 는 select 에 넘긴 문자열 **리터럴**을
// 해석해 반환 타입을 만든다. join 결과는 그냥 `string` 이라 타입 추론이 GenericStringError 로 깨진다.
export const PROFILE_PUBLIC_COLUMNS =
  'id, username, username_changed_at, onboarded_at, nickname, bio, photo_url, reading_goal, created_at, updated_at';
