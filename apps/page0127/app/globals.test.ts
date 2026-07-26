import { readFileSync } from 'node:fs';

import { parseCssVars } from '@repo/design-tokens/css-vars';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: globals.css 의 `@theme inline` 블록이 semantic 색 토큰을
 * 빠짐없이 `--color-*` 로 Tailwind 에 매핑하고 있는지 검사한다.
 *
 * 왜 필요한가: packages/design-tokens 의 회귀 테스트(tokens.test.ts)는
 * dist/tokens.css 에 `--rank-up` 같은 변수가 "존재하는지"만 본다. 누가
 * globals.css 에서 `--color-rank-up: var(--rank-up);` 한 줄을 실수로
 * 지워도 그 테스트는 여전히 통과한다 — `--rank-up` 자체는 dist 에 멀쩡히
 * 있기 때문이다. 하지만 `bg-rank-up` 같은 Tailwind 클래스를 쓰는 화면은
 * 조용히 깨진다. 이 테스트는 그 경계 반대편(패키지 → 앱 배선)을 지킨다.
 *
 * 무엇을 검사하지 않는가:
 * - primitive(`--blue-600` 등): 컴포넌트가 직접 쓰지 않으므로 매핑 대상이 아니다.
 * - 색이 아닌 토큰(`--radius`, `--font-h1-*` 등): `--color-*` 매핑 대상이 아니다.
 */

/** DTCG 토큰 트리에서 `$type: color` 인 리프만 골라 CSS 변수 이름(kebab)으로 펼친다. */
function flattenColorTokenNames(tree: Record<string, unknown>, prefix: string[] = []): string[] {
  const names: string[] = [];

  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$')) continue;
    if (typeof value !== 'object' || value === null) continue;

    const node = value as Record<string, unknown>;
    const path = [...prefix, key];

    if ('$value' in node) {
      if (node.$type === 'color') names.push(`--${path.join('-')}`);
    } else {
      names.push(...flattenColorTokenNames(node, path));
    }
  }

  return names;
}

const semanticJson = JSON.parse(
  readFileSync(
    new URL('../../../packages/design-tokens/tokens/semantic.json', import.meta.url),
    'utf8',
  ),
) as Record<string, unknown>;

const semanticColorNames = flattenColorTokenNames(semanticJson);

const generatedCss = readFileSync(
  new URL('../../../packages/design-tokens/dist/tokens.css', import.meta.url),
  'utf8',
);
const generated = parseCssVars(generatedCss);

const globalsCss = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');
const themeVars = parseCssVars(globalsCss, { blockSelector: '@theme inline' });

/**
 * 매핑이 의도적으로 없는 semantic 색 토큰의 제외 목록.
 * 조사 결과(2026-07-26): 현재 semantic 색 토큰 41개 전부가 `--color-*` 로
 * 매핑되어 있어 제외 대상이 없다(`--sunken`·`--line-soft` 포함, 둘 다 확인함).
 * 나중에 의도적으로 매핑을 빼는 토큰이 생기면 여기 추가하고 이유를 남긴다.
 */
const MAPPING_NOT_REQUIRED: string[] = [];

describe('globals.css @theme inline 색 매핑 안전망', () => {
  it('semantic.json 에서 뽑은 색 토큰 이름이 실제 생성된 dist/tokens.css 변수와 일치한다 (sanity)', () => {
    // 이 테스트가 먼저 통과해야, 아래 매핑 검사가 올바른 토큰 이름 집합을 쓰고 있다고 믿을 수 있다.
    const notGenerated = semanticColorNames.filter((name) => !(name in generated));
    expect(notGenerated).toEqual([]);
  });

  it('semantic 색 토큰마다 --color-* 매핑이 존재한다', () => {
    const missing = semanticColorNames
      .filter((name) => !MAPPING_NOT_REQUIRED.includes(name))
      .filter((name) => {
        const mappingKey = `--color-${name.slice(2)}`;
        return themeVars[mappingKey] !== `var(${name})`;
      });

    expect(missing).toEqual([]);
  });
});
