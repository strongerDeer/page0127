import type { StoryLeadStat } from './types';

/**
 * 본문 속 차트 블록(```chart) → 그릴 수 있는 값. (HJ 2026-11-24 A안)
 *
 * 왜 마크다운 안에 적나:
 *   글은 어드민에서 쓰고 저장하면 바로 올라간다(배포 X). 차트도 같은 길로 올리려면
 *   "숫자를 글자로 적으면 서버가 그림으로 바꾸는" 약속이 필요하다. 코드 블록은 마크다운이
 *   원래 가진 문법이라 react-markdown 이 그대로 넘겨 주고, 다른 편집기에서도 글자로 남는다.
 *
 * 쓰는 법 (한 줄에 "이름: 값", 항목은 "- 이름: 숫자"):
 *
 *   ```chart
 *   type: bar
 *   title: 누가 책을 읽었을까요
 *   unit: %
 *   highlight: 성인 전체
 *   source: 문화체육관광부 「2025 국민 독서실태 조사」
 *   - 학생: 94.6
 *   - 19~29세: 75.3
 *   - 성인 전체: 38.5
 *   ```
 *
 * 종류(type):
 *   number    큰 숫자 하나          value · unit · label
 *   people    사람 10명 그림         value(0~100) · unit % · label
 *   bar       가로 막대(항목 비교)    - 항목: 값 (1~12개)
 *   column    세로 막대(연도 비교)    - 항목: 값 (2~10개)
 *   slope     두 시점을 잇는 선       - 항목: 값 (꼭 2개)
 *   my-record 로그인한 사람의 올해 완독 수   rate(선택) · label(선택)
 *
 * 순수 함수라 테스트로 문법을 지킨다(chartBlock.test.ts). 틀린 블록은 공개 페이지에서는
 * 그리지 않고, 어드민 미리보기에서만 이유를 보여 준다.
 */

export type ChartItem = { label: string; value: number };

type Common = {
  title: string;
  /** 정의·기준 설명 한 줄 (그림 아래 작은 글씨) */
  note: string;
  /** 출처 한 줄. 통계 차트는 출처 없이 올리지 않는다 */
  source: string;
};

export type SingleChart = Common & {
  type: 'number' | 'people';
  value: number;
  unit: string;
  label: string;
};

export type SeriesChart = Common & {
  type: 'bar' | 'column' | 'slope';
  unit: string;
  /** 막대 끝 값. 안 적으면 % 는 100, 나머지는 가장 큰 값보다 조금 크게 */
  max: number;
  /** 진하게 칠할 항목 이름. 안 적으면 bar 는 모두 진하게, column 은 마지막 항목 */
  highlight: string | null;
  items: ChartItem[];
};

export type MyRecordChart = {
  type: 'my-record';
  /** 비교할 조사 숫자(예: 성인 종합독서율 38.5). 없으면 비교 문장을 빼고 내 숫자만 */
  rate: number | null;
  /** rate 가 무엇인지 — "올해 책을 1권 이상 읽은 성인" */
  label: string;
};

export type ChartSpec = SingleChart | SeriesChart | MyRecordChart;

export type ChartParseResult =
  { ok: true; spec: ChartSpec } | { ok: false; error: string };

export const CHART_TYPES = [
  'number',
  'people',
  'bar',
  'column',
  'slope',
  'my-record',
] as const;

const MAX_ITEMS: Record<SeriesChart['type'], [number, number]> = {
  bar: [1, 12],
  column: [2, 10],
  slope: [2, 2],
};

/** "38.5" · "1,234" · "9.4권" → 숫자. 숫자가 아니면 null */
export const toNumber = (raw: string): number | null => {
  const match = /^-?[\d,]*\.?\d+/.exec(raw.trim());
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

/** 막대 끝 값 — 가장 큰 값의 1.2배를 보기 좋은 수(1·2·2.5·5·10 단위)로 올린다 */
export const niceMax = (largest: number): number => {
  if (largest <= 0) return 1;
  const target = largest * 1.2;
  const power = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= target) ?? 10;
  return step * power;
};

