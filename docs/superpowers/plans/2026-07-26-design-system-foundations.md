# 디자인 시스템 라운드 1 — Foundations 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드에서 운용 중인 디자인 토큰을 primitive/semantic 2층으로 정리해 `packages/design-tokens`에서 생성하도록 바꾸고, 같은 값을 Figma Variables로 옮겨 왕복 경로를 연다.

**Architecture:** Style Dictionary v5가 `tokens/*.json`(DTCG 형식)을 읽어 `dist/tokens.css`를 생성하고, `globals.css`가 이를 `@import` 한다. semantic 토큰 46개의 **이름을 그대로 계승**하므로 컴포넌트 코드는 수정하지 않는다. 회귀는 이사 전 스냅샷과 생성물을 대조하는 vitest로 막는다.

**Tech Stack:** Style Dictionary v5 (ESM), vitest, Tailwind v4 `@theme`, Figma Variables + Tokens Studio 플러그인

**설계 문서:** `docs/superpowers/specs/2026-07-26-design-system-foundations-design.md`

## Global Constraints

- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 절대 넣지 않는다.** (`CLAUDE.md` 6번)
- **컴포넌트 코드는 한 줄도 수정하지 않는다.** semantic 46개 이름을 전부 계승한다.
- **값이 바뀌어도 되는 토큰은 `--secondary`·`--muted` 둘뿐이다** (`#f1f3f5` → `#f6f7f8`). 그 외 토큰의 최종 계산값이 달라지면 버그다.
- Node `>=22.19.0 <23`
- `style-dictionary` `^5` (ESM). 기존 `^3.9.2` CommonJS 설정은 폐기한다.
- 다크모드 값은 만들지 않는다. 2층 구조만 갖춘다.
- 패키지는 토큰의 **값**만 갖는다. Tailwind 노출 방식(`@theme inline`)은 앱에 남긴다.
- 테스트 파일은 `.test.ts` (vitest). `.spec.ts`는 Playwright 몫이라 쓰지 않는다.

---

## File Structure

**생성**

| 파일 | 책임 |
|---|---|
| `packages/design-tokens/tokens/primitives.json` | 원색 팔레트 32개 (색 20 + space 8 + corner 4) |
| `packages/design-tokens/tokens/semantic.json` | 직무 토큰 46개. 전부 primitive 참조 |
| `packages/design-tokens/build.mjs` | Style Dictionary 설정 및 빌드 실행 |
| `packages/design-tokens/tests/css-vars.ts` | CSS 커스텀 프로퍼티 파서 + `var()` 재귀 해석기 |
| `packages/design-tokens/scripts/extract-baseline.ts` | 이사 전 `globals.css`에서 기준선 추출 (1회용) |
| `packages/design-tokens/tests/baseline.json` | 기준선 스냅샷 46개 (생성 후 커밋) |
| `packages/design-tokens/tests/tokens.test.ts` | 이름 누락·값 변경 회귀 테스트 |
| `packages/design-tokens/tsconfig.json` | `type-check`용 |

**수정**

| 파일 | 변경 |
|---|---|
| `packages/design-tokens/package.json` | 전면 재작성 (v5, ESM, vitest) |
| `packages/design-tokens/.gitignore` | `src` → `dist` |
| `apps/page0127/app/globals.css` | `:root` 블록 제거 → `@import`. 타이포 줄간격 조정 |
| `apps/page0127/package.json` | `@repo/design-tokens` 의존성 추가 |
| `apps/page0127/next.config.ts` | `transpilePackages`에 추가 |
| `turbo.json` | `build.outputs`에 `dist/**` 추가 |

**삭제**

| 파일 | 이유 |
|---|---|
| `packages/design-tokens/style-dictionary.config.js` | v3 CommonJS API. v5와 호환되지 않음 |
| `packages/design-tokens/tokens/core.json` | 폐기된 인디고 팔레트 |
| `packages/design-tokens/tokens/light.json` | 〃 |
| `packages/design-tokens/tokens/dark.json` | 〃 |
| `packages/design-tokens/README.md` | 내용이 전부 옛 구조 기준 → Task 3에서 새로 작성 |

---

## Task 1: 기준선 스냅샷과 실패하는 대조 테스트

이사 **전에** 현재 상태를 붙잡아 둔다. 이게 없으면 나중에 무엇이 달라졌는지 증명할 방법이 없다.

**Files:**
- Modify: `packages/design-tokens/package.json`
- Modify: `packages/design-tokens/.gitignore`
- Create: `packages/design-tokens/tsconfig.json`
- Create: `packages/design-tokens/tests/css-vars.ts`
- Create: `packages/design-tokens/scripts/extract-baseline.ts`
- Create: `packages/design-tokens/tests/baseline.json` (스크립트가 생성)
- Create: `packages/design-tokens/tests/tokens.test.ts`
- Delete: `packages/design-tokens/style-dictionary.config.js`, `tokens/core.json`, `tokens/light.json`, `tokens/dark.json`

**Interfaces:**
- Produces: `parseCssVars(css, opts?)`, `resolveVar(vars, name)`, `normalize(value)` — Task 2의 빌드 결과 검증이 이걸 그대로 쓴다.
- Produces: `tests/baseline.json` — `{ "--토큰명": "최종계산값" }` 형태의 46개 맵.

---

- [ ] **Step 1: 옛 파일을 지운다**

```bash
cd packages/design-tokens
git rm style-dictionary.config.js tokens/core.json tokens/light.json tokens/dark.json
```

- [ ] **Step 2: `package.json`을 재작성한다**

