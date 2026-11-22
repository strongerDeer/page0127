import { describe, expect, it } from 'vitest';

import {
  bookMetaTitle,
  META_TITLE_MAX,
  primaryAuthor,
  stripSubtitle,
} from './bookMetaTitle';

describe('stripSubtitle', () => {
  it('" - " 뒤 부제를 뗀다', () => {
    expect(
      stripSubtitle(
        '생각의 탄생 - 다빈치에서 파인먼까지 창조성을 빛낸 사람들의 13가지 생각도구'
      )
    ).toBe('생각의 탄생');
  });

  it('끝에 붙은 판 표기 괄호를 뗀다', () => {
    expect(
      stripSubtitle(
        '나는 메트로폴리탄 미술관의 경비원입니다 (25만 부 기념 전면 개정판)'
      )
    ).toBe('나는 메트로폴리탄 미술관의 경비원입니다');
  });

  it('제목 가운데 괄호는 남긴다', () => {
    expect(stripSubtitle('아웃풋×성과 (도감) 시리즈')).toBe(
      '아웃풋×성과 (도감) 시리즈'
    );
  });

  it('다 떼면 비는 제목은 원래대로', () => {
    expect(stripSubtitle('(개정판)')).toBe('(개정판)');
  });
});

describe('primaryAuthor', () => {
  it('알라딘식 "(지은이)" 표기에서 첫 사람만', () => {
    expect(
      primaryAuthor(
        '로버트 루트번스타인, 미셸 루트번스타인 (지은이), 박종성 (옮긴이)'
      )
    ).toBe('로버트 루트번스타인');
  });

  it('YES24식 "저/역" 표기에서 첫 사람만', () => {
    expect(primaryAuthor('패트릭 브링리 저/김희정,조현주 역')).toBe(
      '패트릭 브링리'
    );
  });

  it('역할 표기가 없으면 그대로', () => {
    expect(primaryAuthor('한강')).toBe('한강');
  });
});

describe('bookMetaTitle', () => {
  it('책 이름 - 첫 저자 | page0127.', () => {
    expect(
      bookMetaTitle({
        title:
          '생각의 탄생 - 다빈치에서 파인먼까지 창조성을 빛낸 사람들의 13가지 생각도구',
        author:
          '로버트 루트번스타인, 미셸 루트번스타인 (지은이), 박종성 (옮긴이)',
      })
    ).toBe('생각의 탄생 - 로버트 루트번스타인 | page0127.');
  });

  it('저자가 없으면 책 이름만', () => {
    expect(bookMetaTitle({ title: '데미안', author: null })).toBe(
      '데미안 | page0127.'
    );
  });

  it('다듬어도 길면 70자 안으로 자르고 말줄임표', () => {
    const title = bookMetaTitle({
      title:
        '아주아주 긴 제목이 부제 없이 이어지는 책으로 검색 결과에서 잘릴 만큼 길고 또 길어서 끝이 안 보이는 책',
      author: '홍길동',
    });
    expect(title.length).toBeLessThanOrEqual(META_TITLE_MAX);
    expect(title).toMatch(/… \| page0127\.$/);
  });
});
