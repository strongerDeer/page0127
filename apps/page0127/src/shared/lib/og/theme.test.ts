import { describe, expect, it } from 'vitest';

import { BOOK_SPINES, shelfTitleFontSize, spinesFor, truncate } from './theme';

describe('spinesFor', () => {
  it('권수만큼 책등을 세운다', () => {
    expect(spinesFor(3)).toHaveLength(3);
  });

  it('0권이면 빈 선반이 남는다', () => {
    expect(spinesFor(0)).toHaveLength(0);
  });

  it('책이 많아도 선반 너비를 넘지 않는다', () => {
    expect(spinesFor(500)).toHaveLength(BOOK_SPINES.length);
  });

  it('음수가 들어와도 빈 배열이다', () => {
    // count 조회가 실패하면 호출부가 0을 넘기지만, 계산 결과가 음수로 흘러들 수도 있다.
    // 음수를 slice에 그대로 넘기면 배열 뒤에서부터 잘려 책등이 되살아난다.
    expect(spinesFor(-1)).toHaveLength(0);
  });
});

describe('truncate', () => {
  it('한도 안이면 그대로 둔다', () => {
    expect(truncate('토지', 12)).toBe('토지');
  });

  it('한도를 넘으면 말줄임표를 붙인다', () => {
    expect(truncate('사피엔스: 유인원에서 사이보그까지', 6)).toBe(
      '사피엔스: …'
    );
  });

  it('이모지를 반토막 내지 않는다', () => {
    // slice(0, 2)로 자르면 서로게이트 쌍이 쪼개져 깨진 문자가 남고,
    // 그 코드포인트가 폰트 subset 요청에까지 실려 간다
    expect(truncate('📚📖책', 2)).toBe('📚📖…');
  });
});

describe('shelfTitleFontSize', () => {
  it('짧은 이름은 크게 쓴다', () => {
    // '책읽는고양이님의' = 8자
    expect(shelfTitleFontSize(8)).toBe(64);
  });

  it('한 줄에 들어오는 한계까지는 크기를 유지한다', () => {
    expect(shelfTitleFontSize(10)).toBe(64);
  });

  it('한계를 넘으면 줄이 접히기 전에 글자를 줄인다', () => {
    // 줄이 접히면 "책장"이 셋째 줄로 밀려 카드가 어색해진다
    expect(shelfTitleFontSize(11)).toBe(48);
  });

  it('잘린 이름의 최대 길이(10자 + 말줄임표 + 님의)도 한 줄에 들어간다', () => {
    expect(shelfTitleFontSize(13)).toBe(48);
  });
});
