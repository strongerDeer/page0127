import { describe, expect, it } from 'vitest';

import { toActorSentence, toShortTitle } from './actorSentence';

describe('toShortTitle', () => {
  it('부제를 뗀다', () => {
    expect(
      toShortTitle(
        '손절사회 - 손익계산이 되어버린 인간관계, 연결 불가능성의 시대에 관한 탐구'
      )
    ).toBe('손절사회');
    expect(toShortTitle('데미안: 에밀 싱클레어의 젊은 날 이야기')).toBe(
      '데미안'
    );
  });

  it('부제가 없어도 20자를 넘으면 자른다', () => {
    expect(toShortTitle('가나다라마바사아자차카타파하가나다라마바사아')).toBe(
      '가나다라마바사아자차카타파하가나다라마바…'
    );
  });

  it('짧은 제목은 그대로', () => {
    expect(toShortTitle('대온실 수리 보고서')).toBe('대온실 수리 보고서');
  });
});

describe('toActorSentence', () => {
  const title = { title: '데미안', isReply: false };

  it('댓글 — 책 제목을 넣는다', () => {
    expect(toActorSentence('comment', title)).toBe(
      '님이 『데미안』에 댓글을 남겼습니다'
    );
  });

  it('답글은 따로 말한다', () => {
    expect(toActorSentence('comment', { ...title, isReply: true })).toBe(
      '님이 『데미안』에서 내 댓글에 답글을 남겼습니다'
    );
    expect(toActorSentence('comment', { title: null, isReply: true })).toBe(
      '님이 내 댓글에 답글을 남겼습니다'
    );
  });

  it('좋아요 — 책 제목을 넣는다', () => {
    expect(toActorSentence('like', title)).toBe(
      '님이 『데미안』에 좋아요를 눌렀습니다'
    );
  });

  it('제목을 모르면 예전 문장 그대로', () => {
    expect(toActorSentence('comment', null)).toBe('님이 댓글을 남겼습니다');
    expect(toActorSentence('like', undefined)).toBe('님이 좋아요를 눌렀습니다');
  });

  it('팔로우는 대상이 없다', () => {
    expect(toActorSentence('follow', null)).toBe('님이 팔로우했습니다');
  });

  it('나에게 오는 알림은 다루지 않는다', () => {
    expect(toActorSentence('weekly_recap', null)).toBeNull();
    expect(toActorSentence('reading_reminder', null)).toBeNull();
  });
});
