import { describe, expect, it } from 'vitest';

import { isNextControlFlowError } from './sentryControlFlowFilter';

const withDigest = (digest: string) =>
  Object.assign(new Error(digest), { digest });

describe('isNextControlFlowError', () => {
  it('notFound() 404 는 제어 흐름이다', () => {
    expect(
      isNextControlFlowError(withDigest('NEXT_HTTP_ERROR_FALLBACK;404'))
    ).toBe(true);
    expect(isNextControlFlowError(withDigest('NEXT_NOT_FOUND'))).toBe(true);
  });

  it('forbidden()·unauthorized() 도 제어 흐름이다', () => {
    expect(
      isNextControlFlowError(withDigest('NEXT_HTTP_ERROR_FALLBACK;403'))
    ).toBe(true);
    expect(
      isNextControlFlowError(withDigest('NEXT_HTTP_ERROR_FALLBACK;401'))
    ).toBe(true);
  });

  it('redirect() 도 제어 흐름이다', () => {
    expect(
      isNextControlFlowError(withDigest('NEXT_REDIRECT;replace;/login;307;'))
    ).toBe(true);
  });

  it('cause 로 감싸져 있어도 알아본다', () => {
    const wrapped = new Error('렌더 실패', {
      cause: withDigest('NEXT_HTTP_ERROR_FALLBACK;404'),
    });
    expect(isNextControlFlowError(wrapped)).toBe(true);
  });

  it('진짜 오류는 통과시킨다 — digest 가 있어도 제어 흐름이 아니면 올린다', () => {
    expect(
      isNextControlFlowError(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))
    ).toBe(false);
    expect(isNextControlFlowError(withDigest('3141592653'))).toBe(false);
    expect(isNextControlFlowError(new TypeError('x is undefined'))).toBe(false);
  });

  it('에러가 아니면 판별하지 않는다', () => {
    expect(isNextControlFlowError('NEXT_HTTP_ERROR_FALLBACK;404')).toBe(false);
    expect(isNextControlFlowError(undefined)).toBe(false);
  });
});