```json
{
  "name": "@repo/design-tokens",
  "version": "0.0.1",
  "private": true,
  "description": "page0127 디자인 토큰 — Figma Variables 와 왕복하는 단일 출처",
  "type": "module",
  "exports": {
    "./tokens.css": "./dist/tokens.css"
  },
  "scripts": {
    "build": "node build.mjs",
    "baseline": "node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/extract-baseline.ts",
    "test": "vitest run",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist",
    "rebuild": "npm run clean && npm run build"
  },
  "files": ["dist", "tokens"],
  "devDependencies": {
    "style-dictionary": "^5.0.0",
    "typescript": "^5",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 3: `.gitignore`를 고친다**

파일 전체를 이 한 줄로 바꾼다 (옛 `src` 출력 경로 → 새 `dist`):

```
dist
```

- [ ] **Step 4: `tsconfig.json`을 만든다**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["tests/**/*.ts", "scripts/**/*.ts"]
}
```

- [ ] **Step 5: CSS 파서를 만든다**

`packages/design-tokens/tests/css-vars.ts`:

```ts
/**
 * CSS 텍스트에서 커스텀 프로퍼티(--name: value)를 뽑아낸다.
 *
 * blockSelector 를 주면 그 선택자 블록 안만 훑는다.
 * globals.css 는 @theme inline 블록에도 --color-* 변수가 잔뜩 있어서,
 * :root 만 잘라내야 우리가 원하는 46개가 정확히 잡힌다.
 */
export function parseCssVars(
  css: string,
  opts: { blockSelector?: string } = {},
): Record<string, string> {
  let scope = css;

  if (opts.blockSelector) {
    // 블록 안에 중첩 중괄호가 없다는 전제 (globals.css 의 :root 가 그렇다)
    const blockRe = new RegExp(`${opts.blockSelector}\\s*\\{([\\s\\S]*?)\\n\\}`);
    const found = css.match(blockRe);
    if (!found) throw new Error(`블록을 찾지 못했다: ${opts.blockSelector}`);
    scope = found[1];
  }

  const vars: Record<string, string> = {};
  const varRe = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = varRe.exec(scope)) !== null) {
    vars[`--${m[1]}`] = m[2].trim();
  }
  return vars;
}

/**
 * var(--x) 참조를 끝까지 따라가 최종 값을 구한다.
 * --border: var(--line) → --line: #dfe3e8 → "#dfe3e8"
 */
export function resolveVar(
  vars: Record<string, string>,
  name: string,
  seen: Set<string> = new Set(),
): string {
  if (seen.has(name)) throw new Error(`순환 참조: ${name}`);
  seen.add(name);

  const raw = vars[name];
  if (raw === undefined) throw new Error(`정의되지 않은 변수: ${name}`);

  const ref = raw.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*\)$/);
  return ref ? resolveVar(vars, ref[1], seen) : raw;
}

/** #FFFFFF 와 #ffffff 가 다르게 잡히지 않도록 표기를 통일한다. */
export function normalize(value: string): string {
  return value.trim().toLowerCase();
}
```

- [ ] **Step 6: 기준선 추출 스크립트를 만든다**

`packages/design-tokens/scripts/extract-baseline.ts`:

```ts
import { readFileSync, writeFileSync } from 'node:fs';

import { normalize, parseCssVars, resolveVar } from '../tests/css-vars.ts';

// 이사 전 globals.css 의 :root 46개를 "최종 계산값"으로 펼쳐 스냅샷을 만든다.
// 이 파일은 한 번만 돌린다. 결과(tests/baseline.json)를 커밋해 두고,
// 이후로는 생성물이 이 스냅샷과 같은지만 비교한다.
const globalsCss = readFileSync(
  new URL('../../../apps/page0127/app/globals.css', import.meta.url),
  'utf8',
);

const vars = parseCssVars(globalsCss, { blockSelector: ':root' });

const baseline: Record<string, string> = {};
for (const name of Object.keys(vars)) {
  baseline[name] = normalize(resolveVar(vars, name));
}

writeFileSync(
  new URL('../tests/baseline.json', import.meta.url),
  `${JSON.stringify(baseline, null, 2)}\n`,
);

console.log(`기준선 ${Object.keys(baseline).length}개를 tests/baseline.json 에 기록했다.`);
```

- [ ] **Step 7: 의존성을 설치하고 기준선을 뽑는다**

```bash
npm install
npm run baseline --workspace @repo/design-tokens
```

Expected: `기준선 46개를 tests/baseline.json 에 기록했다.`

**46이 아니면 멈추고 원인을 찾는다.** `:root` 블록 파싱이 어긋났다는 뜻이다.

- [ ] **Step 8: 뽑힌 기준선을 눈으로 확인한다**

```bash
node -e "const b=require('./packages/design-tokens/tests/baseline.json'); console.log(b['--primary'], b['--border'], b['--secondary'], b['--muted'])"
```

Expected: `#1e69cb #dfe3e8 #f1f3f5 #f1f3f5`

`--border`가 `var(--line)`이 아니라 `#dfe3e8`로 풀려 있어야 한다 — 참조 해석이 동작한다는 증거다.

- [ ] **Step 9: 회귀 테스트를 작성한다**

`packages/design-tokens/tests/tokens.test.ts`:

```ts
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
```

- [ ] **Step 10: 테스트가 실패하는 것을 확인한다**

```bash
npm run test --workspace @repo/design-tokens
```

Expected: FAIL — `ENOENT: no such file or directory ... dist/tokens.css`

아직 토큰을 만들지 않았으니 당연히 실패한다. **이 실패를 확인하는 것이 이 단계의 목적이다.** 테스트가 실제로 무언가를 검사하고 있다는 증거다.

- [ ] **Step 11: 커밋**

```bash
git add packages/design-tokens
git commit -m "test(design-tokens): 이사 전 기준선 스냅샷과 대조 테스트

globals.css :root 46개를 최종 계산값으로 펼쳐 baseline.json 에 고정했다.
dist/tokens.css 가 아직 없어 테스트는 실패 상태다."
```

---

## Task 2: 토큰 JSON과 빌드 — 테스트를 통과시킨다

**Files:**
- Create: `packages/design-tokens/tokens/primitives.json`
- Create: `packages/design-tokens/tokens/semantic.json`
- Create: `packages/design-tokens/build.mjs`

**Interfaces:**
- Consumes: Task 1의 `tests/tokens.test.ts`, `tests/baseline.json`
- Produces: `dist/tokens.css` — `:root`에 primitive 20개 + semantic 46개. semantic은 `var(--원색)` 참조 형태로 출력된다.

