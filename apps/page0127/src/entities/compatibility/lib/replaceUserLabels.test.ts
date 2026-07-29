import { describe, expect, it } from 'vitest';

import { replaceUserLabels } from './replaceUserLabels';

// 내가 user1인 경우
const asFirst = { first: '나', second: '강혜진 님' };
// 내가 user2인 경우
const asSecond = { first: '강혜진 님', second: '나' };

describe('replaceUserLabels', () => {
  it('받침 없는 이름 뒤 조사를 맞춘다 — 나은(X) 나는(O)', () => {
    expect(replaceUserLabels('user1은 역사에 관심이 많아요', asFirst)).toBe(
      '나는 역사에 관심이 많아요'
    );
  });

  it('받침 있는 이름 뒤 조사를 맞춘다 — 님는(X) 님은(O)', () => {
    expect(replaceUserLabels('user2는 소설을 좋아해요', asFirst)).toBe(
      '강혜진 님은 소설을 좋아해요'
    );
  });

  it("'나' + 주격조사는 '내가'가 된다", () => {
    expect(replaceUserLabels('user1이 더 많이 읽었어요', asFirst)).toBe(
      '내가 더 많이 읽었어요'
    );
    expect(replaceUserLabels('user2가 추천했어요', asSecond)).toBe(
      '내가 추천했어요'
    );
  });

  it('받침 유무를 타지 않는 조사는 그대로 이어붙는다', () => {
    expect(replaceUserLabels('user1의 기술적 관심을 넓혀줘요', asFirst)).toBe(
      '나의 기술적 관심을 넓혀줘요'
    );
    expect(replaceUserLabels('user1에게 건네고 싶은 책이에요', asFirst)).toBe(
      '나에게 건네고 싶은 책이에요'
    );
  });

  it('한 문장에 여러 라벨이 있어도 각각 바뀐다', () => {
    expect(
      replaceUserLabels(
        'user1은 소설과 역사를, user2는 프로그래밍을 좋아해요',
        asSecond
      )
    ).toBe('강혜진 님은 소설과 역사를, 나는 프로그래밍을 좋아해요');
  });

  it('내가 user2일 때 매핑이 뒤집힌다', () => {
    expect(replaceUserLabels('user1은 역사, user2는 기술', asSecond)).toBe(
      '강혜진 님은 역사, 나는 기술'
    );
  });

  it('영문·숫자로 끝나는 닉네임은 받침 있음으로 처리한다', () => {
    expect(
      replaceUserLabels('user1은 책을 좋아해요', {
        first: 'deer2',
        second: '나',
      })
    ).toBe('deer2은 책을 좋아해요');
  });

  it('라벨이 없으면 원문 그대로 둔다', () => {
    const text = '두 분 모두 깊이 있는 독서를 즐겨요.';
    expect(replaceUserLabels(text, asFirst)).toBe(text);
  });

  it('user3처럼 정의되지 않은 라벨은 건드리지 않는다', () => {
    expect(replaceUserLabels('user3은 누구인가요', asFirst)).toBe(
      'user3은 누구인가요'
    );
  });
});
