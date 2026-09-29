import { describe, expect, it } from 'vitest';

import { DEFAULT_SPINE_WIDTH, spineWidthPx } from './spineWidth';

describe('spineWidthPx', () => {
  it('두꺼운 책일수록 넓다', () => {
    // 이 assertion 이 잠그는 버그: 지금은 폭이 이미지 비율로 정해져서
    // 20mm 책(6px)이 17mm 책(19px)보다 얇게 보였다. 순서가 뒤집혀 있었다.
    expect(spineWidthPx(10)).toBeLessThan(spineWidthPx(20));
    expect(spineWidthPx(20)).toBeLessThan(spineWidthPx(30));
    expect(spineWidthPx(30)).toBeLessThan(spineWidthPx(45));
  });

  it('운영 분포의 중앙값(20mm)은 41px이다', () => {
    expect(spineWidthPx(20)).toBe(41);
  });

  it('30mm는 기존 고정값과 같다', () => {
    // 기존 책장이 갑자기 달라 보이지 않도록 중간 지점을 맞춰 뒀다.
    expect(spineWidthPx(30)).toBe(DEFAULT_SPINE_WIDTH);
  });

  it('누를 수 있는 최소 폭을 지킨다', () => {
    // 물리적으로 정확하게 하면 9mm 책이 10px 가 된다 — 손가락으로 못 누른다.
    expect(spineWidthPx(1)).toBe(32);
    expect(spineWidthPx(9)).toBe(32);
  });

  it('아주 두꺼운 책도 상한을 넘지 않는다', () => {
    // 상한이 없으면 전집 한 권이 선반 한 줄을 차지한다.
    expect(spineWidthPx(100)).toBe(64);
    expect(spineWidthPx(45)).toBe(64);
  });

  it('두께를 모르면 기존 고정값을 쓴다', () => {
    // 이 assertion 이 잠그는 것: 모르는 값을 0이나 최소폭으로 떨어뜨리면
    // 두께 정보가 없는 책들만 유난히 얇아져서 "얇은 책"으로 오해된다.
    expect(spineWidthPx(null)).toBe(DEFAULT_SPINE_WIDTH);
    expect(spineWidthPx(undefined)).toBe(DEFAULT_SPINE_WIDTH);
    expect(spineWidthPx(0)).toBe(DEFAULT_SPINE_WIDTH);
    expect(spineWidthPx(-5)).toBe(DEFAULT_SPINE_WIDTH);
  });

  it('정수 픽셀을 돌려준다', () => {
    // 소수 픽셀은 브라우저마다 반올림이 달라 선반의 책 간격이 들쭉날쭉해진다.
    [9, 13, 17, 21, 28, 33, 41].forEach((mm) =>
      expect(Number.isInteger(spineWidthPx(mm))).toBe(true)
    );
  });
});
