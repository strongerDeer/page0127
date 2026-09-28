import { describe, expect, it } from 'vitest';

import {
  nameInitials,
  profileHref,
  toDisplayName,
  toInitial,
} from './displayName';

describe('displayName', () => {
  it('nickname이 있으면 nickname을 쓴다', () => {
    expect(toDisplayName({ nickname: '강혜진', username: 'dreamfulbud' })).toBe(
      '강혜진'
    );
  });

  it('nickname이 없으면 username으로 대체한다', () => {
    // 가입 직후에는 nickname이 null이다. username은 항상 있으므로 '익명'까지 가면 안 된다
    expect(toDisplayName({ nickname: null, username: 'dreamfulbud' })).toBe(
      'dreamfulbud'
    );
  });

  it('공백만 있는 nickname은 없는 것으로 본다', () => {
    expect(toDisplayName({ nickname: '   ', username: 'dreamfulbud' })).toBe(
      'dreamfulbud'
    );
  });

  it('둘 다 없을 때만 익명으로 떨어진다', () => {
    expect(toDisplayName({ nickname: null, username: null })).toBe('익명');
  });

  it('이니셜은 표시 이름의 첫 글자를 대문자로 만든다', () => {
    expect(toInitial({ nickname: null, username: 'dreamfulbud' })).toBe('D');
    expect(toInitial({ nickname: '강혜진', username: 'dreamfulbud' })).toBe(
      '강'
    );
  });

  it('이니셜은 이름이 없으면 물음표가 아니라 U를 쓴다', () => {
    // 아바타 자리에 '?'가 뜨면 오류로 보인다
    expect(toInitial({ nickname: null, username: null })).toBe('U');
  });

  it('이모지 닉네임의 이니셜이 반토막 나지 않는다', () => {
    // 이 assertion 이 잠그는 버그: '🫥' 는 서로게이트 쌍(길이 2)이라
    // charAt(0)·[0] 로 자르면 앞쪽 반쪽(U+D83E)만 남는다. 그 단독 서로게이트는
    // 서버가 HTML 로 내보내는 순간 U+FFFD 로 바뀌는데 클라이언트는 원본을
    // 그대로 들고 있어, 렌더 결과가 달라지며 **hydration 이 깨진다**.
    // 2026-09-28 실제 발생 (nickname 이 '🫥' 인 계정).
    expect(toInitial({ nickname: '🫥', username: 'dreamfulbud' })).toBe('🫥');
    expect(toInitial({ nickname: '👩‍💻 개발자', username: null })).toBe('👩');
  });

  it('두 글자 이니셜도 서로게이트를 쪼개지 않는다', () => {
    expect(nameInitials('🫥🙂', 2)).toBe('🫥🙂');
    expect(nameInitials('강혜진', 2)).toBe('강혜');
  });

  it('두 글자 이니셜은 이름이 짧으면 있는 만큼만 쓴다', () => {
    expect(nameInitials('A', 2)).toBe('A');
    expect(nameInitials(null, 2)).toBe('U');
  });

  it('프로필 경로는 username으로만 만든다', () => {
    // 공개 서재는 /[username]에서 username 컬럼으로만 조회한다.
    // nickname('강혜진')이나 uuid로 링크를 만들면 404가 된다
    expect(profileHref('dreamfulbud')).toBe('/dreamfulbud');
  });

  it('username이 없으면 프로필 경로를 만들 수 없다', () => {
    expect(profileHref(null)).toBeNull();
    expect(profileHref('  ')).toBeNull();
  });
});
