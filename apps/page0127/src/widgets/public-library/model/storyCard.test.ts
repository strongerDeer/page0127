import { describe, expect, it } from 'vitest';

import { toStoryAddress, toStoryCardProps } from './storyCard';

import type { ReaderShareData } from '../api/getReaderShareData';
import type { PublicShelfBook } from '@/entities/book/api/getPublicShelfSummary';

const book = (id: string, completed_date: string): PublicShelfBook => ({
  id,
  isbn: id,
  title: `책 ${id}`,
  cover_image: null,
  spine_image: `https://img/${id}/spine`,
  thickness_mm: 20,
  is_life_book: false,
  rating: 4,
  completed_date,
  completed_year: null,
});

const data = (over: Partial<ReaderShareData> = {}): ReaderShareData => ({
  displayName: '혜진',
  photoUrl: null,
  readingGoal: null,
  topics: ['관계', '심리', '일상의 철학', '넷째'],
  year: 2026,
  yearBooks: 0,
  totalBooks: 0,
  covers: ['a.jpg'],
  books: [],
  card: { identity: null, stat: null },
  ...over,
});

const ANALYSIS = {
  source: 'analysis' as const,
  name: '마음의 결을 읽는 사람',
  color: '#7a5cf0',
};

describe('toStoryAddress', () => {
  it('운영 주소에서 프로토콜을 떼고 아이디를 붙인다', () => {
    expect(toStoryAddress('https://page0127.com', 'hyejin')).toBe(
      'page0127.com/hyejin'
    );
  });

  it('로컬·빈 값·잘못된 값이면 운영 주소를 적는다 — 이미지는 운영 주소를 말해야 한다', () => {
    expect(toStoryAddress('http://localhost:3000', 'a')).toBe('page0127.com/a');
    expect(toStoryAddress(undefined, 'a')).toBe('page0127.com/a');
    expect(toStoryAddress('not a url', 'a')).toBe('page0127.com/a');
  });
});

describe('toStoryCardProps', () => {
  it('AI 성향이면 성향이 가장 큰 줄, 주제 태그는 세 개까지', () => {
    const props = toStoryCardProps(
      data({ card: { identity: ANALYSIS, stat: null } }),
      'hyejin',
      'https://page0127.com'
    );
    expect(props).toMatchObject({
      name: '혜진',
      address: 'page0127.com/hyejin',
      label: 'AI 독서 성향',
      headline: '마음의 결을 읽는 사람',
      accent: '#7a5cf0',
      topics: ['관계', '심리', '일상의 철학'],
    });
  });

  it('첫인상에는 주제 태그가 없다 — 분류 하나로 본 것이다', () => {
    const props = toStoryCardProps(
      data({
        card: { identity: { ...ANALYSIS, source: 'impression' }, stat: null },
      }),
      'hyejin',
      undefined
    );
    expect(props.label).toBe('책장의 첫인상');
    expect(props.topics).toEqual([]);
  });

  it('성향이 없으면 라벨 없이 슬로건이 가장 큰 줄이다 — 이름은 프로필 줄이 말한다', () => {
    const props = toStoryCardProps(data(), 'hyejin', undefined);
    expect(props.label).toBeNull();
    expect(props.headline).toBe('책장을 보면,\n그 사람이 보인다.');
  });

  it('권수는 올해 3권 이상이면 올해, 아니면 전체, 둘 다 적으면 없다', () => {
    expect(
      toStoryCardProps(data({ yearBooks: 15, totalBooks: 156 }), 'a', undefined)
        .count
    ).toEqual({ label: '2026년에 완독한 책', value: 15 });
    expect(
      toStoryCardProps(data({ yearBooks: 2, totalBooks: 156 }), 'a', undefined)
        .count
    ).toEqual({ label: '지금까지 꽂은 책', value: 156 });
    expect(
      toStoryCardProps(data({ yearBooks: 1, totalBooks: 2 }), 'a', undefined)
        .count
    ).toBeNull();
  });

  it('책장은 숫자와 같은 책을 세운다 — 올해 숫자면 올해 책만', () => {
    const books = [
      ...['1', '2', '3', '4', '5'].map((id) => book(id, '2026-03-01')),
      book('old', '2019-03-01'),
    ];
    const props = toStoryCardProps(
      data({ yearBooks: 5, totalBooks: 6, books }),
      'a',
      undefined
    );
    expect(props.shelf?.map((item) => item.key)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });
});
