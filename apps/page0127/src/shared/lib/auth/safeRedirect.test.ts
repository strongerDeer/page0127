import { describe, expect, it } from 'vitest';

import { toSafeRedirect } from './safeRedirect';

describe('toSafeRedirect', () => {
  it('내부 경로는 그대로 통과시킨다', () => {
    expect(toSafeRedirect('/books/info/abc')).toBe('/books/info/abc');
    expect(toSafeRedirect('/dreamfulbud/book-id')).toBe('/dreamfulbud/book-id');
  });

  it('쿼리와 해시를 붙인 내부 경로도 유지한다', () => {
    expect(toSafeRedirect('/search?q=카프카#top')).toBe('/search?q=카프카#top');
  });

  it('값이 없으면 null', () => {
    expect(toSafeRedirect(null)).toBeNull();
    expect(toSafeRedirect('')).toBeNull();
  });

  // 오픈 리다이렉트 방어 — 여기를 통과시키면 로그인 직후 외부 사이트로 튕겨나간다
  it('절대 URL은 막는다', () => {
    expect(toSafeRedirect('https://evil.com')).toBeNull();
    expect(toSafeRedirect('http://evil.com/path')).toBeNull();
  });

  it('프로토콜 상대 URL(//, /\\)은 막는다', () => {
    // 브라우저는 //evil.com 을 현재 프로토콜의 외부 주소로 해석한다
    expect(toSafeRedirect('//evil.com')).toBeNull();
    // 일부 브라우저는 백슬래시를 슬래시처럼 다룬다
    expect(toSafeRedirect('/\\evil.com')).toBeNull();
    expect(toSafeRedirect('/\\\\evil.com')).toBeNull();
  });

  it('슬래시로 시작하지 않는 값은 막는다', () => {
    expect(toSafeRedirect('books/all')).toBeNull();
    expect(toSafeRedirect('javascript:alert(1)')).toBeNull();
  });

  it('앞뒤 공백이 섞인 우회 시도를 막는다', () => {
    // ' //evil.com' 처럼 공백을 앞에 붙이면 startsWith('//') 검사를 피할 수 있다
    expect(toSafeRedirect(' //evil.com')).toBeNull();
    expect(toSafeRedirect('\t/books/all')).toBe('/books/all');
  });

  it('로그인 페이지로 돌려보내지 않는다 (무한 왕복 방지)', () => {
    expect(toSafeRedirect('/login')).toBeNull();
    expect(toSafeRedirect('/login?redirect=/feed')).toBeNull();
  });
});
