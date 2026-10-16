import { describe, expect, it } from 'vitest';

import { buildIssuesUrl, classifyFailure } from './getSentryIssues';

describe('buildIssuesUrl', () => {
  it('운영 환경은 production — SDK v11(9/28)부터 vercel-production 이 아니라 production 으로 쌓인다', () => {
    // 2026-10-16 실측(미해결): vercel-production 0건 · production 7건 · 둘 다 0건.
    // 옛 이름을 함께 넣으면 Sentry 가 아무것도 주지 않는다 → production 하나만.
    const url = buildIssuesUrl();
    expect(url.searchParams.getAll('environment')).toEqual(['production']);
  });

  it('미해결 이슈만, 전체 기간, 100건까지', () => {
    const url = buildIssuesUrl();
    expect(url.pathname).toBe('/api/0/projects/stronger/page0127/issues/');
    expect(url.searchParams.get('query')).toBe('is:unresolved');
    expect(url.searchParams.get('statsPeriod')).toBe('');
    expect(url.searchParams.get('limit')).toBe('100');
  });
});

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
