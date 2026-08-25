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

  // 2026-08-18~22 실제로 랭킹 스냅샷 크론이 5일 연속 실패했는데, 메시지가 한글이라
  // 로그성으로 묻혀 아무도 몰랐다. 같은 크론 실패라도 알림 정리 쪽은 메시지가
  // 영어라 지켜보기로 올라왔다 — 언어가 등급을 가르면 안 된다.
  describe('크론 실패는 한글이어도 묻지 않는다', () => {
    const cronIssue = (over: Partial<SentryIssue> = {}) =>
      issue({
        culprit: 'GET /api/cron/snapshot-rankings',
        title: 'API Error (500): 랭킹 스냅샷에 실패했습니다: upstream connect error',
        metadata: undefined,
        firstSeen: '2026-08-18T16:09:00Z',
        lastSeen: '2026-08-20T16:09:00Z',
        ...over,
      });

    it('랭킹 스냅샷 실패는 로그성으로 내려가지 않는다', () => {
      expect(triage(cronIssue(), at('2026-08-21T00:00:00Z'))).not.toBe('log');
    });

    it('알림 정리도 같은 크론이라 함께 다룬다', () => {
      expect(
        triage(
          cronIssue({ culprit: 'GET /api/notifications/cleanup' }),
          at('2026-08-21T00:00:00Z')
        )
      ).not.toBe('log');
    });

    it('레이트리밋 정리도 크론 목록에 있다', () => {
      expect(
        triage(
          cronIssue({ culprit: 'GET /api/cron/cleanup-rate-limits' }),
          at('2026-08-21T00:00:00Z')
        )
      ).not.toBe('log');
    });

    it('크론이 아닌 한글 메시지는 그대로 로그성이다', () => {
      expect(
        triage(
          cronIssue({ culprit: 'GET /', title: '[banner] 슬라이드 조회 실패: timeout' }),
          at('2026-08-21T00:00:00Z')
        )
      ).toBe('log');
    });

    it('크론 실패도 7일 넘게 조용하면 잠잠해짐으로 간다', () => {
      expect(triage(cronIssue(), at('2026-08-30T00:00:00Z'))).toBe('quiet');
    });

    it('크론이라도 노이즈 패턴이면 노이즈다', () => {
      expect(
        triage(
          cronIssue({ title: 'AbortError: The user aborted a request.' }),
          at('2026-08-21T00:00:00Z')
        )
      ).toBe('noise');
    });
  });
});
