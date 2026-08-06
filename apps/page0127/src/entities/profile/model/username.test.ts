import { describe, expect, it } from 'vitest';

import {
  generateUsernameSeed,
  normalizeUsername,
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  validateUsername,
} from './username';

describe('normalizeUsername', () => {
  it('앞뒤 공백을 없애고 소문자로 낮춘다', () => {
    expect(normalizeUsername('  BookWorm  ')).toBe('bookworm');
  });
});

describe('validateUsername', () => {
  it('규칙에 맞으면 다듬어진 값을 돌려준다', () => {
    expect(validateUsername('Book_Worm12')).toEqual({
      ok: true,
      value: 'book_worm12',
    });
  });

  it('빈 값과 공백만 있는 값을 막는다', () => {
    expect(validateUsername('')).toMatchObject({ ok: false, issue: 'empty' });
    expect(validateUsername('   ')).toMatchObject({ ok: false, issue: 'empty' });
  });

  it('3자 미만을 막는다', () => {
    expect(validateUsername('ab')).toMatchObject({
      ok: false,
      issue: 'too_short',
    });
  });

  it('20자를 넘으면 막는다', () => {
    expect(validateUsername('a'.repeat(21))).toMatchObject({
      ok: false,
      issue: 'too_long',
    });
    // 경계값 — 정확히 20자는 통과해야 한다
    expect(validateUsername('a'.repeat(20)).ok).toBe(true);
  });

  it('하이픈·점·한글·공백처럼 URL에서 흔들리는 문자를 막는다', () => {
    for (const bad of ['my-name', 'my.name', '책벌레', 'book worm', 'a@b']) {
      expect(validateUsername(bad)).toMatchObject({
        ok: false,
        issue: 'invalid_chars',
      });
    }
  });

  it('라우트와 충돌하는 예약어를 막는다', () => {
    // 'about' 을 쓰면 그 사람의 공개 서재가 소개 페이지에 가려진다
    for (const reserved of ['about', 'settings', 'admin', 'books', 'login']) {
      expect(validateUsername(reserved)).toMatchObject({
        ok: false,
        issue: 'reserved',
      });
    }
  });

  it('예약어를 막는 이유는 밝히지 않는다', () => {
    // "서비스가 쓰고 있다"고 알려 주면 RESERVED_USERNAMES 가 곧 라우트 지도가 된다 —
    // 아이디를 하나씩 넣어 보는 것만으로 admin·api 같은 경로의 존재를 확인할 수 있다.
    const result = validateUsername('admin');
    const message = result.ok ? '' : result.message;

    for (const leak of ['서비스', '관리자', '경로', '주소']) {
      expect(message).not.toContain(leak);
    }
    // 그래도 무엇을 하면 되는지는 알려 줘야 한다
    expect(message).toContain('다른 아이디');
  });

  it('대문자로 친 예약어도 막는다 (소문자로 낮춘 뒤 판정한다)', () => {
    expect(validateUsername('ADMIN')).toMatchObject({
      ok: false,
      issue: 'reserved',
    });
  });

  it('길이와 문자가 둘 다 틀리면 길이를 먼저 알려 준다', () => {
    // 'a!' 는 짧기도 하고 문자도 틀렸다. 고치기 쉬운 쪽을 먼저 말한다.
    expect(validateUsername('a!')).toMatchObject({
      ok: false,
      issue: 'too_short',
    });
  });
});

describe('generateUsernameSeed', () => {
  it('이메일 앞부분을 1순위로 쓴다', () => {
    expect(
      generateUsernameSeed({ email: 'bookworm@gmail.com', nickname: '책벌레' })
    ).toBe('bookworm');
  });

  it('허용되지 않는 문자를 걸러 낸다', () => {
    expect(generateUsernameSeed({ email: 'hong.gil-dong@gmail.com' })).toBe(
      'honggildong'
    );
  });

  it('20자를 넘으면 잘라 낸다', () => {
    const email = `${'a'.repeat(30)}@gmail.com`;
    expect(generateUsernameSeed({ email })).toHaveLength(USERNAME_MAX_LENGTH);
  });

  it('이메일이 없으면 닉네임에서 뽑는다 (이메일 미동의 카카오)', () => {
    expect(generateUsernameSeed({ email: null, nickname: 'bookworm' })).toBe(
      'bookworm'
    );
  });

  it('이메일에서 못 건지면 닉네임으로 넘어간다', () => {
    // 한글 주소라 1순위가 비고, 2순위 닉네임이 규칙을 통과한다
    expect(
      generateUsernameSeed({ email: '한글이름@naver.com', nickname: 'reader99' })
    ).toBe('reader99');
  });

  it('둘 다 못 쓰면 reader 로 떨어진다', () => {
    // 예전 구현은 여기서 '' 를 돌려줘 로그인 후 / 로 튕겼다
    expect(
      generateUsernameSeed({ email: '한글이름@naver.com', nickname: '책벌레' })
    ).toBe('reader');
    expect(generateUsernameSeed({})).toBe('reader');
    expect(generateUsernameSeed({ email: null, nickname: null })).toBe('reader');
  });

  it('너무 짧거나 예약어인 후보는 건너뛴다', () => {
    expect(generateUsernameSeed({ email: 'ab@gmail.com' })).toBe('reader');
    expect(generateUsernameSeed({ email: 'admin@gmail.com' })).toBe('reader');
    // 1순위가 예약어라도 2순위가 멀쩡하면 그쪽을 쓴다
    expect(
      generateUsernameSeed({ email: 'admin@gmail.com', nickname: 'bookworm' })
    ).toBe('bookworm');
  });

  it('결과는 항상 형식 규칙을 통과한다', () => {
    const sources = [
      { email: 'bookworm@gmail.com' },
      { email: '한글@naver.com' },
      { email: 'ab@x.com' },
      { email: 'admin@x.com' },
      { email: '...@x.com' },
      { email: `${'z'.repeat(40)}@x.com` },
      { nickname: '책벌레' },
      { nickname: 'a' },
      {},
    ];
    for (const source of sources) {
      expect(validateUsername(generateUsernameSeed(source)).ok).toBe(true);
    }
  });
});

describe('RESERVED_USERNAMES', () => {
  it('전부 소문자다 (판정 전에 소문자로 낮추므로 대문자가 섞이면 영영 안 걸린다)', () => {
    for (const word of RESERVED_USERNAMES) {
      expect(word).toBe(word.toLowerCase());
    }
  });
});
