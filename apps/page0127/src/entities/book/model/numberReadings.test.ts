import { describe, expect, it } from 'vitest';

import { numberReadings } from './numberReadings';

type Row = {
  id: string;
  read_count: number;
  completed_date: string | null;
  created_at: string;
};

const createRow = (overrides: Partial<Row> = {}): Row => ({
  id: crypto.randomUUID(),
  read_count: 1,
  completed_date: '2026-01-01',
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('numberReadings', () => {
  it('저장된 회독 수가 모두 1이어도 읽은 순서대로 번호를 매긴다', () => {
    // 중복 감지가 ISBN 표기 차이로 빗나가면 재독인데도 둘 다 1 로 저장된다.
    // 목록이 "1회독 / 1회독" 이 되면 어느 쪽이 나중인지 알 수 없다.
    const rows = [
      createRow({ id: 'first', completed_date: '2025-09-12' }),
      createRow({ id: 'second', completed_date: '2026-05-08' }),
    ];

    expect(
      numberReadings(rows).map((row) => [row.id, row.reading_number])
    ).toEqual([
      ['second', 2],
      ['first', 1],
    ]);
  });

  it('최신 회독을 맨 위에 둔다', () => {
    const rows = [
      createRow({ id: 'old', completed_date: '2024-01-01' }),
      createRow({ id: 'new', completed_date: '2026-01-01' }),
      createRow({ id: 'mid', completed_date: '2025-01-01' }),
    ];

    expect(numberReadings(rows).map((row) => row.id)).toEqual([
      'new',
      'mid',
      'old',
    ]);
  });

  it('저장된 회독 수가 더 크면 그 값을 존중한다', () => {
    // 재독 다이얼로그로 제대로 3회독 등록했는데 방문자에게는 그 기록만
    // 공개된 경우 — 세는 값(1)으로 덮으면 회독 수가 되레 줄어든다
    const rows = [createRow({ id: 'only', read_count: 3 })];

    expect(numberReadings(rows)[0].reading_number).toBe(3);
  });

  it('번호는 항상 뒤로 갈수록 커진다', () => {
    // 저장값과 순번이 섞여도 같은 번호가 두 줄에 붙으면 안 된다
    const rows = [
      createRow({ id: 'a', read_count: 2, completed_date: '2024-01-01' }),
      createRow({ id: 'b', read_count: 1, completed_date: '2025-01-01' }),
      createRow({ id: 'c', read_count: 1, completed_date: '2026-01-01' }),
    ];

    expect(
      numberReadings(rows).map((row) => [row.id, row.reading_number])
    ).toEqual([
      ['c', 4],
      ['b', 3],
      ['a', 2],
    ]);
  });

  it('완독일이 없으면 등록 시각으로 순서를 정한다', () => {
    // 읽는 중인 회독은 완독일이 없다 — 등록 시각이 그 자리를 대신한다
    const rows = [
      createRow({
        id: 'reading',
        completed_date: null,
        created_at: '2026-06-01T00:00:00.000Z',
      }),
      createRow({
        id: 'done',
        completed_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00.000Z',
      }),
    ];

    expect(
      numberReadings(rows).map((row) => [row.id, row.reading_number])
    ).toEqual([
      ['reading', 2],
      ['done', 1],
    ]);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const rows = [
      createRow({ id: 'old', completed_date: '2024-01-01' }),
      createRow({ id: 'new', completed_date: '2026-01-01' }),
    ];

    numberReadings(rows);

    expect(rows.map((row) => row.id)).toEqual(['old', 'new']);
  });

  it('빈 목록은 빈 목록으로 돌려준다', () => {
    expect(numberReadings([])).toEqual([]);
  });
});
