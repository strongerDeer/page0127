import { APIError } from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import { isUnbilledAiFailure } from './aiUsage';

/** Claude SDK가 실제로 던지는 형태의 에러를 만든다 */
const apiError = (status: number | undefined) =>
  new APIError(status, undefined, 'test error', undefined);

describe('isUnbilledAiFailure', () => {
  it('잘못된 API 키(401)는 과금이 없으므로 환불 대상이다', () => {
    expect(isUnbilledAiFailure(apiError(401))).toBe(true);
  });

  it('잔액 부족·요청 한도(429)는 과금이 없으므로 환불 대상이다', () => {
    expect(isUnbilledAiFailure(apiError(429))).toBe(true);
  });

  it('잘못된 요청(400)은 과금이 없으므로 환불 대상이다', () => {
    expect(isUnbilledAiFailure(apiError(400))).toBe(true);
  });

  it('요청 타임아웃(408)은 생성 중 끊겼을 수 있어 환불하지 않는다', () => {
    expect(isUnbilledAiFailure(apiError(408))).toBe(false);
  });

  it('서버 오류(500)는 토큰이 소비됐을 수 있어 환불하지 않는다', () => {
    expect(isUnbilledAiFailure(apiError(500))).toBe(false);
  });

  it('status를 알 수 없는 APIError는 환불하지 않는다', () => {
    expect(isUnbilledAiFailure(apiError(undefined))).toBe(false);
  });

  it('Claude가 아닌 오류(응답 파싱 실패 등)는 환불하지 않는다', () => {
    expect(isUnbilledAiFailure(new Error('AI 응답이 없습니다.'))).toBe(false);
    expect(isUnbilledAiFailure(new SyntaxError('Unexpected token'))).toBe(
      false
    );
    expect(isUnbilledAiFailure(null)).toBe(false);
  });
});
