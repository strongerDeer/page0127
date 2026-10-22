import { describe, expect, it } from 'vitest';

import { computeFunnel, type FunnelBook } from './funnel';

const now = new Date('2026-10-22T03:00:00Z');
const book = (
  user_id: string,
  created_at: string,
  extra: Partial<FunnelBook> = {}
): FunnelBook => ({
  user_id,
  created_at,
  status: 'reading',
  one_line_review: null,
  ...extra,
});

describe('computeFunnel', () => {
  const signups = [
    { id: 'a', createdAt: '2026-10-01T00:00:00Z' },
    { id: 'b', createdAt: '2026-10-01T00:00:00Z' },
    { id: 'c', createdAt: '2026-10-01T00:00:00Z' },
    { id: 'd', createdAt: '2026-10-01T00:00:00Z' },
  ];

  it('단계별 인원과 가입·앞 단계 대비 비율', () => {
    const f = computeFunnel(
      signups,
      [
        book('a', '2026-10-01T01:00:00Z', {
          status: 'completed',
          one_line_review: '좋았다',
        }),
        book('b', '2026-10-05T00:00:00Z', { status: 'completed' }),
        book('c', '2026-10-01T02:00:00Z'),
        // 코호트 밖 사람의 책은 세지 않는다
        book('zz', '2026-10-01T02:00:00Z', { status: 'completed' }),
      ],
      now
    );
    expect(f.steps.map((s) => s.users)).toEqual([4, 3, 2, 1]);
    expect(f.steps[1].ofSignups).toBeCloseTo(0.75);
    expect(f.steps[2].ofPrev).toBeCloseTo(2 / 3);
    expect(f.steps[0].ofPrev).toBeNull();
  });

  it('24시간 안 첫 책은 가장 이른 책으로 판정한다', () => {
    const f = computeFunnel(
      signups,
      [
        book('a', '2026-10-01T23:00:00Z'),
        book('a', '2026-10-09T00:00:00Z'),
        book('b', '2026-10-03T00:00:00Z'),
      ],
      now
    );
    expect(f.activation24h).toEqual({ eligible: 4, activated: 1, rate: 0.25 });
  });

  it('가입 24시간이 안 지난 사람은 활성화 분모에서 뺀다', () => {
    const f = computeFunnel(
      [{ id: 'x', createdAt: '2026-10-21T20:00:00Z' }],
      [],
      now
    );
    expect(f.activation24h.eligible).toBe(0);
    expect(f.activation24h.rate).toBeNull();
  });

  it('공백뿐인 한줄 생각은 남긴 것으로 보지 않는다', () => {
    const f = computeFunnel(
      [signups[0]],
      [book('a', '2026-10-01T01:00:00Z', { one_line_review: '  ' })],
      now
    );
    expect(f.steps[3].users).toBe(0);
  });
});
