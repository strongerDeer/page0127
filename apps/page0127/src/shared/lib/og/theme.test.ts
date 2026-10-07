import { describe, expect, it } from 'vitest';

import { textWidth, truncate } from './theme';

describe('textWidth', () => {
  it('한글은 글자당 1을 센다', () => {
    expect(textWidth('책장')).toBe(2);
  });

  it('라틴 글자는 한글의 절반 남짓으로 센다', () => {
    // 'stronger_deer'(13자)는 한글 8자보다 좁다 — 글자 수로 세면 억울하게 잘린다
    expect(textWidth('stronger_deer')).toBeCloseTo(7.15, 2);
    expect(textWidth('stronger_deer')).toBeLessThan(
      textWidth('가나다라마바사아')
    );
  });

  it('이모지는 정폭으로 센다', () => {
    expect(textWidth('📚')).toBe(1);
  });
});

describe('truncate', () => {
  it('폭이 한도 안이면 그대로 둔다', () => {
    expect(truncate('토지', 12)).toBe('토지');
  });

  it('영문 닉네임을 불필요하게 자르지 않는다', () => {
    // 이전 구현은 글자 수만 세어 stronger_deer(13자)를 'stronger_d…' 로 잘랐다
    expect(truncate('stronger_deer', 10)).toBe('stronger_deer');
  });

  it('폭이 한도를 넘으면 말줄임표를 붙인다', () => {
    const result = truncate('사피엔스 유인원에서 사이보그까지', 8);
    expect(result.endsWith('…')).toBe(true);
  });

  it('자른 결과가 한도를 넘지 않는다 — 말줄임표 폭까지 센다', () => {
    const result = truncate('가나다라마바사아자차카타파하', 6);
    expect(textWidth(result)).toBeLessThanOrEqual(6);
  });

  it('이모지를 반토막 내지 않는다', () => {
    // slice로 자르면 서로게이트 쌍이 쪼개져 깨진 문자가 남고,
    // 그 코드포인트가 폰트 subset 요청에까지 실려 간다
    expect(truncate('📚📖📕책장', 3)).toBe('📚📖…');
  });
});
