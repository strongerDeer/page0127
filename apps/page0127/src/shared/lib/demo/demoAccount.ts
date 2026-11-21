/**
 * 리뷰어용 체험 계정 — 판정과 문구를 한 곳에 둔다.
 *
 * 체험 계정은 공용 계정 하나를 여러 사람이 함께 쓴다. 그래서 "읽기만" 된다.
 * 막는 겹(심층 방어):
 *   1. proxy.ts        — 체험 계정이 보내는 /api 쓰기 요청을 403 으로 돌려보낸다
 *   2. 서버 액션       — 액션 첫 부분에서 isDemoUser 로 확인한다(액션은 /api 밖이라 proxy 가 못 가른다)
 *   3. DB 트리거       — 앱을 거치지 않고 PostgREST 를 직접 불러도 막힌다
 *                        (supabase/migrations/20261121000100_demo_account.sql)
 *
 * 체험 계정 판정은 JWT 의 app_metadata.demo 로 한다. app_metadata 는 service_role 만 바꿀 수
 * 있어서 사용자가 스스로 켜고 끌 수 없고, 토큰에 실려 있어 요청마다 DB 를 조회하지 않아도 된다.
 */

/** 체험 계정이 저장·수정·삭제를 시도했을 때 보여 줄 문구 */
export const DEMO_READ_ONLY_MESSAGE =
  '체험 계정은 저장되지 않아요. 가입하면 내 서재에 직접 기록할 수 있어요.';

/** proxy 403 응답의 code — 클라이언트가 일반 권한 오류와 구분할 때 쓴다 */
export const DEMO_READ_ONLY_CODE = 'DEMO_READ_ONLY';

type MaybeDemoUser = {
  app_metadata?: Record<string, unknown> | null;
} | null;

/** 지금 사용자가 체험 계정인가 (비로그인은 false) */
export const isDemoUser = (user: MaybeDemoUser | undefined): boolean =>
  user?.app_metadata?.demo === true;

/** 체험 로그인 버튼을 보여 줄지 — 환경변수가 있을 때만 켠다(미리보기·로컬에서 끄기 쉽게) */
export const isDemoLoginEnabled = (): boolean =>
  Boolean(process.env.DEMO_ACCOUNT_EMAIL?.trim());

/**
 * 체험 계정에게도 열어 두는 /api 쓰기.
 * 사용자 기록이 아니라 방문·성능 측정, 읽음 표시처럼 남아도 되는 것들이다.
 * (DB 트리거에서도 같은 이유로 해당 테이블을 막지 않는다)
 */
const DEMO_ALLOWED_API_WRITES: readonly RegExp[] = [
  /^\/api\/auth\/demo$/, // 체험 로그인 버튼을 다시 눌러도 동작하게
  /^\/api\/rum$/, // 성능 측정
  /^\/api\/visit$/, // 방문 기록
  /^\/api\/banners\/[^/]+\/click$/, // 배너 클릭 집계
  /^\/api\/books\/[^/]+\/thread-read$/, // 댓글 읽음 표시
  /^\/api\/books\/import\/match$/, // CSV 가져오기 "미리 맞춰 보기"(저장 아님)
];

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * 체험 계정의 이 요청을 막아야 하나 — proxy 가 부른다(순수 함수라 테스트한다).
 *
 * /api 밖(페이지 POST = 서버 액션)은 여기서 가르지 않는다. 액션은 모두 같은 페이지 경로로
 * 오고 어느 액션인지 헤더(해시)로만 구분돼서, 경로로는 "오늘의 문장 뽑기"처럼 열어 둘 액션을
 * 고를 수 없다. 서버 액션은 각자 isDemoUser 로 막는다(demoServerActions.test.ts 가 지킨다).
 */
export const isDemoBlockedRequest = ({
  method,
  pathname,
}: {
  method: string;
  pathname: string;
}): boolean => {
  if (READ_METHODS.has(method.toUpperCase())) return false;
  if (!pathname.startsWith('/api/')) return false;
  return !DEMO_ALLOWED_API_WRITES.some((pattern) => pattern.test(pathname));
};
