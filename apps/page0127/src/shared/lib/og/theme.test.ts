import { describe, expect, it } from 'vitest';

import {
  BRAND_SPINES,
  SHELF_WIDTH,
  SPINE_GAP,
  spinesFor,
  textWidth,
  titleFontSize,
  truncate,
} from './theme';

/** 책등을 왼쪽부터 눕혔을 때 선반이 차지하는 폭 (BookShelf 의 계산과 같아야 한다) */
const shelfWidthOf = (spines: { w: number }[]) =>
  spines.reduce((sum, s) => sum + s.w + SPINE_GAP, 0);

describe('spinesFor', () => {
  it('권수만큼 책등을 세운다', () => {
    expect(spinesFor(3)).toHaveLength(3);
  });

  it('0권이면 빈 선반이 남는다', () => {
    expect(spinesFor(0)).toHaveLength(0);
  });

  it('책이 아무리 많아도 선반이 카드 밖으로 넘치지 않는다', () => {
    expect(shelfWidthOf(spinesFor(500))).toBeLessThanOrEqual(SHELF_WIDTH);
  });

  it('많이 읽은 책장은 선반을 거의 끝까지 채운다', () => {
    // 개수로 자르면 오른쪽에 빈 자리가 남아 카드 좌우가 비대칭이 된다.
    // 폭 기준이라 한 권 더 놓을 자리가 없을 때까지 채운다.
    const width = shelfWidthOf(spinesFor(500));
    expect(SHELF_WIDTH - width).toBeLessThan(42);
  });

  it('음수가 들어와도 빈 배열이다', () => {
    // count 조회가 실패하면 호출부가 0을 넘기지만, 계산 결과가 음수로 흘러들 수도 있다
    expect(spinesFor(-1)).toHaveLength(0);
  });

  it('크기와 색이 서로 다른 주기로 돌아 같은 책이 반복돼 보이지 않는다', () => {
    const spines = BRAND_SPINES;
    // 색은 8권마다 한 바퀴 돌지만 크기는 7주기라 조합이 어긋난다
    expect(spines[8].c).toBe(spines[0].c);
    expect(spines[8].w).not.toBe(spines[0].w);
  });
});

describe('textWidth', () => {
  it('한글은 글자당 1을 센다', () => {
    expect(textWidth('책장')).toBe(2);
  });

  it('라틴 글자는 한글의 절반 남짓으로 센다', () => {
    // 'stronger_deer'(13자)는 한글 8자보다 좁다 — 글자 수로 세면 억울하게 잘린다
    expect(textWidth('stronger_deer')).toBeCloseTo(7.15, 2);
    expect(textWidth('stronger_deer')).toBeLessThan(
      textWidth('가나다라마바사아')
    );
  });

  it('이모지는 정폭으로 센다', () => {
    expect(textWidth('📚')).toBe(1);
  });
});

describe('truncate', () => {
  it('폭이 한도 안이면 그대로 둔다', () => {
    expect(truncate('토지', 12)).toBe('토지');
  });

  it('영문 닉네임을 불필요하게 자르지 않는다', () => {
    // 이전 구현은 글자 수만 세어 stronger_deer(13자)를 'stronger_d…' 로 잘랐다
    expect(truncate('stronger_deer', 10)).toBe('stronger_deer');
  });

  it('폭이 한도를 넘으면 말줄임표를 붙인다', () => {
    const result = truncate('사피엔스 유인원에서 사이보그까지', 8);
    expect(result.endsWith('…')).toBe(true);
  });

  it('자른 결과가 한도를 넘지 않는다 — 말줄임표 폭까지 센다', () => {
    const result = truncate('가나다라마바사아자차카타파하', 6);
    expect(textWidth(result)).toBeLessThanOrEqual(6);
  });

  it('이모지를 반토막 내지 않는다', () => {
    // slice로 자르면 서로게이트 쌍이 쪼개져 깨진 문자가 남고,
    // 그 코드포인트가 폰트 subset 요청에까지 실려 간다
    expect(truncate('📚📖📕책장', 3)).toBe('📚📖…');
  });
});

describe('titleFontSize', () => {
  // 가운데 정렬로 바꾸면서 68/56/46 세 단계를 54/46 두 단계로 줄였다.
  // 68은 좌측 정렬 기준 크기였고, 가운데 정렬에서는 상하 여백 72px 을 깨뜨린다.
  it('짧은 제목은 크게 쓴다', () => {
    expect(titleFontSize(7)).toBe(54);
  });

  it('한 줄에 들어오는 한계까지는 크기를 유지한다', () => {
    expect(titleFontSize(13)).toBe(54);
  });

  it('길어지면 줄이 접히기 전에 글자를 줄인다', () => {
    expect(titleFontSize(14)).toBe(46);
    expect(titleFontSize(18)).toBe(46);
  });
});
