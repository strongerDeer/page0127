import { describe, expect, it } from 'vitest';

import { toStoryAddress, toStoryCardProps } from './storyCard';

import type { ReaderShareData } from '../api/getReaderShareData';

const data = (card: ReaderShareData['card']): ReaderShareData => ({
  displayName: '혜진',
  totalBooks: 156,
  covers: ['a.jpg'],
  card,
});

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
  it('성향이 있으면 성향이 가장 큰 줄, 이름은 흰 카드에', () => {
    const props = toStoryCardProps(
      data({
        identity: {
          source: 'analysis',
          name: '마음의 결을 읽는 사람',
          color: '#7a5cf0',
        },
        stat: '올해 12권 완독',
      }),
      'hyejin',
      'https://page0127.com'
    );
    expect(props).toMatchObject({
      label: 'AI 독서 성향',
      headline: '마음의 결을 읽는 사람',
      accent: '#7a5cf0',
      owner: '혜진',
      stat: '올해 12권 완독',
      address: 'page0127.com/hyejin',
    });
  });

  it('성향이 없으면 이름이 가장 큰 줄이고 흰 카드에 다시 쓰지 않는다', () => {
    const props = toStoryCardProps(
      data({ identity: null, stat: null }),
      'hyejin',
      undefined
    );
    expect(props).toMatchObject({
      label: '공개 서재',
      headline: '혜진님의 서재',
      accent: null,
      owner: null,
      stat: null,
    });
  });
});