---

- [ ] **Step 1: primitive 팔레트를 만든다**

`packages/design-tokens/tokens/primitives.json`:

```json
{
  "blue": {
    "50":  { "$value": "#e3eefc", "$type": "color" },
    "300": { "$value": "#74b0ff", "$type": "color" },
    "400": { "$value": "#438ef2", "$type": "color" },
    "500": { "$value": "#2d78db", "$type": "color" },
    "600": { "$value": "#1e69cb", "$type": "color" },
    "700": { "$value": "#0455bf", "$type": "color" }
  },
  "navy": {
    "300": { "$value": "#97a4c0", "$type": "color" },
    "500": { "$value": "#66779a", "$type": "color" },
    "700": { "$value": "#3b4e70", "$type": "color" },
    "900": { "$value": "#14294e", "$type": "color" }
  },
  "gray": {
    "0":   { "$value": "#ffffff", "$type": "color" },
    "50":  { "$value": "#f6f7f8", "$type": "color" },
    "200": { "$value": "#eceff2", "$type": "color" },
    "300": { "$value": "#dfe3e8", "$type": "color" }
  },
  "orange": { "600": { "$value": "#d9480f", "$type": "color" } },
  "red":    { "600": { "$value": "#c0392b", "$type": "color" } },
  "amber":  { "500": { "$value": "#d9a520", "$type": "color" } },
  "slate":  { "500": { "$value": "#5b6b8c", "$type": "color" } },
  "teal":   { "500": { "$value": "#14b8a6", "$type": "color" } },
  "violet": { "500": { "$value": "#7a5cf0", "$type": "color" } },

  "space": {
    "1":  { "$value": "4px",  "$type": "dimension" },
    "2":  { "$value": "8px",  "$type": "dimension" },
    "3":  { "$value": "12px", "$type": "dimension" },
    "4":  { "$value": "16px", "$type": "dimension" },
    "6":  { "$value": "24px", "$type": "dimension" },
    "8":  { "$value": "32px", "$type": "dimension" },
    "12": { "$value": "48px", "$type": "dimension" },
    "16": { "$value": "64px", "$type": "dimension" }
  },
  "corner": {
    "sm": { "$value": "4px",  "$type": "dimension" },
    "md": { "$value": "6px",  "$type": "dimension" },
    "lg": { "$value": "8px",  "$type": "dimension" },
    "xl": { "$value": "12px", "$type": "dimension" }
  }
}
```

> `space`·`corner`의 번호는 Tailwind 기본 스케일과 일부러 맞췄다(`space/4` = `p-4` = 16px). Figma에서 간격을 고를 때 코드의 클래스가 바로 떠오르게 하려는 것이다.
> `corner`라는 이름을 쓴 이유는 semantic의 `--radius`와 충돌을 피하기 위해서다. Style Dictionary에서는 같은 키가 토큰이면서 그룹일 수 없다.

- [ ] **Step 2: semantic 토큰 46개를 만든다**

`packages/design-tokens/tokens/semantic.json`:

```json
{
  "text": {
    "strong": { "$value": "{navy.900}", "$type": "color" },
    "body":   { "$value": "{navy.700}", "$type": "color" },
    "subtle": { "$value": "{navy.500}", "$type": "color" },
    "faint":  { "$value": "{navy.300}", "$type": "color" }
  },

  "chart": {
    "1": { "$value": "{blue.600}",   "$type": "color" },
    "2": { "$value": "{orange.600}", "$type": "color" },
    "3": { "$value": "{blue.300}",   "$type": "color" },
    "4": { "$value": "{amber.500}",  "$type": "color" },
    "5": { "$value": "{slate.500}",  "$type": "color" },
    "6": { "$value": "{teal.500}",   "$type": "color" },
    "7": { "$value": "{violet.500}", "$type": "color" }
  },

  "background": { "$value": "{gray.0}",  "$type": "color" },
  "card":       { "$value": "{gray.0}",  "$type": "color" },
  "popover":    { "$value": "{gray.0}",  "$type": "color" },
  "sunken":     { "$value": "{gray.50}", "$type": "color" },
  "secondary":  { "$value": "{gray.50}", "$type": "color" },
  "muted":      { "$value": "{gray.50}", "$type": "color" },

  "foreground":           { "$value": "{text.strong}", "$type": "color" },
  "card-foreground":      { "$value": "{text.strong}", "$type": "color" },
  "popover-foreground":   { "$value": "{text.strong}", "$type": "color" },
  "secondary-foreground": { "$value": "{text.strong}", "$type": "color" },
  "muted-foreground":     { "$value": "{text.subtle}", "$type": "color" },

  "line":      { "$value": "{gray.300}", "$type": "color" },
  "line-soft": { "$value": "{gray.200}", "$type": "color" },
  "border":    { "$value": "{line}",     "$type": "color" },
  "input":     { "$value": "{line}",     "$type": "color" },

  "primary":            { "$value": "{blue.600}",   "$type": "color" },
  "primary-foreground": { "$value": "{gray.0}",     "$type": "color" },
  "accent":             { "$value": "{blue.50}",    "$type": "color" },
  "accent-foreground":  { "$value": "{blue.700}",   "$type": "color" },
  "ring":               { "$value": "{blue.600}",   "$type": "color" },
  "rank-up":            { "$value": "{orange.600}", "$type": "color" },
  "destructive":        { "$value": "{red.600}",    "$type": "color" },

  "sidebar":                    { "$value": "{gray.0}",     "$type": "color" },
  "sidebar-foreground":         { "$value": "{text.strong}","$type": "color" },
  "sidebar-primary":            { "$value": "{blue.600}",   "$type": "color" },
  "sidebar-primary-foreground": { "$value": "{gray.0}",     "$type": "color" },
  "sidebar-accent":             { "$value": "{blue.50}",    "$type": "color" },
  "sidebar-accent-foreground":  { "$value": "{blue.700}",   "$type": "color" },
  "sidebar-border":             { "$value": "{line}",       "$type": "color" },
  "sidebar-ring":               { "$value": "{blue.600}",   "$type": "color" },

  "radius": { "$value": "0.5rem", "$type": "dimension" },
  "font": {
    "h1": {
      "desktop": { "$value": "28px", "$type": "dimension" },
      "mobile":  { "$value": "24px", "$type": "dimension" }
    },
    "h2": {
      "desktop": { "$value": "20px", "$type": "dimension" },
      "mobile":  { "$value": "18px", "$type": "dimension" }
    }
  }
}
```

