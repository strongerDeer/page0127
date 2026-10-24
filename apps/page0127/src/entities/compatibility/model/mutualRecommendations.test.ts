import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { mapRecommendations } from './mutualRecommendations';

const ids = { fromUserId: 'u2', toUserId: 'u1', analysisId: 'a1' };
const rec = (title: string) => ({ title, author: '저자', reason: '이유' });

// 추천을 고르는 쪽(상대) 책장
const source = [
  createTestBook({
    title: '소년이 온다',
    isbn: '9790000000001',
    cover_image: 'https://x.test/1.jpg',
    provider_item_id: '13137546',
  }),
  createTestBook({ title: '사피엔스', isbn: '9790000000002' }),
  createTestBook({ title: '코스모스', isbn: '9790000000003' }),
  createTestBook({ title: '아몬드', isbn: '9790000000004' }),
  createTestBook({ title: '역행자', isbn: '9790000000005' }),
];

describe('mapRecommendations', () => {
  it('제목을 원본 책과 맞춰 ISBN·표지·YES24 상품번호를 붙인다', () => {
    const [row] = mapRecommendations([rec('소년이 온다')], source, [], ids);
    expect(row).toMatchObject({
      isbn: '9790000000001',
      cover_image: 'https://x.test/1.jpg',
      provider_item_id: '13137546',
      from_user_id: 'u2',
      to_user_id: 'u1',
      display_order: 1,
    });
  });

  it('받는 사람이 이미 가진 책은 뺀다 — ISBN 이 같으면(10/18 실측: 6권 중 4권이 둘 다 읽은 책)', () => {
    const receiver = [
      createTestBook({ title: '다른 표기', isbn: '9790000000001' }),
    ];
    const rows = mapRecommendations(
      [rec('소년이 온다'), rec('코스모스')],
      source,
      receiver,
      ids
    );
    expect(rows.map((r) => r.title)).toEqual(['코스모스']);
  });

  it('ISBN 이 없어도 제목이 같으면 뺀다(수기 등록 책)', () => {
    const receiver = [createTestBook({ title: '사피엔스 ', isbn: '' })];
    const rows = mapRecommendations(
      [rec('사피엔스'), rec('아몬드')],
      source,
      receiver,
      ids
    );
    expect(rows.map((r) => r.title)).toEqual(['아몬드']);
  });

  it('거른 뒤에 3권을 채운다 — 먼저 3권으로 자르면 거를 때 모자란다', () => {
    const receiver = [
      createTestBook({ title: '소년이 온다', isbn: '9790000000001' }),
    ];
    const rows = mapRecommendations(
      ['소년이 온다', '사피엔스', '코스모스', '아몬드'].map(rec),
      source,
      receiver,
      ids
    );
    expect(rows.map((r) => r.title)).toEqual([
      '사피엔스',
      '코스모스',
      '아몬드',
    ]);
    expect(rows.map((r) => r.display_order)).toEqual([1, 2, 3]);
  });
});
