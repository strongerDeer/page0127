import { describe, expect, it } from 'vitest';

import { computeFirstLoadKb, parseEslintCount, parseTscCount } from './build';

describe('build parsers', () => {
  it('computeFirstLoadKb가 중복 제거 후 바이트를 KB로 합산한다', () => {
    const sizeOf = (f: string): number =>
      ({ 'a.js': 1024, 'b.js': 2048 })[f] ?? 0;
    expect(computeFirstLoadKb(['a.js', 'b.js', 'a.js'], sizeOf)).toBe(3); // 3072B → 3KB
  });

  it('tsc --noEmit 출력 줄 수에서 에러 개수를 센다', () => {
    const tsc = `app/x.ts(3,5): error TS2322: ...\napp/y.ts(7,1): error TS2531: ...`;
    expect(parseTscCount(tsc)).toBe(2);
  });

  it('eslint 요약 줄에서 에러/경고를 분리한다', () => {
    const out = `✖ 16 problems (2 errors, 14 warnings)`;
    expect(parseEslintCount(out)).toEqual({ errors: 2, warnings: 14 });
  });
});
