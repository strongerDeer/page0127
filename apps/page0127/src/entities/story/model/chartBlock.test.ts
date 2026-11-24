import { describe, expect, it } from 'vitest';

import {
  extractChartBlocks,
  findLeadStat,
  formatChartValue,
  niceMax,
  parseChartBlock,
  splitLabel,
  toNumber,
} from './chartBlock';

const SOURCE = 'source: 문화체육관광부 「2025 국민 독서실태 조사」';

describe('parseChartBlock', () => {
  it('가로 막대: 항목·출처·강조를 읽고, % 면 끝 값은 100', () => {
    const result = parseChartBlock(
      [
        'type: bar',
        'title: 누가 책을 읽었을까요',
        'unit: %',
        'highlight: 성인 전체',
        SOURCE,
        '- 학생: 94.6',
        '- 19~29세: 75.3',
        '- 성인 전체: 38.5',
      ].join('\n')
    );
    expect(result).toEqual({
      ok: true,
      spec: {
        type: 'bar',
        title: '누가 책을 읽었을까요',
        note: '',
        source: '문화체육관광부 「2025 국민 독서실태 조사」',
        unit: '%',
        max: 100,
        highlight: '성인 전체',
        items: [
          { label: '학생', value: 94.6 },
          { label: '19~29세', value: 75.3 },
          { label: '성인 전체', value: 38.5 },
        ],
      },
    });
  });

  it('권 단위는 가장 큰 값보다 조금 큰 보기 좋은 수를 끝으로 잡는다', () => {
    const result = parseChartBlock(
      [
        'type: bar',
        'unit: 권',
        SOURCE,
        '- 13~19세: 11.7',
        '- 20~29세: 9.4',
      ].join('\n')
    );
    expect(result.ok && result.spec.type === 'bar' && result.spec.max).toBe(20);
  });

  it('사람 그림은 % 와 0~100 만 받는다', () => {
    expect(
      parseChartBlock(
        ['type: people', 'value: 38.5', 'unit: %', SOURCE].join('\n')
      ).ok
    ).toBe(true);
    expect(
      parseChartBlock(
        ['type: people', 'value: 9.4', 'unit: 권', SOURCE].join('\n')
      ).ok
    ).toBe(false);
  });

  it('출처가 없는 통계 차트는 올리지 않는다', () => {
    const result = parseChartBlock(['type: number', 'value: 38.5'].join('\n'));
    expect(result).toEqual({
      ok: false,
      error: 'source: 에 출처를 적어 주세요.',
    });
  });

  it('기울기는 항목이 꼭 2개', () => {
    expect(
      parseChartBlock(['type: slope', SOURCE, '- 2011: 18.8'].join('\n')).ok
    ).toBe(false);
    expect(
      parseChartBlock(
        ['type: slope', 'unit: 권', SOURCE, '- 2011: 18.8', '- 2025: 9.4'].join(
          '\n'
        )
      ).ok
    ).toBe(true);
  });

  it('항목 이름의 콜론은 마지막 콜론에서 나눈다', () => {
    const result = parseChartBlock(
      ['type: bar', SOURCE, '- 밤 10:00 이후: 3'].join('\n')
    );
    expect(
      result.ok && result.spec.type === 'bar' && result.spec.items
    ).toEqual([{ label: '밤 10:00 이후', value: 3 }]);
  });

  it('없는 강조 항목·작은 max·모르는 type 은 이유를 알려 준다', () => {
    expect(
      parseChartBlock(
        ['type: bar', SOURCE, 'highlight: 없음', '- 가: 1'].join('\n')
      )
    ).toEqual({ ok: false, error: 'highlight 에 적은 "없음" 항목이 없어요.' });
    expect(
      parseChartBlock(['type: bar', SOURCE, 'max: 5', '- 가: 10'].join('\n')).ok
    ).toBe(false);
    expect(parseChartBlock('type: pie').ok).toBe(false);
  });

  it('내 기록은 출처 없이도 되고 rate 는 선택', () => {
    expect(parseChartBlock('type: my-record')).toEqual({
      ok: true,
      spec: { type: 'my-record', rate: null, label: '' },
    });
    expect(
      parseChartBlock(
        [
          'type: my-record',
          'rate: 38.5',
          'label: 올해 책을 1권 이상 읽은 성인',
        ].join('\n')
      )
    ).toEqual({
      ok: true,
      spec: {
        type: 'my-record',
        rate: 38.5,
        label: '올해 책을 1권 이상 읽은 성인',
      },
    });
  });
});

describe('본문에서 뽑기', () => {
  const body = [
    '첫 문단',
    '',
    '```chart',
    'type: bar',
    SOURCE,
    '- 가: 1',
    '```',
    '',
    '```chart',
    'type: people',
    'value: 38.5',
    'unit: %',
    'label: 1년에 책을 1권 이상 읽은 성인',
    SOURCE,
    '```',
    '',
    '```ts',
    'const notAChart = 1;',
    '```',
  ].join('\n');

  it('chart 블록만 순서대로 뽑는다', () => {
    expect(extractChartBlocks(body)).toHaveLength(2);
  });

  it('첫 숫자 차트를 목록용 숫자로 쓴다 (막대는 건너뛴다)', () => {
    expect(findLeadStat(body)).toEqual({
      value: 38.5,
      unit: '%',
      label: '1년에 책을 1권 이상 읽은 성인',
      people: 3.85,
    });
  });

  it('책장(shelf)이 먼저면 첫 무리의 읽은 비율을 쓴다', () => {
    const shelf = [
      '```chart',
      'type: shelf',
      SOURCE,
      '- 성인(만 19세 이상): 38.5 / 2.4 / 6',
      '- 학생: 94.6 / 31.5',
      '```',
    ].join('\n');
    expect(findLeadStat(shelf)).toEqual({
      value: 38.5,
      unit: '%',
      label: '1년 동안 책을 읽은 성인',
      people: 3.85,
    });
  });

  it('차트가 없으면 null', () => {
    expect(findLeadStat('그냥 글')).toBeNull();
  });
});

