import { describe, expect, it } from 'vitest';

import {
  computeFirstLoadKb,
  parseEslintCount,
  parseTscCount,
  tailLines,
} from './build';

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

  it('tailLines가 마지막 n줄만 남긴다', () => {
    expect(tailLines('a\nb\nc\nd', 2)).toBe('c\nd');
  });

  it('tailLines가 줄 수보다 n이 크면 전체를 그대로 돌려준다', () => {
    expect(tailLines('a\nb', 10)).toBe('a\nb');
  });

  it('tailLines가 끝의 빈 줄에 자리를 뺏기지 않는다', () => {
    // 빌드 출력은 개행으로 끝나는 게 보통이라, 정리 안 하면 마지막 줄이 빈 줄이 된다.
    expect(tailLines('a\nb\n\n', 1)).toBe('b');
  });
});
