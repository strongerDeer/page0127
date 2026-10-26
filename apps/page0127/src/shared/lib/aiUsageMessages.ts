/**
 * AI 분석 사용 한도·문구 상수
 *
 * aiUsage.ts 와 나눈 이유: aiUsage.ts 는 서버 전용 로직이라 `openai`(APIError)를 import 한다.
 * 클라이언트 컴포넌트가 상수 하나 때문에 aiUsage.ts 를 import 하면 OpenAI SDK 전체
 * (압축 약 80KB)가 그 페이지 JS 에 실린다 — 2026-10 프로필 페이지 JS 가 다른 페이지보다
 * 250KB 많았던 원인. 클라이언트는 이 파일만 import 한다.
 */

/** 무료 사용자 월별 허용 횟수 (기능별 독립 카운트) */
export const MONTHLY_LIMIT = 3;

/** API 에러 응답용 — 두 라우트가 동일한 문구를 쓰도록 한 곳에서 관리한다 */
export const USAGE_LIMIT_EXCEEDED_ERROR = `이번 달 무료 분석 횟수(${MONTHLY_LIMIT}회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.`;

/** UI 안내용 (토스트/캡션) — 여러 컴포넌트가 동일한 문구를 쓰도록 한 곳에서 관리한다 */
export const USAGE_LIMIT_EXCEEDED_MESSAGE = `이번 달 무료 분석 횟수(${MONTHLY_LIMIT}회)를 모두 사용했어요. 다음 달 1일에 초기화돼요.`;

/**
 * 전역 예산이 바닥났을 때의 문구.
 *
 * 개인 한도 초과와 **다른 말을 해야 한다.** 횟수가 남아 있는데 "횟수를 다
 * 썼다"고 하면 사용자는 자기 화면(3/3 남음)과 어긋난 말을 듣고 고장으로 읽는다.
 * 서비스 사정이라는 것을 밝히되, 운영자의 지갑 사정까지 설명할 필요는 없다.
 */
export const BUDGET_EXCEEDED_ERROR =
  '이번 달 AI 분석이 모두 소진됐습니다. 다음 달 1일에 다시 열립니다.';

export const BUDGET_EXCEEDED_MESSAGE =
  '이번 달 AI 분석이 모두 소진됐어요. 다음 달 1일에 다시 열려요.';
