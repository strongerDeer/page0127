import { describe, expect, it } from 'vitest';

import { toIdentityLabel, toReaderCard } from './readerCard';

const NOVEL = '국내도서-소설/시/희곡';
const base = {
  latestType: null,
  categories: [],
  yearBooks: 0,
  totalBooks: 0,
};

describe('toReaderCard — 성향', () => {
  it('AI 분석 결과가 있으면 그 이름이 주인공이다', () => {
    const { identity } = toReaderCard({
      ...base,
      latestType: '마음의 결을 읽는 사람',
      categories: [NOVEL, NOVEL, NOVEL],
    });
    expect(identity).toMatchObject({
      source: 'analysis',
      name: '마음의 결을 읽는 사람',
    });
    expect(identity && toIdentityLabel(identity)).toBe('AI 독서 성향');
  });

  it('카탈로그 밖 이름도 그대로 쓰고 기본색을 준다', () => {
    const { identity } = toReaderCard({
      ...base,
      latestType: '  밤을 읽는 사람 ',
    });
    expect(identity?.name).toBe('밤을 읽는 사람');
    expect(identity?.color).toMatch(/^#/);
  });

  it('분석 전이면 공개 완독 책으로 본 첫인상이다', () => {
    const { identity } = toReaderCard({
      ...base,
      categories: [NOVEL, NOVEL, '국내도서-에세이'],
    });
    expect(identity).toMatchObject({
      source: 'impression',
      name: '이야기에 사는 사람',
    });
    expect(identity && toIdentityLabel(identity)).toBe('책장의 첫인상');
  });

  it('첫인상도 없으면(3권 미만) 성향이 없다 — 이름이 주인공이 된다', () => {
    expect(toReaderCard({ ...base, categories: [NOVEL] }).identity).toBeNull();
    expect(toReaderCard({ ...base, latestType: '   ' }).identity).toBeNull();
  });
});

describe('toReaderCard — 숫자 한 줄', () => {
  it('올해 3권 이상이면 올해 권수', () => {
    expect(toReaderCard({ ...base, yearBooks: 12, totalBooks: 156 }).stat).toBe(
      '올해 12권 완독'
    );
  });

  it('올해가 적으면(연초·신규) 전체 권수가 대신 말한다', () => {
    expect(toReaderCard({ ...base, yearBooks: 1, totalBooks: 156 }).stat).toBe(
      '156권이 꽂힌 서재'
    );
  });

  it('둘 다 3권 미만이면 숫자를 적지 않는다', () => {
    expect(
      toReaderCard({ ...base, yearBooks: 2, totalBooks: 2 }).stat
    ).toBeNull();
  });
});
