import { describe, expect, it } from 'vitest';

import {
  countVisitedSince,
  parseMemberSort,
  signupNumbers,
  sortMembers,
} from './memberList';

const m = (
  id: string,
  createdAt: string,
  lastVisit: string | null,
  activeDays = 0
) => ({ id, createdAt, lastVisit, activeDays });

const members = [
  m('a', '2026-10-01T00:00:00Z', '2026-11-20', 3),
  m('b', '2026-10-05T00:00:00Z', null, 0),
  m('c', '2026-10-03T00:00:00Z', '2026-11-23', 3),
  m('d', '2026-10-10T00:00:00Z', '2026-11-01', 10),
];

describe('signupNumbers', () => {
  it('가장 먼저 가입한 사람이 1번이다', () => {
    const n = signupNumbers(members);
    expect([n.get('a'), n.get('c'), n.get('b'), n.get('d')]).toEqual([
      1, 2, 3, 4,
    ]);
  });
});

describe('sortMembers', () => {
  it('가입순은 최신 가입이 먼저', () => {
    expect(sortMembers(members, 'joined').map((x) => x.id)).toEqual([
      'd',
      'b',
      'c',
      'a',
    ]);
  });
  it('최근 접속순은 방문 없는 사람을 맨 뒤로', () => {
    expect(sortMembers(members, 'recent').map((x) => x.id)).toEqual([
      'c',
      'a',
      'd',
      'b',
    ]);
  });
  it('활동일 순은 같은 활동일이면 최근 접속이 먼저', () => {
    expect(sortMembers(members, 'active').map((x) => x.id)).toEqual([
      'd',
      'c',
      'a',
      'b',
    ]);
  });
  it('원본 배열을 바꾸지 않는다', () => {
    const before = members.map((x) => x.id);
    sortMembers(members, 'recent');
    expect(members.map((x) => x.id)).toEqual(before);
  });
});

describe('countVisitedSince', () => {
  it('시작일 이후(그날 포함) 방문한 사람만 센다', () => {
    expect(countVisitedSince(members, '2026-11-20')).toBe(2);
    expect(countVisitedSince(members, '2026-10-25')).toBe(3);
  });
});

describe('parseMemberSort', () => {
  it('모르는 값은 가입순', () => {
    expect(parseMemberSort('recent')).toBe('recent');
    expect(parseMemberSort('active')).toBe('active');
    expect(parseMemberSort('hack')).toBe('joined');
    expect(parseMemberSort(undefined)).toBe('joined');
  });
});
