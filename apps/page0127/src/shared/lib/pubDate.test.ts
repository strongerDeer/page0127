import { describe, expect, it } from 'vitest';

import { normalizePubDate } from './pubDate';

describe('normalizePubDate', () => {
  it('YES24 형식을 저장 형식으로 바꾼다', () => {
    expect(normalizePubDate('20140519')).toBe('2014-05-19');
  });

  it('알라딘 형식은 이미 저장 형식이라 그대로 둔다', () => {
    // 이 assertion 이 잠그는 것: 기존 DB 행은 전부 이 형식이다. 통과시켜야
    // 백필이 기존 행의 출간일을 한 줄도 다시 쓰지 않는다.
    expect(normalizePubDate('2014-05-19')).toBe('2014-05-19');
  });

  it('점·슬래시 구분자도 하이픈으로 통일한다', () => {
    expect(normalizePubDate('2014.05.19')).toBe('2014-05-19');
    expect(normalizePubDate('2014/05/19')).toBe('2014-05-19');
  });

  it('값이 없으면 null이다', () => {
    expect(normalizePubDate(null)).toBeNull();
    expect(normalizePubDate(undefined)).toBeNull();
    expect(normalizePubDate('')).toBeNull();
    expect(normalizePubDate('   ')).toBeNull();
  });

  it('알아보지 못한 값은 버리지 않고 보존한다', () => {
    // 이 assertion 이 잠그는 버그: 정규화가 실패했다고 null 을 돌려주면,
    // 기존 DB 에 섞여 있는 '2014' 같은 값이 백필 한 번에 통째로 지워진다.
    // 출간일이 화면에서 조용히 사라지고, 무엇이 지워졌는지도 남지 않는다.
    expect(normalizePubDate('2014')).toBe('2014');
    expect(normalizePubDate('2014년 5월')).toBe('2014년 5월');
  });

  it('앞뒤 공백을 걷어낸다', () => {
    expect(normalizePubDate('  20140519  ')).toBe('2014-05-19');
  });

  it('두 번 돌려도 결과가 같다', () => {
    // 백필은 중간에 끊기면 다시 돌린다. 멱등하지 않으면 재실행마다 값이 달라진다.
    const once = normalizePubDate('20140519');
    expect(normalizePubDate(once)).toBe(once);
  });
});
