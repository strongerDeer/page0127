import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseCssVars, resolveVar } from '../src/css-vars.ts';

/**
 * 생성물(dist/tokens.css)이 2층 구조의 계약을 지키는지 검사한다.
 *
 * 왜 값 대조가 아닌가:
 * 이사 직후에는 이사 전 스냅샷(baseline.json)과 값을 대조했다. 그 방식은 이사를
 * 검증하는 데는 맞았지만 값이 **정당하게** 바뀌는 순간부터 방해가 된다 — 다크모드나
 * 브랜드 색 조정이 오면 실패하는데 버그인지 의도인지 구분할 수 없다.
 *
 * 지금은 역할을 셋으로 나눴다:
 * - 값이 실수로 바뀌는 것 → dist/tokens.css 가 커밋되므로 git diff 가 잡는다
 * - 이름이 사라지는 것    → apps/page0127/app/token-usage.test.ts (소비처 대조)
 * - 구조가 무너지는 것    → 이 파일
 */

const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');
const vars = parseCssVars(css);

/** primitive 는 이 접두사들로 시작한다. semantic 은 직무 이름이라 접두사가 없다. */
const PRIMITIVE_PREFIXES = [
  '--blue-',
  '--navy-',
  '--gray-',
  // 다크 모드 표면 전용 계열. 라이트의 navy 를 뒤집어 쓰던 것을 대체한다
  '--ink-',
  '--orange-',
  '--red-',
  '--amber-',
  '--slate-',
  '--teal-',
  '--violet-',
];
const isPrimitive = (name: string) => PRIMITIVE_PREFIXES.some((p) => name.startsWith(p));

describe('토큰 생성물 구조', () => {
  it('semantic 색 토큰은 원색을 var() 로 참조한다 — 값이 복사되면 2층 구조가 무의미해진다', () => {
    const copied: string[] = [];

    for (const [name, raw] of Object.entries(vars)) {
      if (isPrimitive(name)) continue;
      // 색이 아닌 토큰(--radius, --font-h1-*)은 리터럴이 정상이다
      if (!raw.startsWith('#')) continue;
      copied.push(`${name}: ${raw}`);
    }

    expect(copied).toEqual([]);
  });

  it('Figma 전용 토큰(space·corner)은 CSS 로 나가지 않는다', () => {
    const leaked = Object.keys(vars).filter(
      (n) => n.startsWith('--space-') || n.startsWith('--corner-'),
    );
    expect(leaked).toEqual([]);
  });

  it('모든 var() 참조가 이 파일 안에서 끝까지 해석된다 — 끊긴 참조가 없다', () => {
    const broken: string[] = [];

    for (const name of Object.keys(vars)) {
      try {
        resolveVar(vars, name);
      } catch (e) {
        broken.push(`${name}: ${(e as Error).message}`);
      }
    }

    expect(broken).toEqual([]);
  });

  it('primitive 와 semantic 이 둘 다 존재한다 — 파싱이 비어도 위 테스트들이 공짜로 통과하기 때문', () => {
    const names = Object.keys(vars);
    expect(names.filter(isPrimitive).length).toBeGreaterThanOrEqual(20);
    expect(names.filter((n) => !isPrimitive(n)).length).toBeGreaterThanOrEqual(46);
  });
});

/**
 * 다크 생성물(dist/tokens-dark.css).
 *
 * 여기서 가장 중요한 건 **이름 대조**다. 다크에만 있는 이름을 쓰면(오타 포함)
 * 아무도 읽지 않는 변수가 조용히 생기고, 화면은 라이트 값을 그대로 쓴 채
 * 아무 에러도 나지 않는다. 라이트에 같은 이름이 있어야만 덮어쓰기가 성립한다.
 */
const darkCss = readFileSync(
  new URL('../dist/tokens-dark.css', import.meta.url),
  'utf8',
);
const darkVars = parseCssVars(darkCss);

describe('다크 토큰 생성물', () => {
  it('OS 설정을 따르는 @media 블록 안에 있다 — .dark 클래스 전략이 아니다', () => {
    expect(darkCss).toContain('@media (prefers-color-scheme: dark)');
    // 블록 밖에 :root 가 또 있으면 라이트에서도 덮어써 버린다
    const rootCount = (darkCss.match(/:root/g) ?? []).length;
    expect(rootCount).toBe(1);
  });

  it('모든 다크 토큰 이름이 라이트에도 존재한다 — 없으면 아무도 안 읽는 변수다', () => {
    const orphans = Object.keys(darkVars).filter((n) => !(n in vars));
    expect(orphans).toEqual([]);
  });

  it('다크 토큰은 원색을 var() 로 참조한다 — 리터럴이면 2층 구조가 깨진다', () => {
    const copied = Object.entries(darkVars)
      .filter(([, raw]) => raw.startsWith('#'))
      .map(([n, raw]) => `${n}: ${raw}`);
    expect(copied).toEqual([]);
  });

  it('다크가 참조하는 원색이 라이트 파일에 전부 있다 — 끊긴 참조가 없다', () => {
    const broken: string[] = [];
    for (const [name, raw] of Object.entries(darkVars)) {
      for (const m of raw.matchAll(/var\((--[a-zA-Z0-9-]+)\)/g)) {
        if (!(m[1] in vars)) broken.push(`${name} → ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('덮어쓸 토큰이 실제로 있다 — 파일이 비어도 위 테스트들이 공짜로 통과하기 때문', () => {
    expect(Object.keys(darkVars).length).toBeGreaterThanOrEqual(25);
  });
});
