import { describe, expect, it } from 'vitest';

import { adminInk } from './adminChartColors';
import { buildDonutSlices, REST_KEY } from './donutSlices';

const item = (key: string, value: number) => ({ key, label: key, value });

describe('buildDonutSlices', () => {
  it('큰 순서로 정렬하고 비율·시작 위치를 쌓는다', () => {
    const s = buildDonutSlices([item('b', 1), item('a', 3)]);
    expect(s.map((x) => x.key)).toEqual(['a', 'b']);
    expect(s[0]).toMatchObject({ share: 0.75, start: 0 });
    expect(s[1]).toMatchObject({ share: 0.25, start: 0.75 });
  });

  it('상위 4개 밖은 기타 한 조각으로 묶는다', () => {
    const s = buildDonutSlices([
      item('a', 50),
      item('b', 20),
      item('c', 10),
      item('d', 8),
      item('e', 7),
      item('f', 5),
    ]);
    expect(s).toHaveLength(5);
    expect(s[4]).toMatchObject({
      key: REST_KEY,
      label: '기타 2곳',
      value: 12,
      color: adminInk.rest,
    });
  });

  it('하나 남는 건 기타로 묶지 않는다', () => {
    const s = buildDonutSlices([
      item('a', 5),
      item('b', 4),
      item('c', 3),
      item('d', 2),
      item('e', 1),
    ]);
    expect(s.map((x) => x.key)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('0 인 항목은 빼고, 전부 0 이면 빈 배열', () => {
    expect(buildDonutSlices([item('a', 0), item('b', 2)])).toHaveLength(1);
    expect(buildDonutSlices([item('a', 0)])).toEqual([]);
  });
});
