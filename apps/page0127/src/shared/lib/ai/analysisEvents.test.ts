import { describe, expect, it } from 'vitest';

import {
  estimateJsonProgress,
  splitNdjson,
  toOverallProgress,
} from './analysisEvents';
import {
  COMPATIBILITY_PROGRESS,
  COMPATIBILITY_SCHEMA,
} from './prompts/compatibility';
import {
  createTasteAnalysisSchema,
  TASTE_ANALYSIS_PROGRESS,
} from './prompts/taste-analysis';

describe('toOverallProgress', () => {
  it('AI 답 쓰기 구간은 5%에서 시작해 85%에서 끝난다', () => {
    expect(toOverallProgress('analyzing', 0)).toBeCloseTo(0.05);
    expect(toOverallProgress('analyzing', 1)).toBeCloseTo(0.85);
  });

  it('뒤 단계는 앞 단계보다 항상 크다 — 막대가 뒤로 가지 않는다', () => {
    expect(toOverallProgress('saving')).toBeGreaterThanOrEqual(
      toOverallProgress('analyzing', 1)
    );
    expect(toOverallProgress('covers')).toBeGreaterThan(
      toOverallProgress('saving', 1) - 0.001
    );
  });

  it('범위를 벗어난 값은 잘라 낸다', () => {
    expect(toOverallProgress('analyzing', 2)).toBeCloseTo(0.85);
    expect(toOverallProgress('analyzing', -1)).toBeCloseTo(0.05);
  });
});

describe('estimateJsonProgress', () => {
  const { milestones, repeatKey, from, to } = TASTE_ANALYSIS_PROGRESS;
  const repeat = { key: repeatKey, expected: 4, from, to };

  it('아직 아무 키도 안 나왔으면 0', () => {
    expect(estimateJsonProgress('{', milestones, repeat)).toBe(0);
  });

  it('나온 키 중 가장 뒤의 이정표를 따른다', () => {
    const text =
      '{"personality_type":"x","personality_description":"y","preference_profile":{';
    expect(estimateJsonProgress(text, milestones, repeat)).toBeCloseTo(0.3);
  });

  it('추천 제목이 늘수록 마지막 구간이 찬다', () => {
    const head = '{"recommendations":[';
    const two = `${head}{"title":"a"},{"title":"b"}`;
    const four = `${two},{"title":"c"},{"title":"d"}`;
    const twoRatio = estimateJsonProgress(two, milestones, repeat);
    const fourRatio = estimateJsonProgress(four, milestones, repeat);
    expect(twoRatio).toBeGreaterThan(from);
    expect(fourRatio).toBeGreaterThan(twoRatio);
    expect(fourRatio).toBeLessThan(1);
  });
});

describe('splitNdjson', () => {
  it('끝나지 않은 마지막 줄은 다음 조각을 위해 남긴다', () => {
    const { lines, rest } = splitNdjson(
      '{"type":"stage","stage":"analyzing"}\n{"type":"prog'
    );
    expect(lines).toEqual([{ type: 'stage', stage: 'analyzing' }]);
    expect(rest).toBe('{"type":"prog');
  });

  it('깨진 줄은 건너뛰고 나머지는 읽는다', () => {
    const { lines } = splitNdjson(
      'not json\n{"type":"done","analysisId":"a"}\n'
    );
    expect(lines).toEqual([{ type: 'done', analysisId: 'a' }]);
  });
});

/** structured outputs 규칙: 모든 객체는 additionalProperties:false, 모든 키가 required */
const collectObjectViolations = (node: unknown, path = '$'): string[] => {
  if (!node || typeof node !== 'object') return [];
  const schema = node as Record<string, unknown>;
  const out: string[] = [];
  if (schema.type === 'object') {
    const keys = Object.keys((schema.properties as object) ?? {});
    if (schema.additionalProperties !== false)
      out.push(`${path} additionalProperties`);
    if (JSON.stringify(schema.required) !== JSON.stringify(keys)) {
      out.push(`${path} required`);
    }
    for (const [key, child] of Object.entries(
      (schema.properties as Record<string, unknown>) ?? {}
    )) {
      out.push(...collectObjectViolations(child, `${path}.${key}`));
    }
  }
  if (schema.type === 'array') {
    out.push(...collectObjectViolations(schema.items, `${path}[]`));
  }
  return out;
};

/** 스키마의 키를 쓰는 순서대로 펼친다 — 진행률 이정표가 이 순서를 따라야 한다 */
const flattenKeys = (node: unknown): string[] => {
  const schema = node as Record<string, unknown>;
  if (schema?.type === 'object') {
    return Object.entries(schema.properties as Record<string, unknown>).flatMap(
      ([key, child]) => [key, ...flattenKeys(child)]
    );
  }
  if (schema?.type === 'array') return flattenKeys(schema.items);
  return [];
};

describe.each([
  {
    name: '취향 분석',
    schema: createTasteAnalysisSchema(['마음의 결을 읽는 사람']),
    progress: TASTE_ANALYSIS_PROGRESS,
  },
  {
    name: '독서 케미',
    schema: COMPATIBILITY_SCHEMA,
    progress: COMPATIBILITY_PROGRESS,
  },
])('$name 응답 스키마', ({ schema, progress }) => {
  it('structured outputs 규칙을 지킨다', () => {
    expect(collectObjectViolations(schema)).toEqual([]);
  });

  it('진행률 이정표가 스키마의 쓰는 순서와 같다', () => {
    const order = flattenKeys(schema);
    const positions = progress.milestones.map(([key]) => order.indexOf(key));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(order).toContain(progress.repeatKey);
  });
});
