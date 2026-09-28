import { describe, expect, it } from 'vitest';

import {
  buildYes24BackUrl,
  buildYes24CoverUrl,
  buildYes24SpineUrl,
  isYes24PlaceholderImage,
} from './yes24Image';

// 2026-09-28 실호출로 확인한 상품번호 (소년이 온다)
const ITEM_ID = '13137546';

describe('YES24 이미지 URL 조립', () => {
  it('앞표지 주소를 만든다', () => {
    expect(buildYes24CoverUrl(ITEM_ID)).toBe(
      'https://image.yes24.com/goods/13137546/XL'
    );
  });

  it('책등 주소를 만든다', () => {
    expect(buildYes24SpineUrl(ITEM_ID)).toBe(
      'https://image.yes24.com/goods/13137546/SIDE/XL'
    );
  });

  it('뒷표지 주소를 만든다', () => {
    // 알라딘에는 없던 이미지다.
    expect(buildYes24BackUrl(ITEM_ID)).toBe(
      'https://image.yes24.com/goods/13137546/BACK/XL'
    );
  });

  it('크기를 지정할 수 있다', () => {
    expect(buildYes24CoverUrl(ITEM_ID, 'M')).toBe(
      'https://image.yes24.com/goods/13137546/M'
    );
    expect(buildYes24SpineUrl(ITEM_ID, 'L')).toBe(
      'https://image.yes24.com/goods/13137546/SIDE/L'
    );
  });

  it('기본 크기는 XL이다', () => {
    // 우리 Storage에 옮길 원본이므로 가장 큰 것을 받아 둔다.
    expect(buildYes24CoverUrl(ITEM_ID)).toBe(buildYes24CoverUrl(ITEM_ID, 'XL'));
  });
});

describe('isYes24PlaceholderImage', () => {
  it('420x600이면 이미지가 없는 것이다', () => {
    // 이 assertion 이 잠그는 버그: YES24는 이미지가 없어도 404가 아니라
    // HTTP 200에 420x600 회색 이미지를 준다. 알라딘은 404를 줬으므로 기존
    // `img.onload` 판정이 그대로 통과하고, 책장이 회색 네모로 가득 찬다.
    // 에러가 한 줄도 안 나므로 배포 후에도 아무도 모른다.
    expect(isYes24PlaceholderImage(420, 600)).toBe(true);
  });

  it('실제 앞표지는 통과시킨다', () => {
    // 실측값: 827x1200(소년이 온다) · 791x1200(채식주의자) · 760x1200
    expect(isYes24PlaceholderImage(827, 1200)).toBe(false);
    expect(isYes24PlaceholderImage(791, 1200)).toBe(false);
  });

  it('실제 책등은 폭이 제각각이어도 통과시킨다', () => {
    // 책 두께에 따라 55px~127px로 달라진다. 폭으로 거르면 안 된다.
    expect(isYes24PlaceholderImage(55, 1200)).toBe(false);
    expect(isYes24PlaceholderImage(108, 1200)).toBe(false);
    expect(isYes24PlaceholderImage(127, 1200)).toBe(false);
  });

  it('원본이 작은 옛날 책 표지도 통과시킨다', () => {
    // 이 assertion 이 잠그는 오해: "실제 이미지는 장변이 1200"이 아니다.
    // itemId 101641562 의 진짜 표지는 284x400 이다. 높이 1200 을 기준으로
    // 걸렀다면 멀쩡한 표지가 통째로 버려졌다.
    expect(isYes24PlaceholderImage(284, 400)).toBe(false);
  });

  it('크기 하나만 맞으면 플레이스홀더가 아니다', () => {
    expect(isYes24PlaceholderImage(420, 1200)).toBe(false);
    expect(isYes24PlaceholderImage(827, 600)).toBe(false);
  });

  it('바이트 길이를 알면 같이 본다', () => {
    // 실측 플레이스홀더는 항상 4975바이트다.
    expect(isYes24PlaceholderImage(420, 600, 4975)).toBe(true);
  });

  it('크기는 같아도 바이트가 다르면 진짜 이미지다', () => {
    // 이 assertion 이 잠그는 버그: XL 원본 크기가 책마다 제각각이라
    // (284x400 ~ 827x1200) 420x600 짜리 진짜 표지가 있을 수 있다.
    // 크기만으로 판정하면 그 책의 표지가 조용히 지워진다.
    expect(isYes24PlaceholderImage(420, 600, 51234)).toBe(false);
  });
});
