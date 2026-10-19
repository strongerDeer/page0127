import { describe, expect, it } from 'vitest';

import { getReadingPace } from '@/entities/book';

import { getPaceMessage } from './paceMessage';

const msg = (
  completed: number,
  target: number,
  isOwner = true,
  today = '2026-10-13',
  year = 2026
) =>
  getPaceMessage({
    pace: getReadingPace({ completed, target, year, today }),
    completed,
    target,
    isOwner,
  });

describe('getPaceMessage', () => {
  it('조금 뒤처짐 — 예상 권수와 주당 권수', () => {
    const m = msg(14, 40);
    expect(m.headline).toBe('지금 속도면 올해 약 18권 📚');
    expect(m.detail).toBe(
      '목표 40권까지 26권 — 남은 11.3주 동안 일주일에 2.3권이면 닿아요.'
    );
    expect(m.suggestGoalEdit).toBe(false);
  });

  it('많이 뒤처짐 — 주인에게만 목표 다시 정하기를 권한다', () => {
    expect(msg(5, 40).suggestGoalEdit).toBe(true);
    expect(msg(5, 40).detail).toContain('목표를 다시 정해 볼까요?');
    expect(msg(5, 40, false).suggestGoalEdit).toBe(false);
    expect(msg(5, 40, false).detail).not.toContain('볼까요');
  });

  it('앞섬 · 딱 맞음 · 달성', () => {
    expect(msg(35, 40).headline).toBe('목표보다 4권 앞서 있어요 🏃');
    expect(msg(31, 40).headline).toBe(
      '지금 페이스 그대로면 12월에 딱 40권이에요 👌'
    );
    expect(msg(42, 40).headline).toBe(
      '목표 달성! 지금부터는 보너스 책이에요 🎉'
    );
    expect(msg(42, 40).detail).toBe('목표보다 2권 더 읽었어요.');
  });

  it('방문자에게는 조언("~이면 닿아요/돼요") 없이 사실만', () => {
    // 조금 뒤처짐(14) · 딱 맞음(31) · 연초(1, 1/7)
    const visitor = [
      msg(14, 40, false),
      msg(31, 40, false),
      msg(1, 40, false, '2026-01-07'),
    ];
    visitor.forEach((m) => {
      expect(m.detail ?? '').not.toMatch(/닿아요|돼요|볼까요/);
    });
    expect(msg(14, 40, false).detail).toBe('목표 40권까지 26권, 남은 11.3주');
  });

  it('목표 없음 — 월 평균', () => {
    expect(msg(14, 0).headline).toBe('한 달에 1.5권씩 읽고 있어요');
  });

  it('지난해는 지난 일로 — 결과 + 한 달 평균(과거형)', () => {
    const past = (completed: number, target: number) =>
      msg(completed, target, true, '2026-10-13', 2025);

    expect(past(41, 40).headline).toBe(
      '목표를 달성했어요! 한 달에 3.4권씩 읽었어요 🎉'
    );
    expect(past(41, 40).detail).toBe('목표 40권보다 1권 더 읽었어요.');
    expect(past(40, 40).detail).toBe('목표 40권을 딱 채웠어요.');

    expect(past(36, 40).headline).toBe(
      '목표엔 4권 모자랐지만, 한 달에 3권씩 읽었어요'
    );
    expect(past(36, 40).detail).toBe('목표 40권 중 36권을 읽었어요.');
  });

  it('지난해에 목표가 없었으면 "읽고 있어요"가 아니라 "읽었어요"', () => {
    expect(msg(55, 0, true, '2026-10-13', 2024).headline).toBe(
      '한 달에 4.6권씩 읽었어요'
    );
  });

  it('0권이면 속도·평균을 말하지 않는다 — "한 달에 0권씩"은 빈 성적표다', () => {
    const zero = [
      msg(0, 0),
      msg(0, 0, false),
      msg(0, 10),
      msg(0, 40),
      msg(0, 40, false),
      msg(0, 0, true, '2026-10-13', 2025),
      msg(0, 40, true, '2026-10-13', 2025),
    ];
    zero.forEach((m) => {
      expect(`${m.headline} ${m.detail ?? ''}`).not.toMatch(/0권씩|약 0권/);
    });

    expect(msg(0, 0).headline).toBe('올해 첫 완독을 기록해 보세요 📖');
    expect(msg(0, 0, false).headline).toBe('올해 완독한 책은 아직 없어요');
    expect(msg(0, 10).headline).toBe('올해 목표 10권, 첫 책부터 시작해요');
    // 0권이어도 목표가 빠듯하면 주인에게는 다시 정하기를 권한다
    expect(msg(0, 40).suggestGoalEdit).toBe(true);
    expect(msg(0, 40, false).detail).toBeNull();
  });

  it('연초 — 예상 대신 시작 문구', () => {
    expect(msg(1, 40, true, '2026-01-07').headline).toBe(
      '올해 목표 40권, 이제 시작이에요'
    );
  });
});
