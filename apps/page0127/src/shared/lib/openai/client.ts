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
 * 사용할 AI 모델 (GPT-4o-mini: 비용 효율적)
 */
export const AI_MODEL = 'gpt-4o-mini' as const;

/**
 * 최대 토큰 수 (응답 길이 제한)
 */
export const MAX_TOKENS = 2000;

/**
 * Temperature (0-2, 낮을수록 일관적, 높을수록 창의적)
 */
export const TEMPERATURE = 0.7;
