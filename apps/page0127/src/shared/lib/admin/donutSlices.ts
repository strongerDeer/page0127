import { adminCategoricalColor, adminInk } from './adminChartColors';

export type DonutInput = {
  key: string;
  label: string;
  value: number;
  /** 범례 오른쪽 문구 — 없으면 "값 · 비율" */
  display?: string;
  /** 범례에 마우스를 올리면 뜨는 풀이 */
  hint?: string;
};

export type DonutSlice = DonutInput & {
  color: string;
  /** 0~1 */
  share: number;
  /** 원 둘레 위 시작 위치(0~1) */
  start: number;
};

export const REST_KEY = '__rest';

/**
 * 도넛 조각 만들기 — 큰 순서로 maxSlices 개만 남기고 나머지는 "기타" 한 조각으로 묶는다.
 * 조각이 6개를 넘으면 색 구분이 안 되고 얇은 조각은 안 보여서, 상위 4개 + 기타가 기본이다.
 * 0 인 항목은 그리지 않는다(길이 0 조각은 범례만 늘린다).
 */
export const buildDonutSlices = (
  items: DonutInput[],
  maxSlices = 4,
  restLabel = '기타'
): DonutSlice[] => {
  const sorted = items
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = sorted.reduce((a, i) => a + i.value, 0);
  if (total === 0) return [];

  // 하나만 남는 "기타"는 그 항목 이름을 그대로 쓰는 편이 낫다
  const head =
    sorted.length > maxSlices + 1 ? sorted.slice(0, maxSlices) : sorted;
  const tail = sorted.slice(head.length);
  const restValue = tail.reduce((a, i) => a + i.value, 0);

  const withRest: (DonutInput & { rest?: boolean })[] =
    restValue > 0
      ? [
          ...head,
          {
            key: REST_KEY,
            label: `${restLabel} ${tail.length}곳`,
            value: restValue,
            rest: true,
          },
        ]
      : head;

  let start = 0;
  return withRest.map((item, i) => {
    const share = item.value / total;
    const slice: DonutSlice = {
      key: item.key,
      label: item.label,
      value: item.value,
      display: item.display,
      hint: item.hint,
      color: item.rest ? adminInk.rest : adminCategoricalColor(i),
      share,
      start,
    };
    start += share;
    return slice;
  });
};
