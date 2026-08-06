import { describe, expect, it } from 'vitest';

import { heroSlidesFor } from './heroSlides';

/** 슬라이드에 실린 사람이 읽는 글자를 전부 모은다 */
const allCopy = (now: Date) =>
  heroSlidesFor(now)
    .flatMap((slide) => [slide.eyebrow, ...slide.lines, slide.sub, slide.cta])
    .join(' ');

describe('heroSlidesFor', () => {
  it('eyebrow 의 연도가 호출 시점을 따라간다', () => {
    const goal = heroSlidesFor(new Date(2027, 2, 1)).find(
      (slide) => slide.id === 'goal'
    );

    expect(goal?.eyebrow).toBe('2027년 독서 목표');
  });

  it('연도 말고는 시점에 묶이는 표현을 쓰지 않는다', () => {
    // 이전 카피는 `2026년 하반기 / 올해 절반이 지났어요 / 남은 여섯 달의 목표` 였다.
    // 7월에만 맞는 말이라 몇 달 지나면 "관리되고 있다"는 신호가 정반대로 뒤집힌다.
    const copy = allCopy(new Date(2026, 0, 1));

    for (const stale of [
      '상반기',
      '하반기',
      '절반',
      '분기',
      '이번 달',
      '이번 주',
      '여섯 달',
    ]) {
      expect(copy).not.toContain(stale);
    }
  });

  it('2인칭 대명사를 쓰지 않는다', () => {
    // 밀리의서재 UI 문구를 실측해 세운 규칙이다(이 파일 상단 주석).
    // 규칙이 주석에만 있으면 다음 사람이 모른 채 되돌린다.
    expect(allCopy(new Date(2026, 7, 6))).not.toContain('당신');
  });

  it('메인 카피는 두 줄이다', () => {
    for (const slide of heroSlidesFor(new Date(2026, 7, 6))) {
      expect(slide.lines).toHaveLength(2);
    }
  });
});
