/**
 * OpenAI 클라이언트 설정
 *
 * 학습 포인트:
 * - 서버 사이드에서만 사용 (환경변수 OPENAI_API_KEY)
 * - gpt-4o 모델 사용 (아래 AI_MODEL 참고)
 * - API Route에서만 사용할 것
 */

import OpenAI from 'openai';

// 환경변수 체크
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
}

/**
 * OpenAI 클라이언트 인스턴스
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 사용할 AI 모델
 * gpt-4o-mini보다 추론/문장력이 좋아 취향분석·궁합 품질이 올라감
 * (건당 호출 1번뿐이라 비용 차이는 몇 원~수십 원 수준)
 */
export const AI_MODEL = 'gpt-4o' as const;

/**
 * 최대 토큰 수 (응답 길이 제한)
 * 한글은 토큰 소모가 커서 2000으로는 추천 15권 + 프로필 응답이
 * 중간에 잘릴 수 있음 → 4000으로 여유 확보
 */
export const MAX_TOKENS = 4000;

/**
 * 취향 분석 전용 상한 — 근거 책(evidence, 최대 5권 × 한 줄)이 더해져 응답이 300~400 토큰 길다.
 * 잘리면 JSON 이 깨져 분석 자체가 실패한다. 비용은 상한이 아니라 실제로 만든 토큰만큼 나간다.
 */
export const TASTE_ANALYSIS_MAX_TOKENS = 4800;

/**
 * Temperature (0-2, 낮을수록 일관적, 높을수록 창의적)
 */
export const TEMPERATURE = 0.7;
