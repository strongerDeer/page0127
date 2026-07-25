import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { normalize, parseCssVars, resolveVar } from './css-vars.ts';

const baseline: Record<string, string> = JSON.parse(
  readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'),
);

const generated = parseCssVars(
  readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8'),
);

/**
 * 의도적으로 값을 바꾼 토큰.
 * gray/50(#f6f7f8) 과 gray/100(#f1f3f5) 은 밝기 차 L* 약 2 로 육안 구분이 안 돼
 * 하나로 합쳤다. 설계 문서 §5.2 참조.
 */
const INTENTIONAL_VALUE_CHANGES: Record<string, string> = {
  '--secondary': '#f6f7f8',
  '--muted': '#f6f7f8',
};

describe('디자인 토큰 이사 회귀 방지', () => {
  it('기존 semantic 토큰 이름이 하나도 빠지지 않는다', () => {
    const missing = Object.keys(baseline).filter((name) => !(name in generated));
    expect(missing).toEqual([]);
  });

  it('의도적으로 바꾼 2개를 빼면 최종 계산값이 이사 전과 같다', () => {
    const diffs: string[] = [];
    for (const [name, before] of Object.entries(baseline)) {
      if (name in INTENTIONAL_VALUE_CHANGES) continue;
      const after = normalize(resolveVar(generated, name));
      if (after !== before) diffs.push(`${name}: ${before} → ${after}`);
    }
    expect(diffs).toEqual([]);
  });

  it('통합된 2개는 gray/50 값을 가진다', () => {
    for (const [name, expected] of Object.entries(INTENTIONAL_VALUE_CHANGES)) {
      expect(normalize(resolveVar(generated, name))).toBe(expected);
    }
  });
});