> `card`와 `card-foreground`가 중첩 그룹이 아니라 평탄한 이름인 이유: `card`가 토큰이면서 동시에 그룹일 수 없기 때문이다. CSS 변수 이름을 정확히 계승하는 것이 Figma 그룹 모양보다 우선한다.

- [ ] **Step 3: 빌드 설정을 만든다**

`packages/design-tokens/build.mjs`:

```js
import StyleDictionary from 'style-dictionary';

/**
 * Figma 전용 토큰 — CSS 로는 내보내지 않는다.
 * 코드에서 간격·모서리는 Tailwind 기본 스케일을 쓰므로 CSS 변수가 필요 없다.
 * 이 값들은 Figma 에서 디자인할 때 임의값이 나오지 않게 막는 용도로만 존재한다.
 */
const FIGMA_ONLY = ['space', 'corner'];

const sd = new StyleDictionary({
  source: ['tokens/*.json'],
  platforms: {
    css: {
      // transformGroup 'css' 를 쓰지 않는 이유:
      // 거기 포함된 size/rem 이 "28px" 를 "1.75rem" 으로 바꿔버려
      // --font-h1-desktop 의 값이 원본과 달라진다. 필요한 것만 골라 쓴다.
      transforms: ['attribute/cti', 'name/kebab', 'color/css'],
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          filter: (token) => !FIGMA_ONLY.includes(token.path[0]),
          // semantic 이 원색을 var(--blue-600) 로 참조하게 만든다.
          // 이게 꺼지면 값이 통째로 복사돼 2층 구조가 무의미해진다.
          options: { outputReferences: true },
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
```

- [ ] **Step 4: 빌드한다**

```bash
npm run build --workspace @repo/design-tokens
```

Expected: `dist/tokens.css` 생성.

빌드가 transform 이름 오류로 실패하면(`Unknown transform`), 설치된 버전의 이름을 확인한다:

```bash
node -e "import('style-dictionary').then(m=>console.log(Object.keys(m.default.hooks.transforms).join('\n')))"
```

- [ ] **Step 5: 생성물을 눈으로 검사한다**

```bash
grep -E "^\s*--(blue-600|primary|border|font-h1-desktop|radius|space-4|corner-sm)" packages/design-tokens/dist/tokens.css
```

Expected:
```
  --blue-600: #1e69cb;
  --primary: var(--blue-600);
  --border: var(--line);
  --font-h1-desktop: 28px;
  --radius: 0.5rem;
```

**세 가지를 반드시 확인한다:**
1. `--primary`가 `var(--blue-600)`이다 → `outputReferences`가 동작한다
2. `--font-h1-desktop`이 `1.75rem`이 아니라 `28px`이다 → `size/rem`이 섞이지 않았다
3. `--space-4`·`--corner-sm`이 **출력되지 않았다** → 필터가 동작한다

- [ ] **Step 6: 테스트를 통과시킨다**

```bash
npm run test --workspace @repo/design-tokens
```

Expected: 3 passed

실패하면 출력에 `--토큰명: 이전값 → 이후값` 형태로 어긋난 토큰이 전부 나열된다. 그 토큰의 `semantic.json` 참조를 고친다.

- [ ] **Step 7: 커밋**

```bash
git add packages/design-tokens
git commit -m "feat(design-tokens): primitive/semantic 2층 토큰과 빌드 파이프라인

Style Dictionary v5 로 tokens.css 를 생성한다.
- primitive 32개(색 20 + space 8 + corner 4), semantic 46개
- space/corner 는 Figma 전용이라 CSS 출력에서 제외
- 기준선 대조 테스트 통과"
```

---

## Task 3: 앱에 배선한다

**Files:**
- Modify: `apps/page0127/package.json`
- Modify: `apps/page0127/next.config.ts:39`
- Modify: `turbo.json:7`
- Modify: `apps/page0127/app/globals.css:1-91`
- Create: `packages/design-tokens/README.md`

**Interfaces:**
- Consumes: Task 2의 `dist/tokens.css` (`@repo/design-tokens/tokens.css`로 노출)

---

- [ ] **Step 1: 앱 의존성을 추가한다**

`apps/page0127/package.json`의 `dependencies`에 (알파벳 순서상 `@repo/icons` 앞):

```json
    "@repo/design-tokens": "*",
```

- [ ] **Step 2: `transpilePackages`에 추가한다**

`apps/page0127/next.config.ts`에서 기존 주석 2줄을 지우고 배열을 고친다.

변경 전:
```ts
  // 모노레포 패키지의 CSS/JS 파일을 트랜스파일하도록 설정
  // @repo/design-tokens 는 어디서도 import 되지 않아 제거했다.
  // 디자인 토큰의 단일 출처는 app/globals.css 다.
  transpilePackages: ['@repo/icons'],
```

변경 후:
```ts
  // 모노레포 패키지의 CSS/JS 파일을 트랜스파일하도록 설정
  // 디자인 토큰의 단일 출처는 @repo/design-tokens 다 (globals.css 가 import 한다).
  transpilePackages: ['@repo/icons', '@repo/design-tokens'],
```

- [ ] **Step 3: turbo 빌드 출력에 `dist`를 추가한다**

`turbo.json`의 `tasks.build.outputs`:

변경 전:
```json
      "outputs": [".next/**", "!.next/cache/**", "src/**"],
```

변경 후:
```json
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
```

