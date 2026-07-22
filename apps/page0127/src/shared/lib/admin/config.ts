/**
 * 관리자 이메일 화이트리스트 파싱·판정 + 비용 대시보드 상수
 *
 * 학습 포인트: 화이트리스트 비교 로직을 edge(미들웨어)가 아니라
 * 이 순수 함수 한 곳에 모아 테스트 가능하게 둔다.
 */

/** ADMIN_EMAILS 원문(쉼표 구분)을 정규화된 이메일 배열로 파싱 */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/** 이메일이 화이트리스트에 있는지 (대소문자·공백 무시) */
export function isAdminEmail(
  email: string | null | undefined,
  adminEmails: string[]
): boolean {
  if (!email) return false;
  return adminEmails.includes(email.trim().toLowerCase());
}

/** 현재 환경변수 기준 관리자 목록 */
export function getAdminEmails(): string[] {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

/** USD → KRW 환산 근사 상수 (수동 갱신) */
export const USD_TO_KRW = 1400;

/** 월 예산 (원) */
export const MONTHLY_BUDGET_KRW = 30000;
