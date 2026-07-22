import { describe, it, expect } from 'vitest';

import { parseAdminEmails, isAdminEmail } from './config';

describe('parseAdminEmails', () => {
  it('빈 값이면 빈 배열', () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails('')).toEqual([]);
  });
  it('쉼표로 나누고 소문자·trim 정규화', () => {
    expect(parseAdminEmails(' A@x.com , b@Y.com ')).toEqual([
      'a@x.com',
      'b@y.com',
    ]);
  });
  it('빈 항목은 버린다', () => {
    expect(parseAdminEmails('a@x.com,,')).toEqual(['a@x.com']);
  });
});

describe('isAdminEmail', () => {
  const admins = ['a@x.com'];
  it('대소문자·공백 무시하고 매칭', () => {
    expect(isAdminEmail(' A@X.com ', admins)).toBe(true);
  });
  it('없는 이메일은 false', () => {
    expect(isAdminEmail('z@x.com', admins)).toBe(false);
  });
  it('null/undefined는 false', () => {
    expect(isAdminEmail(null, admins)).toBe(false);
    expect(isAdminEmail(undefined, admins)).toBe(false);
  });
});
