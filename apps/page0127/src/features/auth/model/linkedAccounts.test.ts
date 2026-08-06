import { describe, expect, it } from 'vitest';

import {
  canUnlink,
  toLinkedAccountRows,
  UNLINK_BLOCKED_MESSAGE,
} from './linkedAccounts';

/** 테스트용 identity — 판정에 쓰는 필드만 담는다 */
const identity = (provider: string) => ({ provider });

describe('canUnlink', () => {
  it('연결이 둘 이상이면 해제할 수 있다', () => {
    expect(canUnlink([identity('google'), identity('kakao')])).toBe(true);
  });

  it('연결이 하나뿐이면 해제할 수 없다', () => {
    // 마지막 하나를 끊으면 로그인할 수단이 사라져 계정이 잠긴다
    expect(canUnlink([identity('google')])).toBe(false);
  });

  it('연결이 없으면 해제할 수 없다', () => {
    expect(canUnlink([])).toBe(false);
  });

  it('셋 이상이어도 해제할 수 있다', () => {
    expect(
      canUnlink([identity('google'), identity('kakao'), identity('email')])
    ).toBe(true);
  });
});

describe('toLinkedAccountRows', () => {
  it('연결된 것과 안 된 것을 모두 돌려준다', () => {
    // 화면은 "연결 안 됨"도 보여 줘야 사용자가 연결할 수 있다
    const rows = toLinkedAccountRows([identity('google')]);

    expect(rows).toEqual([
      { provider: 'kakao', isLinked: false, canUnlink: false },
      { provider: 'google', isLinked: true, canUnlink: false },
    ]);
  });

  it('둘 다 연결돼 있으면 둘 다 해제할 수 있다', () => {
    const rows = toLinkedAccountRows([identity('google'), identity('kakao')]);

    expect(rows).toEqual([
      { provider: 'kakao', isLinked: true, canUnlink: true },
      { provider: 'google', isLinked: true, canUnlink: true },
    ]);
  });

  it('연결이 하나도 없으면 아무것도 해제할 수 없다', () => {
    expect(toLinkedAccountRows([])).toEqual([
      { provider: 'kakao', isLinked: false, canUnlink: false },
      { provider: 'google', isLinked: false, canUnlink: false },
    ]);
  });

  it('우리가 모르는 공급자는 목록에 넣지 않는다', () => {
    // Supabase 는 email·phone identity 도 돌려준다. 화면에 낼 게 아니면 버린다.
    const rows = toLinkedAccountRows([identity('google'), identity('email')]);

    expect(rows.map((r) => r.provider)).toEqual(['kakao', 'google']);
  });

  it('모르는 공급자도 해제 가능 판정에는 포함된다', () => {
    // 화면에 안 보인다고 로그인 수단이 아닌 것은 아니다 —
    // email identity 가 남아 있으면 구글을 끊어도 계정이 잠기지 않는다
    const rows = toLinkedAccountRows([identity('google'), identity('email')]);

    expect(rows.find((r) => r.provider === 'google')?.canUnlink).toBe(true);
  });

  it('화면 순서는 로그인 화면과 같다 (카카오 먼저)', () => {
    expect(toLinkedAccountRows([]).map((r) => r.provider)).toEqual([
      'kakao',
      'google',
    ]);
  });
});

describe('UNLINK_BLOCKED_MESSAGE', () => {
  it('왜 못 끊는지 이유를 담는다', () => {
    // 버튼만 비활성으로 두면 사용자는 고장으로 읽는다
    expect(UNLINK_BLOCKED_MESSAGE).toContain('로그인');
  });
});
