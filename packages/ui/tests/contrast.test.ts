import { describe, expect, it } from 'vitest';

import { contrastRatio, gradeOf, luminance, parseHex } from '../src/foundations/contrast';

/**
 * 명암비 계산의 단위 테스트.
 *
 * 왜 이걸 테스트하는가: 이 함수들이 팔레트 문서에 찍히는 숫자를 만든다.
 * 계산이 틀리면 화면은 멀쩡히 렌더되고 표에는 "AA" 라고 적히는데 실제로는
 * 미달인 상태가 된다 — 접근성 문서가 통째로 거짓말이 되는 것이고,
 * 눈으로는 절대 발견할 수 없다.
 *
 * 경계값을 특히 조인다. 실제로 `text/subtle` 이 4.496 으로 AA(4.5)를
 * 0.004 차이로 못 넘긴 적이 있다 — 반올림이 끼어들면 그런 것을 놓친다.
 */

describe('parseHex', () => {
  it('#rrggbb 를 채널 3개로 나눈다', () => {
    expect(parseHex('#1e69cb')).toEqual([30, 105, 203]);
  });

  it('# 없이 와도 받는다', () => {
    expect(parseHex('1e69cb')).toEqual([30, 105, 203]);
  });

  it('#rgb 단축형을 두 자리씩 펼친다', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#0a8')).toEqual([0, 170, 136]);
  });

  it('대소문자를 가리지 않는다', () => {
    expect(parseHex('#1E69CB')).toEqual(parseHex('#1e69cb'));
  });

  it('계산할 수 없는 형식은 null 이다 — 던지지 않는다', () => {
    // 문서가 토큰을 훑다가 rgba()·색이름·빈 값을 만나도 멈추면 안 된다.
    expect(parseHex('rgba(0,0,0,0.5)')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('')).toBeNull();
    expect(parseHex('#gggggg')).toBeNull();
  });
});

describe('luminance', () => {
  it('흰색은 1, 검정은 0 이다', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 10);
    expect(luminance('#000000')).toBeCloseTo(0, 10);
  });

  it('감마 역보정을 한다 — 중간 회색의 휘도는 0.5 가 아니다', () => {
    // sRGB 50% 회색(#808080)의 상대 휘도는 약 0.2159 다. 선형으로 잘못
    // 계산하면 0.5 가 나오고, 그러면 모든 명암비가 조용히 틀어진다.
    expect(luminance('#808080')).toBeCloseTo(0.2159, 4);
  });

  it('파싱 못 하는 값은 null 이다', () => {
    expect(luminance('없는색')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('흑백은 21:1 — 이론상 최대값', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10);
  });

  it('같은 색끼리는 1:1', () => {
    expect(contrastRatio('#1e69cb', '#1e69cb')).toBeCloseTo(1, 10);
  });

  it('순서를 바꿔도 값이 같다 — 어느 쪽이 전경인지는 상관없다', () => {
    const a = contrastRatio('#5f6f8f', '#ffffff');
    const b = contrastRatio('#ffffff', '#5f6f8f');
    expect(a).toBeCloseTo(b as number, 10);
  });

  it('실제 토큰 값으로 검산한다 — text/subtle 이 흰 배경에서 AA 를 넘는다', () => {
    // navy/600(#5f6f8f). navy/500(#66779a)이 4.496 으로 0.004 모자라
    // 명도만 낮춰 만든 값이다. 이 테스트가 그 결정을 고정한다.
    const ratio = contrastRatio('#5f6f8f', '#ffffff');
    expect(ratio).not.toBeNull();
    expect(ratio as number).toBeGreaterThanOrEqual(4.5);
  });

  it('옛 navy/500 은 여전히 AA 미달이다 — 되돌리면 이 테스트가 잡는다', () => {
    const ratio = contrastRatio('#66779a', '#ffffff') as number;
    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeGreaterThan(4.4); // 아슬아슬하게 못 넘긴다는 사실 자체가 요점
  });

  it('한쪽이라도 파싱 안 되면 null 이다', () => {
    expect(contrastRatio('#ffffff', 'transparent')).toBeNull();
  });
});

describe('gradeOf', () => {
  it('경계값은 통과 쪽에 붙는다 (>= 기준)', () => {
    expect(gradeOf(7)).toBe('AAA');
    expect(gradeOf(4.5)).toBe('AA');
    expect(gradeOf(3)).toBe('AA Large');
  });

  it('경계 바로 아래는 한 단계 내려간다', () => {
    expect(gradeOf(6.999)).toBe('AA');
    expect(gradeOf(4.499)).toBe('AA Large');
    expect(gradeOf(2.999)).toBe('미달');
  });

  it("'AA Large' 는 본문에서 미달이라는 뜻이다", () => {
    // 3:1 은 18.66px+bold 또는 24px 이상에서만 통과다. 이름이 'AA' 로 시작해
    // 통과처럼 읽히지만 일반 텍스트에는 쓸 수 없다 — rank-up(4.30)이 12px bold
    // 배지에서 미달이었던 것이 정확히 이 착각이었다.
    expect(gradeOf(4.3)).toBe('AA Large');
  });
});
