import { describe, expect, it } from 'vitest';

import { classifyFailure } from './getSentryIssues';

describe('classifyFailure', () => {
  it('401은 권한 문제로 분류한다', () => {
    expect(classifyFailure(401)).toEqual({ kind: 'forbidden' });
  });

  it('403도 권한 문제로 분류한다 (스코프가 모자란 토큰)', () => {
    expect(classifyFailure(403)).toEqual({ kind: 'forbidden' });
  });

  it('그 밖의 상태 코드는 일반 실패로 두고 코드를 보존한다', () => {
    expect(classifyFailure(500)).toEqual({ kind: 'error', status: 500 });
  });
});
