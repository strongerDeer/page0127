import { describe, expect, it } from 'vitest';

import { validateGuestNickname } from './guestNickname';

describe('비회원 닉네임 검사', () => {
  it('2~10자 한글·영문·숫자는 통과하고 앞뒤 공백은 지운다', () => {
    expect(validateGuestNickname('  여우  ')).toEqual({
      ok: true,
      nickname: '여우',
    });
    expect(validateGuestNickname('Rose27')).toEqual({
      ok: true,
      nickname: 'Rose27',
    });
  });

  it('길이가 맞지 않으면 거절한다', () => {
    expect(validateGuestNickname('여').ok).toBe(false);
    expect(validateGuestNickname('가'.repeat(11)).ok).toBe(false);
    expect(validateGuestNickname(undefined).ok).toBe(false);
  });

  it('공백·기호·이모지·자모만 쓴 이름은 거절한다(DB CHECK 와 같은 규칙)', () => {
    expect(validateGuestNickname('어린 왕자').ok).toBe(false);
    expect(validateGuestNickname('여우!').ok).toBe(false);
    expect(validateGuestNickname('여우🦊').ok).toBe(false);
    expect(validateGuestNickname('ㅋㅋㅋ').ok).toBe(false);
  });

  it('운영자 사칭·욕설은 거절한다(대소문자 무관)', () => {
    expect(validateGuestNickname('운영자').ok).toBe(false);
    expect(validateGuestNickname('Admin01').ok).toBe(false);
    expect(validateGuestNickname('page0127').ok).toBe(false);
    expect(validateGuestNickname('씨발').ok).toBe(false);
    // '시발점'처럼 뜻이 있는 말은 막지 않는다
    expect(validateGuestNickname('시발점').ok).toBe(true);
  });
});