describe('숫자 다루기', () => {
  it('toNumber 는 단위·쉼표를 무시한다', () => {
    expect(toNumber('9.4권')).toBe(9.4);
    expect(toNumber('1,234')).toBe(1234);
    expect(toNumber('없음')).toBeNull();
  });

  it('niceMax', () => {
    expect(niceMax(18.8)).toBe(25);
    expect(niceMax(11.7)).toBe(20);
    expect(niceMax(0)).toBe(1);
  });

  it('formatChartValue 는 소수 한 자리', () => {
    expect(formatChartValue(43)).toBe('43');
    expect(formatChartValue(38.5)).toBe('38.5');
  });
});

describe('formatChartValue', () => {
  it('같은 차트에 소수가 있으면 정수도 한 자리로 맞춘다', () => {
    expect(formatChartValue(55)).toBe('55');
    expect(formatChartValue(55, true)).toBe('55.0');
    expect(formatChartValue(38.5)).toBe('38.5');
    expect(formatChartValue(1234)).toBe('1,234');
  });
});

describe('shelf (책장 비교)', () => {
  it('비율 / 전체 평균 / 읽은 사람 평균 + 괄호 설명', () => {
    const result = parseChartBlock(
      [
        'type: shelf',
        'title: 성인과 학생',
        SOURCE,
        '- 성인(만 19세 이상): 38.5 / 2.4 / 6',
        '- 학생: 94.6 / 31.5',
      ].join('\n')
    );
    expect(
      result.ok && result.spec.type === 'shelf' && result.spec.groups
    ).toEqual([
      {
        label: '성인',
        sub: '만 19세 이상',
        rate: 38.5,
        average: 2.4,
        readers: 6,
      },
      { label: '학생', sub: '', rate: 94.6, average: 31.5, readers: null },
    ]);
  });

  it('읽은 사람 평균이 전체 평균보다 작거나, 책이 너무 많으면 거절', () => {
    const block = (line: string) =>
      parseChartBlock(['type: shelf', SOURCE, line].join('\n'));
    expect(block('- 성인: 38.5 / 2.4 / 1').ok).toBe(false);
    expect(block('- 성인: 38.5 / 80').ok).toBe(false);
    expect(block('- 성인: 120 / 2.4').ok).toBe(false);
    expect(block('- 성인: 38.5').ok).toBe(false);
  });

  it('무리는 1~2개', () => {
    const lines = ['- 가: 10 / 1', '- 나: 10 / 1', '- 다: 10 / 1'];
    expect(
      parseChartBlock(['type: shelf', SOURCE, ...lines].join('\n')).ok
    ).toBe(false);
  });
});

describe('age-table (나이별 표)', () => {
  it('비율 / 권수, 모르는 권수는 -, 기준선', () => {
    const result = parseChartBlock(
      [
        'type: age-table',
        'unit: 권',
        'max: 15',
        'line: 7.0',
        'line-label: 13세 이상 전체 평균 약 7권',
        SOURCE,
        '- 13~19세: 69.8 / 11.7',
        '- 60세 이상: 30.0 / -',
      ].join('\n')
    );
    expect(result).toEqual({
      ok: true,
      spec: {
        type: 'age-table',
        title: '',
        note: '',
        source: '문화체육관광부 「2025 국민 독서실태 조사」',
        unit: '권',
        max: 15,
        line: 7,
        lineLabel: '13세 이상 전체 평균 약 7권',
        rows: [
          { label: '13~19세', rate: 69.8, value: 11.7 },
          { label: '60세 이상', rate: 30, value: null },
        ],
      },
    });
  });

  it('max 를 안 적으면 가장 큰 값으로 끝을 잡는다', () => {
    const result = parseChartBlock(
      ['type: age-table', SOURCE, '- 20대: 60 / 9.4'].join('\n')
    );
    expect(
      result.ok && result.spec.type === 'age-table' && result.spec.max
    ).toBe(20);
  });

  it('값이 두 개가 아니거나 권수가 하나도 없으면 거절', () => {
    expect(
      parseChartBlock(['type: age-table', SOURCE, '- 20대: 60'].join('\n')).ok
    ).toBe(false);
    expect(
      parseChartBlock(['type: age-table', SOURCE, '- 20대: 60 / -'].join('\n'))
        .ok
    ).toBe(false);
    expect(
      parseChartBlock(
        ['type: age-table', 'max: 5', SOURCE, '- 20대: 60 / 9.4'].join('\n')
      ).ok
    ).toBe(false);
  });
});

describe('splitLabel', () => {
  it('끝 괄호만 설명으로', () => {
    expect(splitLabel('학생(초등 4학년~고등 3학년)')).toEqual({
      label: '학생',
      sub: '초등 4학년~고등 3학년',
    });
    expect(splitLabel('성인 전체')).toEqual({ label: '성인 전체', sub: '' });
  });
});