export const parseChartBlock = (text: string): ChartParseResult => {
  const fields = new Map<string, string>();
  const items: ChartItem[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('- ')) {
      // 항목 이름에 콜론이 들어갈 수 있으니 마지막 콜론에서 나눈다 ("19:00 이후: 3")
      const body = line.slice(2);
      const at = Math.max(body.lastIndexOf(':'), body.lastIndexOf('：'));
      if (at <= 0)
        return {
          ok: false,
          error: `항목은 "- 이름: 숫자"로 적어 주세요: ${line}`,
        };
      const label = body.slice(0, at).trim();
      const value = toNumber(body.slice(at + 1));
      if (!label || value === null)
        return { ok: false, error: `항목의 숫자를 읽지 못했어요: ${line}` };
      items.push({ label, value });
      continue;
    }

    const match = /^([a-zA-Z-]+)\s*[:：](.*)$/.exec(line);
    if (!match)
      return { ok: false, error: `"이름: 값" 모양이 아니에요: ${line}` };
    fields.set(match[1].toLowerCase(), match[2].trim());
  }

  const type = fields.get('type');
  if (!type) return { ok: false, error: '첫 줄에 type: 을 적어 주세요.' };
  if (!(CHART_TYPES as readonly string[]).includes(type))
    return {
      ok: false,
      error: `type 은 ${CHART_TYPES.join(' · ')} 중 하나예요.`,
    };

  const common: Common = {
    title: fields.get('title') ?? '',
    note: fields.get('note') ?? '',
    source: fields.get('source') ?? '',
  };

  if (type === 'my-record') {
    const rawRate = fields.get('rate');
    const rate = rawRate === undefined ? null : toNumber(rawRate);
    if (rawRate !== undefined && (rate === null || rate < 0 || rate > 100))
      return { ok: false, error: 'rate 는 0~100 사이 숫자예요.' };
    return {
      ok: true,
      spec: { type, rate, label: fields.get('label') ?? '' },
    };
  }

  // 통계 차트는 출처가 없으면 올리지 않는다 — "확인 못 한 숫자는 내보내지 않기"
  if (!common.source)
    return { ok: false, error: 'source: 에 출처를 적어 주세요.' };

  const unit = fields.get('unit') ?? '';

  if (type === 'number' || type === 'people') {
    const value = toNumber(fields.get('value') ?? '');
    if (value === null)
      return { ok: false, error: 'value: 에 숫자를 적어 주세요.' };
    if (type === 'people' && (unit !== '%' || value < 0 || value > 100))
      return {
        ok: false,
        error: 'people 은 unit: % 이고 value 가 0~100 이어야 해요.',
      };
    return {
      ok: true,
      spec: {
        ...common,
        type,
        value,
        unit,
        label: fields.get('label') ?? common.title,
      },
    };
  }

  const seriesType = type as SeriesChart['type'];
  const [min, max] = MAX_ITEMS[seriesType];
  if (items.length < min || items.length > max)
    return {
      ok: false,
      error:
        min === max
          ? `${type} 는 항목이 ${min}개여야 해요.`
          : `${type} 는 항목을 ${min}~${max}개 적어 주세요.`,
    };
  if (items.some((item) => item.value < 0))
    return { ok: false, error: '막대 값은 0 이상이어야 해요.' };

  const largest = Math.max(...items.map((item) => item.value));
  const rawMax = fields.get('max');
  const givenMax = rawMax === undefined ? null : toNumber(rawMax);
  if (rawMax !== undefined && (givenMax === null || givenMax < largest))
    return {
      ok: false,
      error: `max 는 가장 큰 값(${largest}) 이상이어야 해요.`,
    };

  const highlight = fields.get('highlight') ?? null;
  if (highlight && !items.some((item) => item.label === highlight))
    return {
      ok: false,
      error: `highlight 에 적은 "${highlight}" 항목이 없어요.`,
    };

  return {
    ok: true,
    spec: {
      ...common,
      type: seriesType,
      unit,
      max: givenMax ?? (unit === '%' ? 100 : niceMax(largest)),
      highlight,
      items,
    },
  };
};

/** 마크다운 본문에서 ```chart 블록 안쪽 글자만 순서대로 뽑는다 */
export const extractChartBlocks = (body: string): string[] =>
  [...body.matchAll(/^```chart[^\S\n]*\n([\s\S]*?)^```[^\S\n]*$/gm)].map(
    (match) => match[1]
  );

/**
 * 목록·공유 이미지에 쓸 첫 숫자 — 본문의 첫 number·people 차트.
 * 저장할 때 한 번 계산해 stories.lead_stat 에 넣는다.
 */
export const findLeadStat = (body: string): StoryLeadStat | null => {
  for (const block of extractChartBlocks(body)) {
    const result = parseChartBlock(block);
    if (!result.ok) continue;
    const { spec } = result;
    if (spec.type === 'number' || spec.type === 'people')
      return {
        value: spec.value,
        unit: spec.unit,
        label: spec.label,
        people: spec.type === 'people' ? spec.value / 10 : null,
      };
  }
  return null;
};

/**
 * 숫자 표시 — 소수점이 있으면 한 자리, 천 단위 쉼표.
 * oneDecimal: 같은 차트 안에 소수가 하나라도 있으면 정수도 "55.0"처럼 맞춘다(자릿수가 들쭉날쭉하지 않게)
 */
export const formatChartValue = (
  value: number,
  oneDecimal = !Number.isInteger(value)
): string =>
  value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: oneDecimal ? 1 : 0,
  });
