import { describe, expect, it } from 'vitest';

import { profileHref, toDisplayName, toInitial } from './displayName';

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

  it('프로필 경로는 username으로만 만든다', () => {
    // 공개 서재는 /[username]에서 username 컬럼으로만 조회한다.
    // nickname('강혜진')이나 uuid로 링크를 만들면 404가 된다
    expect(profileHref({ id: 'uuid-1', username: 'dreamfulbud' })).toBe(
      '/dreamfulbud'
    );
  });

  it('username이 없으면 프로필 경로를 만들 수 없다', () => {
    expect(profileHref({ id: 'uuid-1', username: null })).toBeNull();
  });
});