> `src/**`는 옛 design-tokens가 `src/`로 출력하던 시절의 잔재다. 새 패키지는 `dist/`로 낸다.
> 빌드 순서는 이미 `dependsOn: ["^build"]`가 보장한다 — 앱이 토큰 패키지에 의존하므로 토큰이 먼저 빌드된다.

- [ ] **Step 4: `globals.css`의 `:root` 블록을 import로 교체한다**

`apps/page0127/app/globals.css`의 1~91행(주석 블록 + `:root { … }` 전체)을 아래로 교체한다. `@theme inline` 이하는 건드리지 않는다.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@repo/design-tokens/tokens.css";

/* ============================================
   page0127 디자인 시스템

   토큰의 단일 출처는 @repo/design-tokens 다.
   색·간격·모서리 값을 바꾸려면 이 파일이 아니라
   packages/design-tokens/tokens/*.json 을 고친다.
   (그쪽이 Figma Variables 와 왕복하는 원본이다)

   이 파일은 "그 값을 Tailwind 에 어떻게 노출할지"만 담당한다.

   원칙 (교보문고·밀리의서재 실측에서 도출 — 00_docs/07 참조)
   1. 무채(네이비 잉크)가 지배한다. 유채색은 장식이 아니라 "직무"다.
      - primary(진한 블루) = 브랜드·주 CTA·링크·완독에만
      - rank-up(코랄 오렌지) = 순위 상승·포인트 강조에만
      - destructive = 삭제·탈퇴에만
   2. 입체는 그림자가 아니라 1px 선으로 만든다.
      (교보 홈: 그림자 2개 / 1px 보더 139회. 밀리: 그림자 4개)
   3. 본문을 흐리게 칠하지 않는다. 읽으라고 쓴 글은 --text-strong/--text-body.
      채도 높은 블루(#438EF2 등)는 본문 텍스트에 쓰지 않는다 — 가독성이 죽는다.
   4. letter-spacing 은 건드리지 않는다.
      Pretendard 는 자간이 이미 최적화돼 있다. (밀리도 전 요소 normal)
   ============================================ */
```

- [ ] **Step 5: 타입 체크와 빌드를 돌린다**

```bash
npm run type-check
npm run build
```

Expected: 둘 다 통과. 빌드 로그에 `@repo/design-tokens:build`가 `page0127:build`보다 먼저 나와야 한다.

- [ ] **Step 6: 개발 서버에서 육안으로 확인한다**

```bash
npm run dev --workspace page0127
```

`http://localhost:3000`에서 **홈 · 내 서재 · 책 상세 · 대시보드** 4화면을 연다.

확인 항목:
- 주 CTA 버튼이 진한 블루(`#1e69cb`)로 나온다
- 카드 테두리 선이 보인다 (`--border`가 살아 있다)
- 차트 색이 7종 그대로다
- 텍스트 위계 4단계가 유지된다

**색이 통째로 빠져 검게/희게 나오면** `@import`가 패키지를 찾지 못한 것이다. 순서대로 확인한다:

1. `packages/design-tokens/dist/tokens.css`가 실제로 존재하는가 (`npm run build --workspace @repo/design-tokens`)
2. `node_modules/@repo/design-tokens`가 심볼릭 링크로 걸려 있는가 (`ls -l node_modules/@repo/`) — 없으면 루트에서 `npm install`
3. 그래도 안 되면 **`exports` 필드를 CSS 툴체인이 해석하지 못하는 경우**다. `packages/design-tokens/package.json`에 관례적 진입점을 하나 더 추가한다:

```json
  "style": "./dist/tokens.css",
```

4. 그래도 안 되면 최후 수단으로 `globals.css`의 import를 상대 경로로 바꾼다:

```css
@import "../../../packages/design-tokens/dist/tokens.css";
```

이 경우 `transpilePackages` 항목은 불필요해지므로 되돌리고, 왜 상대 경로를 쓰는지 주석으로 남긴다.

- [ ] **Step 7: README를 새로 쓴다**

`packages/design-tokens/README.md` — 기존 내용은 전부 옛 구조 기준이라 통째로 교체한다:

````markdown
# @repo/design-tokens

page0127 디자인 토큰. **Figma Variables 와 왕복하는 단일 출처.**

## 구조

```
tokens/primitives.json   원색 팔레트 (blue/navy/gray/…, space, corner)
tokens/semantic.json     직무 토큰 (text/strong, primary, line, …)
        ↓ npm run build
dist/tokens.css          globals.css 가 import 하는 생성물
```

- **primitive**는 화면에 직접 쓰지 않는다. semantic 이 참조할 원색일 뿐이다.
- **semantic**만 컴포넌트에서 쓴다. 이름이 곧 용도다.
- `space`·`corner`는 **Figma 전용**이라 CSS 로 나가지 않는다. 코드에서 간격·모서리는 Tailwind 기본 스케일을 쓴다.

## 값을 바꾸려면

1. Figma 에서 Variables 수정
2. Tokens Studio 플러그인에서 JSON export → `tokens/` 에 덮어쓰기
3. `npm run build`
4. `npm run test` 로 회귀 확인

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run build` | `dist/tokens.css` 생성 |
| `npm run test` | 이사 전 기준선과 대조 (회귀 방지) |
| `npm run baseline` | 기준선 재생성 — **평소에 쓰지 않는다** (아래) |

> ⚠️ `npm run baseline` 은 `tests/baseline.json` 을 현재 `globals.css` 기준으로 덮어쓴다.
> 이 스냅샷은 "토큰 이사 이전 상태"를 붙잡아 둔 것이라, 다시 돌리면 회귀 감지 능력이 사라진다.
> 의도적으로 기준을 갱신할 때만 쓴다.
````

- [ ] **Step 8: 커밋**

```bash
git add apps/page0127/package.json apps/page0127/next.config.ts apps/page0127/app/globals.css turbo.json packages/design-tokens/README.md package-lock.json
git commit -m "feat(design-tokens): globals.css 를 생성 토큰으로 전환

