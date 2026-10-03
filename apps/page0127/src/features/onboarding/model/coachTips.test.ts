import { describe, expect, it } from 'vitest';

import {
  type CoachTipContext,
  isCoachTipPending,
  parseDismissedTips,
  pickCoachTip,
  serializeDismissedTips,
} from './coachTips';

/** 아무 팁도 뜨지 않는 기본 상태 — 테스트마다 필요한 값만 덮어쓴다 */
const base: CoachTipContext = {
  isOwner: true,
  bookCount: 3,
  hasReadingGoal: true,
  analyzableBookCount: 0,
  hasTasteAnalysis: false,
  dismissed: new Set(),
};

describe('pickCoachTip', () => {
  it('남의 서재에서는 아무 팁도 띄우지 않는다', () => {
    expect(pickCoachTip({ ...base, isOwner: false, bookCount: 0 })).toBeNull();
  });

  it('책이 0권이면 도서 추가를 안내한다', () => {
    expect(pickCoachTip({ ...base, bookCount: 0 })).toBe('add-book');
  });

  it('책이 있고 목표가 없으면 목표 설정을 안내한다', () => {
    expect(pickCoachTip({ ...base, hasReadingGoal: false })).toBe('set-goal');
  });

  it('책이 0권이면 목표가 없어도 도서 추가가 먼저다', () => {
    // 한 방문에 하나만 — 지금 가장 먼저 할 일을 고른다
    expect(pickCoachTip({ ...base, bookCount: 0, hasReadingGoal: false })).toBe(
      'add-book'
    );
  });

  it('평가한 완독이 5권이고 분석 이력이 없으면 취향 분석을 안내한다', () => {
    expect(pickCoachTip({ ...base, analyzableBookCount: 5 })).toBe(
      'taste-analysis'
    );
  });

  it('평가한 완독이 4권이면 아직 취향 분석을 안내하지 않는다', () => {
    // 분석 API 가 5권 미만을 400 으로 막는다 — 눌러도 안 되는 버튼을 가리키지 않는다
    expect(pickCoachTip({ ...base, analyzableBookCount: 4 })).toBeNull();
  });

  it('이미 분석을 받아 봤으면 취향 분석을 안내하지 않는다', () => {
    expect(
      pickCoachTip({
        ...base,
        analyzableBookCount: 10,
        hasTasteAnalysis: true,
      })
    ).toBeNull();
  });

  it('할 일을 다 했으면 null 이다', () => {
    expect(pickCoachTip(base)).toBeNull();
  });

  it('닫은 팁은 건너뛰고 다음 할 일을 고른다', () => {
    expect(
      pickCoachTip({
        ...base,
        hasReadingGoal: false,
        analyzableBookCount: 5,
        dismissed: new Set(['set-goal']),
      })
    ).toBe('taste-analysis');
  });

  it('조건이 맞아도 닫은 팁은 다시 띄우지 않는다', () => {
    expect(
      pickCoachTip({
        ...base,
        bookCount: 0,
        dismissed: new Set(['add-book']),
      })
    ).toBeNull();
  });
});

describe('isCoachTipPending', () => {
  it('목표를 저장하면 떠 있던 목표 팁은 더 이상 유효하지 않다', () => {
    expect(
      isCoachTipPending('set-goal', { ...base, hasReadingGoal: false })
    ).toBe(true);
    expect(
      isCoachTipPending('set-goal', { ...base, hasReadingGoal: true })
    ).toBe(false);
  });

  it('남의 서재에서는 어떤 팁도 유효하지 않다', () => {
    expect(
      isCoachTipPending('add-book', { ...base, isOwner: false, bookCount: 0 })
    ).toBe(false);
  });
});

describe('parseDismissedTips', () => {
  it('저장된 값이 없으면 빈 집합이다', () => {
    expect(parseDismissedTips(null).size).toBe(0);
  });

  it('저장한 값을 그대로 되살린다', () => {
    const raw = serializeDismissedTips(new Set(['add-book', 'set-goal']));
    expect([...parseDismissedTips(raw)].sort()).toEqual([
      'add-book',
      'set-goal',
    ]);
  });

  it('깨진 JSON 이면 빈 집합으로 시작한다', () => {
    // localStorage 는 사용자가 직접 고칠 수 있다 — 파싱 실패로 화면이 죽으면 안 된다
    expect(parseDismissedTips('{not json').size).toBe(0);
  });

  it('배열이 아니면 빈 집합이다', () => {
    expect(parseDismissedTips('{"a":1}').size).toBe(0);
  });

  it('모르는 팁 이름은 버린다', () => {
    // 팁을 없애거나 이름을 바꾼 뒤에도 옛 값이 남아 있을 수 있다
    expect([...parseDismissedTips('["add-book","old-tip",3]')]).toEqual([
      'add-book',
    ]);
  });
});
