/**
 * OpenAI 클라이언트 설정
 *
 * 학습 포인트:
 * - 서버 사이드에서만 사용 (환경변수 OPENAI_API_KEY)
 * - GPT-4o-mini 모델 사용 (비용 효율적)
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
 * Temperature (0-2, 낮을수록 일관적, 높을수록 창의적)
 */
export const TEMPERATURE = 0.7;