:root 블록 46개를 @repo/design-tokens/tokens.css 로 대체했다.
@theme inline 은 앱에 남긴다 — Tailwind 노출 방식은 앱의 관심사다.
컴포넌트 코드는 수정하지 않았다."
```

---

## Task 4: 타이포 줄간격을 07 스펙에 맞춘다

345곳(`text-sm` 236 + `text-xs` 84 + `heading-1` 17 + `heading-2` 8)에 영향을 준다. 클래스 이름은 그대로라 **컴포넌트 수정은 없다.**

**Files:**
- Modify: `apps/page0127/app/globals.css` (`@theme inline` 블록 + `.heading-*` 유틸리티)

---

- [ ] **Step 1: `@theme inline`에 타이포 스케일을 추가한다**

`globals.css`의 `@theme inline` 블록 안, `--font-mono` 정의 **다음**에 추가한다:

```css
  /* 타이포 스케일 — 07 문서 기준 (00_docs/07 §2.2)
     Tailwind 기본 줄간격(14/20, 12/16)은 한글 다행 텍스트에 좁다.
     크기는 그대로 두고 줄간격만 넓힌다. 클래스 이름이 안 바뀌므로
     text-sm / text-xs 를 쓰는 345곳을 손대지 않아도 된다. */
  --text-sm: 14px;
  --text-sm--line-height: 22px;
  --text-xs: 12px;
  --text-xs--line-height: 18px;
```

- [ ] **Step 2: `.heading-1`·`.heading-2`의 줄간격을 고정 px로 바꾼다**

기존 유틸리티는 비율(`1.35`·`1.4`)을 써서 계산값이 07 스펙과 어긋나 있었다(28×1.35 = 37.8 ≠ 40). 네 곳을 고친다.

변경 전:
```css
.heading-1 {
  font-size: var(--font-h1-mobile);
  font-weight: 700;
  line-height: 1.35;
}

@media (min-width: 768px) {
  .heading-1 {
    font-size: var(--font-h1-desktop);
  }
}

.heading-2 {
  font-size: var(--font-h2-mobile);
  font-weight: 700;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .heading-2 {
    font-size: var(--font-h2-desktop);
  }
}
```

변경 후:
```css
/* 줄간격을 비율이 아니라 px 로 못 박는다.
   비율(1.35)로 두면 28px 에서 37.8px 이 나와 07 스펙(40)과 어긋나고,
   Figma Text Style 과도 값이 맞지 않는다.
   모바일 값은 07 의 데스크톱 비율을 그대로 내려 구했다 (24×1.43≈34, 18×1.5=27). */
.heading-1 {
  font-size: var(--font-h1-mobile);
  font-weight: 700;
  line-height: 34px;
}

@media (min-width: 768px) {
  .heading-1 {
    font-size: var(--font-h1-desktop);
    line-height: 40px;
  }
}

.heading-2 {
  font-size: var(--font-h2-mobile);
  font-weight: 700;
  line-height: 27px;
}

@media (min-width: 768px) {
  .heading-2 {
    font-size: var(--font-h2-desktop);
    line-height: 30px;
  }
}
```

- [ ] **Step 3: 빌드가 깨지지 않는지 본다**

```bash
npm run build
npm run test
```

Expected: 통과. (토큰 값은 안 건드렸으므로 Task 2의 테스트도 그대로 통과해야 한다.)

- [ ] **Step 4: 육안으로 확인한다 — 이 태스크의 핵심**

```bash
npm run dev --workspace page0127
```

**중점 확인 대상은 "제목이 두 줄로 넘어가는 카드"다.** 줄간격이 늘어난 만큼 카드 높이가 커져 그리드가 밀릴 수 있다.

| 화면 | 볼 것 |
| --- | --- |
| 홈 | 섹션 제목(`heading-2`) 아래 여백, 책 카드 정렬 |
| 내 서재 | 그리드에서 **긴 책 제목**이 2줄 되는 카드의 높이 |
| 책 상세 | 본문 설명 문단의 줄간격 |
| 대시보드 | 통계 카드 안 숫자와 라벨이 겹치지 않는지 |

모바일 폭(375px)도 함께 본다 — `heading-mobile` 값이 처음 적용되는 곳이다.

레이아웃이 깨지는 곳이 있으면 **줄간격을 되돌리지 말고** 그 컴포넌트의 여백을 조정하는 방향으로 기록만 남긴다. 컴포넌트 수정은 라운드 2 몫이다.

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/app/globals.css
git commit -m "style(tokens): 타이포 줄간격을 07 스펙에 맞춘다

sub 14/20→14/22, micro 12/16→12/18.
heading-1/2 는 비율(1.35·1.4)이라 계산값이 스펙과 어긋나 있어
px 로 고정했다 (40/34, 30/27).
클래스 이름은 그대로라 컴포넌트 345곳은 수정하지 않았다."
```

---

## Task 5: Figma 스파이크 — Tokens Studio 기능 범위 확인

> ## ⏭️ 이 태스크는 수행하지 않았다 (2026-07-27)
>
> **불필요해졌기 때문이다.** MCP `use_figma` 가 Figma Plugin API 에 JavaScript 를 직접 실행하므로, Tokens Studio 가 제공하려던 우회로를 이미 갖고 있었다. 플러그인을 설치하지 않고 Task 6·7 을 스크립트로 수행했다.
>
> 설계 문서 §2.1 의 정정과 §9 를 참고할 것. 아래 Step 들은 **실행되지 않았으며**, 기록으로만 남긴다.

**여기서부터는 Figma UI에서 하는 수동 작업이다.** 설계 문서 §9의 불확실성을 이 태스크에서 해소한다.

**Files:** 없음 (확인 결과만 기록)

---

- [ ] **Step 1: Tokens Studio 플러그인을 설치한다**

Figma 파일 `page0127`(`https://www.figma.com/design/5ErSDsG1MNfvexSDZ2PfLS/page0127.`)을 연다.

우측 상단 메뉴 → Plugins → **Tokens Studio for Figma** 검색 → 실행.

