import { describe, expect, it } from 'vitest';

import {
  generateUsernameFromEmail,
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

describe('generateUsernameFromEmail', () => {
  it('이메일 앞부분을 쓴다', () => {
    expect(generateUsernameFromEmail('bookworm@gmail.com')).toBe('bookworm');
  });

  it('허용되지 않는 문자를 걸러 낸다', () => {
    expect(generateUsernameFromEmail('hong.gil-dong@gmail.com')).toBe(
      'honggildong'
    );
  });

  it('20자를 넘으면 잘라 낸다', () => {
    const long = `${'a'.repeat(30)}@gmail.com`;
    expect(generateUsernameFromEmail(long)).toHaveLength(USERNAME_MAX_LENGTH);
  });

  it('ASCII가 하나도 없는 주소에서 빈 문자열을 만들지 않는다', () => {
    // 기존 구현은 여기서 '' 를 돌려줘 로그인 후 / 로 튕겼다
    expect(generateUsernameFromEmail('한글이름@naver.com')).toBe('reader');
  });

  it('너무 짧은 앞부분은 쓰지 않는다', () => {
    expect(generateUsernameFromEmail('ab@gmail.com')).toBe('reader');
  });

  it('예약어와 겹치는 앞부분은 쓰지 않는다', () => {
    expect(generateUsernameFromEmail('admin@gmail.com')).toBe('reader');
  });

  it('결과는 항상 형식 규칙을 통과한다', () => {
    const emails = [
      'bookworm@gmail.com',
      '한글@naver.com',
      'ab@x.com',
      'admin@x.com',
      '...@x.com',
      `${'z'.repeat(40)}@x.com`,
    ];
    for (const email of emails) {
      expect(validateUsername(generateUsernameFromEmail(email)).ok).toBe(true);
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
