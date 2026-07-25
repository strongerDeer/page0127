import { describe, expect, it } from 'vitest';

import { type SentryIssue,triage } from './triage';

// 실측 이슈(2026-07-23 발생)를 기준으로 삼는다. 필드는 판정에 쓰는 것만 채운다.
const issue = (over: Partial<SentryIssue> = {}): SentryIssue => ({
  id: '7628533891',
  shortId: 'PAGE0127-7',
  title: "TypeError: Cannot read properties of null (reading 'id')",
  culprit: 'GET /dashboard',
  level: 'error',
  count: '1',
  firstSeen: '2026-07-23T08:45:41.688000Z',
  lastSeen: '2026-07-23T08:45:41.688000Z',
  permalink: 'https://stronger.sentry.io/issues/7628533891/',
  metadata: { type: 'TypeError', value: "Cannot read properties of null (reading 'id')" },
  ...over,
});

const at = (iso: string) => new Date(iso);

describe('triage', () => {
  it('2일 전 1회 발생한 실측 이슈는 지켜보기', () => {
    expect(triage(issue(), at('2026-07-25T00:00:00Z'))).toBe('watch');
  });

  it('같은 이슈도 11일 뒤 기준으로 보면 잠잠해짐', () => {
    expect(triage(issue(), at('2026-08-05T00:00:00Z'))).toBe('quiet');
  });

  it('12시간 전에 발생했으면 긴급', () => {
    expect(
      triage(issue({ lastSeen: '2026-07-24T12:00:00Z' }), at('2026-07-25T00:00:00Z'))
    ).toBe('urgent');
  });

  it('3일 이상 이어지고 있으면 긴급', () => {
    expect(
      triage(
        issue({ firstSeen: '2026-07-20T00:00:00Z', lastSeen: '2026-07-23T12:00:00Z' }),
        at('2026-07-25T00:00:00Z')
      )
    ).toBe('urgent');
  });

  it('fatal은 긴급', () => {
    expect(triage(issue({ level: 'fatal' }), at('2026-07-25T00:00:00Z'))).toBe('urgent');
  });

  it.each([
    'ResizeObserver loop completed with undelivered notifications.',
    'AbortError: The user aborted a request.',
    'Error at chrome-extension://abcdef/inject.js',
    'NEXT_REDIRECT',
    'Non-Error promise rejection captured with value: undefined',
  ])('노이즈 패턴은 무시: %s', (value) => {
    expect(triage(issue({ metadata: { value } }), at('2026-07-25T00:00:00Z'))).toBe('noise');
  });

  it('하이드레이션 불일치는 진짜 버그라 노이즈로 묻지 않는다', () => {
    const value = 'Text content does not match server-rendered HTML. ResizeObserver loop';
    expect(triage(issue({ metadata: { value } }), at('2026-07-25T00:00:00Z'))).not.toBe('noise');
  });

  it('한글이 섞인 메시지는 우리가 남긴 로그', () => {
    expect(
      triage(issue({ metadata: { value: '도서 검색 실패: timeout' } }), at('2026-07-25T00:00:00Z'))
    ).toBe('log');
  });

  it('영어뿐인 크래시는 로그로 분류하지 않는다', () => {
    expect(triage(issue(), at('2026-07-25T00:00:00Z'))).not.toBe('log');
  });

  it('metadata.value가 없으면 title로 판정한다', () => {
    expect(
      triage(
        issue({ title: 'Error: 프로필 저장 실패', metadata: undefined }),
        at('2026-07-25T00:00:00Z')
      )
    ).toBe('log');
  });
});
