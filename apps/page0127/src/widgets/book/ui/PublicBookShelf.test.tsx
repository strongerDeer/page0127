import { describe, expect, it } from 'vitest';

import { spineWidthPx } from '@/entities/book/model/spineWidth';

/**
 * 책등이 잘리지 않는지 계산으로 잠근다.
 *
 * 2026-09-29 회귀: 책등 폭을 두께에서 만들면서 `object-fit: cover` 를 걸었더니
 * **책등 위아래가 잘렸다.** 스캔이 세로로 길어서(예: 54x600) 폭 41px·높이 240px
 * 박스를 "덮으려면" 세로가 455px 로 넘치기 때문이다. 제목이 반쯤 사라졌다.
 *
 * 렌더링 자체는 브라우저가 하므로 여기서는 **그 조건이 성립한다는 사실**을 잠근다 —
 * 우리가 만드는 폭이 이미지의 자연 폭보다 넓으니 cover 를 쓰면 안 된다는 것.
 */

/** 셸프 CSS 가 고정하는 높이 */
const SHELF_HEIGHT = 240;

/** 백필이 책등을 높이 600 으로 리사이즈한다. 폭은 스캔마다 다르다(실측 31~67). */
const SPINE_IMAGE_HEIGHT = 600;
const MEASURED_SPINE_WIDTHS = [31, 36, 40, 49, 55, 67];

const naturalRenderedWidth = (imageWidth: number) =>
  imageWidth * (SHELF_HEIGHT / SPINE_IMAGE_HEIGHT);

describe('책등 폭과 이미지 비율', () => {
  it('우리가 만드는 폭은 스캔의 자연 폭보다 넓다 — 그래서 cover 를 쓰면 안 된다', () => {
    // 이 assertion 이 잠그는 회귀: 넓은 박스에 cover 를 걸면 세로가 넘쳐 잘린다.
    // 하나라도 "자연 폭이 더 넓다"면 그 책은 cover 로도 안전하다는 뜻이므로,
    // 전부 좁다는 것을 확인해 둔다.
    MEASURED_SPINE_WIDTHS.forEach((imageWidth) => {
      const natural = naturalRenderedWidth(imageWidth);
      const target = spineWidthPx(20); // 운영 두께 중앙값
      expect(natural).toBeLessThan(target);
    });
  });

  it('cover 로 그리면 세로가 얼마나 넘치는지 — 30% 이상이면 제목이 잘린다', () => {
    // 실측 평균 55%. 이 수치가 작아진다면(스캔 비율이 바뀐다면) 설계를 다시 볼 것.
    const imageWidth = 54; // 소년이 온다 책등
    const target = spineWidthPx(20);

    const coverScale = Math.max(
      target / imageWidth,
      SHELF_HEIGHT / SPINE_IMAGE_HEIGHT
    );
    const renderedHeight = SPINE_IMAGE_HEIGHT * coverScale;
    const lostRatio = (renderedHeight - SHELF_HEIGHT) / renderedHeight;

    expect(lostRatio).toBeGreaterThan(0.3);
  });

  it('두께를 모르는 책은 기본 폭이라 비율 문제가 같은 방식으로 적용된다', () => {
    // 기본값도 자연 폭보다 넓다 — 예외를 두지 않아야 선반이 한 가지 규칙으로 보인다.
    const natural = naturalRenderedWidth(55);
    expect(natural).toBeLessThan(spineWidthPx(null));
  });
});
