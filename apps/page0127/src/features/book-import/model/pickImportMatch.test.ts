import { describe, expect, it } from 'vitest';

import { normalizeTitle, pickImportMatch } from './pickImportMatch';

import type { ProviderBook } from '@/entities/book';

const book = (
  title: string,
  author: string,
  isbn = '9788900000000'
): ProviderBook => ({
  isbn,
  title,
  subTitle: null,
  author,
  publisher: '출판사',
  pubDate: null,
  description: '',
  category: '',
  coverImage: '',
  spineImage: null,
  backImage: null,
  page: null,
  toc: null,
  dimensions: null,
  source: 'yes24',
  providerItemId: null,
  providerLink: '',
});

describe('pickImportMatch', () => {
  it('ISBN 으로 찾은 책은 그대로 고른다', () => {
    const found = [book('아무 제목', '누구', '9788936434120')];
    expect(
      pickImportMatch({ title: '', author: null, isbn: '9788936434120' }, found)
    ).toBe(0);
  });

  it('해설서가 앞에 와도 제목이 같은 책을 고른다', () => {
    const found = [
      book('데미안 필사 노트', '편집부'),
      book('데미안', '헤르만 헤세'),
    ];
    expect(
      pickImportMatch({ title: '데미안', author: null, isbn: null }, found)
    ).toBe(1);
  });

  it('제목이 같은 책이 여럿이면 저자가 맞는 책을 고른다', () => {
    const found = [
      book('코스모스', '김코스'),
      book('코스모스', '칼 세이건 (지은이), 홍승수 (옮긴이)'),
    ];
    expect(
      pickImportMatch(
        { title: '코스모스', author: '칼 세이건', isbn: null },
        found
      )
    ).toBe(1);
  });

  it('저자를 적었는데 아무 후보와도 안 맞으면 고르지 않는다 (사용자가 고른다)', () => {
    const found = [book('코스모스', '김코스')];
    expect(
      pickImportMatch(
        { title: '코스모스', author: '칼 세이건', isbn: null },
        found
      )
    ).toBeNull();
  });

  it('제목이 앞부분만 겹치면 고르지 않는다', () => {
    const found = [book('사피엔스 그래픽 히스토리', '유발 하라리')];
    expect(
      pickImportMatch({ title: '사피엔스', author: null, isbn: null }, found)
    ).toBeNull();
  });

  it('후보가 없으면 null', () => {
    expect(
      pickImportMatch({ title: '없는 책', author: null, isbn: null }, [])
    ).toBeNull();
  });
});

describe('normalizeTitle', () => {
  it('띄어쓰기·괄호 속 판 정보·부제를 무시한다', () => {
    expect(normalizeTitle('불편한 편의점 (40만 부 기념 벚꽃 에디션)')).toBe(
      '불편한편의점'
    );
    expect(
      normalizeTitle('팩트풀니스 : 우리가 세상을 오해하는 10가지 이유')
    ).toBe('팩트풀니스');
    expect(normalizeTitle('[양장] 어린 왕자')).toBe('어린왕자');
  });
});