- [ ] **Step 2: 토큰 JSON을 임포트한다**

플러그인 창에서 Settings(톱니) → **Import** → `Import from file` 로 두 파일을 올린다:

- `packages/design-tokens/tokens/primitives.json`
- `packages/design-tokens/tokens/semantic.json`

임포트 후 좌측 목록에 `blue`, `navy`, `gray`, `text`, `chart` 등 그룹이 보이면 성공이다.

- [ ] **Step 3: Figma Variables 생성이 가능한지 확인한다 — 스파이크의 목적**

플러그인 하단 또는 Settings에서 다음 중 하나를 찾는다:
- `Export to Figma` → `Variables`
- `Styles & Variables` → `Create Variables`

- [ ] **Step 4: 결과에 따라 분기한다**

| 확인 결과 | 다음 행동 |
| --- | --- |
| **Variables 생성 가능** | Task 6을 플러그인으로 진행 |
| **유료 기능으로 막힘** | Task 6을 **Figma MCP 또는 수동**으로 진행. 플러그인은 JSON 보관용으로만 씀 |

어느 쪽이든 Task 1~4의 코드 결과물은 영향받지 않는다.

- [ ] **Step 5: 확인 결과를 설계 문서에 기록한다**

`docs/superpowers/specs/2026-07-26-design-system-foundations-design.md` §9의 표 아래에 한 줄 추가한다. 예:

```markdown
> **확인 결과 (2026-XX-XX):** Tokens Studio 무료 플랜에서 Variables 생성 [가능 / 불가].
> Task 6은 [플러그인 / MCP / 수동] 경로로 진행했다.
```

- [ ] **Step 6: 커밋**

```bash
git add docs/superpowers/specs/2026-07-26-design-system-foundations-design.md
git commit -m "docs(spec): Tokens Studio 기능 범위 확인 결과 기록"
```

---

## Task 6: Figma Variables 2개 컬렉션을 만든다

> ## ✅ 완료 (2026-07-27) — 단, 수동이 아니라 스크립트로
>
> 아래 Step 들은 "Figma UI 에서 손으로" 를 전제로 썼으나, 실제로는 **MCP `use_figma` 스크립트 2회**로 생성했다.
>
> - `Primitives` 32개 — 원색 20 은 `scopes = []` 로 색 피커에서 감췄다. `space`·`corner` 는 각각 `["GAP","WIDTH_HEIGHT"]`·`["CORNER_RADIUS"]`
> - `Semantic` 46개 — 색 41개 **전부 alias 참조**, 값 복사 0건. `border → line → gray/300` 같은 2단 체인 포함
> - 계획에 없던 것: 각 변수에 CSS 이름을 **Code Syntax**(`var(--primary)`)로, `$description` 을 **Figma 변수 설명**으로 심었다
> - **검증**: Figma 에서 alias 를 끝까지 따라간 최종값 46개를 `dist/tokens.css` 와 대조 → **불일치 0건**
>
> Step 3(컬렉션 숨김)은 개념이 틀려 다르게 구현했다 — 설계 문서 §4.3 의 정정 참고.

**Files:** 없음 (Figma 파일 작업)

---

- [ ] **Step 1: `Primitives` 컬렉션을 만든다**

Task 5의 결과에 따라 플러그인으로 생성하거나, 수동이면 Figma 우측 패널 → Variables → `+` 로 컬렉션을 만들고 이름을 `Primitives`, 모드 이름을 `Value`로 둔다.

`tokens/primitives.json`의 32개를 그대로 넣는다. 그룹은 슬래시로 만든다 — `blue/600`, `space/4`, `corner/sm`.

- [ ] **Step 2: `Semantic` 컬렉션을 만든다**

컬렉션 이름 `Semantic`, 모드 이름 `Light`.

`tokens/semantic.json`의 46개를 넣되, **값을 직접 입력하지 말고 `Primitives`의 변수를 참조**(alias)로 연결한다. 이게 2층 구조의 핵심이다 — 참조가 아니라 값을 복사하면 나중에 원색을 바꿔도 semantic이 따라오지 않는다.

- [ ] **Step 3: `Primitives` 컬렉션을 숨긴다**

`Primitives` 컬렉션 우클릭 → **Hide from publishing**.

디자이너가 색을 고를 때 원색 램프가 아니라 직무 토큰만 보이게 해서, 규칙 위반을 애초에 어렵게 만드는 장치다.

- [ ] **Step 4: 참조가 제대로 걸렸는지 확인한다**

`Semantic` 컬렉션에서 `primary` 행을 본다. 값 칸에 `#1E69CB`라는 **hex 문자열이 아니라 `blue/600`이라는 변수 칩**이 보여야 한다.

hex로 들어가 있으면 alias가 아니라 값 복사가 된 것이므로 다시 연결한다.

- [ ] **Step 5: MCP로 생성 결과를 검증한다**

Figma에서 아무 프레임에나 사각형 하나를 그리고 `Semantic/primary`를 채우기 색으로 지정한 뒤, 그 노드를 선택하고 아래를 실행한다:

```
mcp__claude_ai_Figma__get_variable_defs 로 fileKey=5ErSDsG1MNfvexSDZ2PfLS, nodeId=<선택한 노드 id>
```

Expected: `primary` 변수가 `#1e69cb`로 해석되어 반환된다. 확인 후 임시 사각형은 지운다.

---

## Task 7: Text Styles와 Foundations 페이지

> ## ✅ 완료 (2026-07-27) — 폰트만 사용자가 교체
>
> - `Page 1` → **`Foundations`** 로 이름 변경, 스타일 가이드 **4프레임** 생성 (`1 · Colors` / `2 · Semantic` / `3 · Spacing & Corner` / `4 · Typography`)
> - **Text Style 7개** 생성 — 크기·줄간격·weight 는 §6.2 확정값 그대로
> - 가이드의 스와치·간격 막대·모서리 상자를 **Variables 에 바인딩**해, 토큰이 바뀌면 가이드도 따라 움직인다
>
> **폰트는 에이전트가 넣지 못했다.** MCP 컨텍스트에 Pretendard 가 없어(로컬에 설치돼 있어도 `listAvailableFontsAsync` 에 안 잡힘) Noto Sans KR 로 만들었고, **사용자가 Figma UI 에서 7개 스타일의 Font 만 Pretendard 로 교체**했다. 교체 후 확인 결과 7개 전부 `Pretendard`(Bold/Medium/Regular)이고 크기·줄간격은 확정값이 유지됐다.
>
> 이 폰트 제약은 이후 **Figma 에 폰트를 업로드**해 해소됐다 — 설계 문서 §9.1 참고.

**Files:** 없음 (Figma 파일 작업)

---

- [ ] **Step 1: 페이지를 만든다**

기존 `Page 1`의 이름을 **`Foundations`**로 바꾼다.

- [ ] **Step 2: Text Style 7개를 만든다**

폰트는 전부 **Pretendard**, 자간은 건드리지 않는다(`normal`). 07 원칙 4번이다.

| 스타일 이름 | size / line-height | weight |
| --- | --- | --- |
| `display` | 28 / 40 | 700 |
| `display-mobile` | 24 / 34 | 700 |
| `heading` | 20 / 30 | 700 |
| `heading-mobile` | 18 / 27 | 700 |
| `body` | 16 / 24 | 500 |
| `sub` | 14 / 22 | 400 |
| `micro` | 12 / 18 | 500 |

> Pretendard가 로컬에 없으면 Figma에서 폰트를 찾지 못한다. `Pretendard Variable`을 설치하거나, Figma 커뮤니티 폰트로 대체한다.

- [ ] **Step 3: 스타일 가이드 프레임을 그린다**

`Foundations` 페이지에 프레임 4개를 만들고 각각 채운다:

1. **Colors** — blue/navy/gray 램프를 스와치로 늘어놓고, 각 칸에 토큰명과 hex를 적는다
2. **Semantic** — `text/*`, `line/*`, `action/*`을 실제 쓰임새(제목·본문·선·버튼)로 보여준다
3. **Typography** — Text Style 7개를 한글 예문으로 나열한다
4. **Spacing & Corner** — `space/*` 8단과 `corner/*` 4단을 사각형으로 시각화한다

이 페이지는 라운드 2에서 컴포넌트를 만들 때 참조 기준이 된다.

- [ ] **Step 4: 결과를 확인한다**

```
mcp__claude_ai_Figma__get_metadata 로 fileKey=5ErSDsG1MNfvexSDZ2PfLS, nodeId=0:1
```

Expected: 빈 캔버스가 아니라 프레임 4개가 자식으로 나온다.

- [ ] **Step 5: 라운드 1 완료를 기록한다**

설계 문서 §3.3 로드맵 표의 라운드 1 상태를 `이 문서` → `완료 (YYYY-MM-DD)`로 고치고 커밋한다.

```bash
git add docs/superpowers/specs/2026-07-26-design-system-foundations-design.md
git commit -m "docs(spec): 라운드 1 Foundations 완료 기록"
```

---

## 완료 기준

라운드 1이 끝났다고 말하려면 아래가 전부 참이어야 한다.

- [x] `npm run test`가 통과한다 (토큰 46개 이름·값 회귀 없음) — 머지된 `main`에서 재확인, 4/4 태스크
- [x] `npm run build`가 통과하고, 토큰 패키지가 앱보다 먼저 빌드된다 — 컴파일 41초
- [x] 컴포넌트 파일의 diff가 **0줄**이다
- [x] Figma `Semantic` 컬렉션 46개가 전부 `Primitives`를 **참조**로 가리킨다 — alias 41/41, 값 복사 0
- [x] Figma `Foundations` 페이지에 스타일 가이드 4프레임이 있다
- [~] 주요 4화면이 이사 전과 같아 보인다 (`--secondary`·`--muted` 제외) — **부분 완료**

> **미완 항목 하나**: 육안 검증은 **비로그인으로 접근 가능한 화면만** 했다. Playwright 로 토큰 10개·줄간격 6개를 computed style 로 실측하고 가로 오버플로가 없음을 확인했지만, **내 서재 · 책 상세 · 대시보드**는 로그인이 필요해 확인하지 못했다.
>
> 코드 리스크는 낮다(값이 전부 실측으로 일치). 다만 §6.2 의 줄간격 변경이 345곳에 걸리고 그 세 화면이 가장 조밀한 레이아웃이므로, **사용자가 로그인 상태에서 한 번은 봐야 한다.** 특히 긴 책 제목이 두 줄로 넘어가는 카드 그리드와 대시보드 통계 카드.

---

## 라운드 1 이후

라운드 2 착수 전 정리해야 했던 두 가지는 **모두 해결됐다** (2026-07-27).

**① `baseline.json` 의 역할** → 스냅샷 방식을 폐기하고 **소비처 대조**로 교체했다(설계 문서 §8.2, §11).
`apps/page0127/app/token-usage.test.ts` 가 소스의 `var(--…)` 를 전부 모아 정의 존재를 확인한다. 값 변경 감시는 커밋된 `dist/tokens.css` 의 git diff 가 맡는다. `baseline.json`·`update-baseline` 삭제.

**② 폰트 제약** → **Figma 에 Pretendard 를 업로드**해 해소됐다(설계 문서 §9.1).
MCP 컨텍스트에서 Pretendard 로드가 되므로, 라운드 2 에서 텍스트를 자유롭게 만들고 수정할 수 있다. 다만 **새 폰트를 도입할 때는 로컬 설치가 아니라 Figma 업로드 여부를 먼저 확인**해야 한다.

**라운드 2 범위 결정**: 컴포넌트 27개를 **개수로 쪼갠다**(깊이가 아니라). 핵심 소수를 먼저 완성하고 나머지로 넓히는 순서이며, 구체적인 묶음은 라운드 2 브레인스토밍에서 컴포넌트 간 의존(예: Dialog 가 Button 을 품는다)을 확인한 뒤 정한다.
