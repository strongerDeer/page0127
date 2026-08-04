import { parseCssVars } from '@repo/design-tokens/css-vars';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: 디자인 시스템이 쓰는 CSS 변수가 전부 정의되어 있는지 검사한다.
 *
 * 잡는 것은 "이름이 사라지는" 회귀다. 값이 바뀌는 것은 잡지 않는다 —
 * 그건 dist/tokens.css 가 커밋되어 있어 git diff 가 더 잘 보여준다.
 * 반대로 `--text-faint` 처럼 토큰을 지웠는데 쓰는 쪽이 남아 있으면,
 * 화면은 에러 없이 색만 빠진 채 렌더되므로 사람이 알아채기 어렵다.
 *
 * 정의처는 두 곳이다:
 * - packages/design-tokens/dist/tokens.css — primitive/semantic 토큰
 * - packages/ui/src/styles/index.css — @theme inline 의 Tailwind 노출 변수
 */

const PKG_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['src'];
const SCAN_EXTS = ['.tsx', '.ts', '.css'];

/** 외부 라이브러리가 런타임에 주입하는 변수 — 우리 토큰이 아니므로 정의를 요구하지 않는다. */
const EXTERNAL_PREFIXES = ['--radix-', '--tw-'];

type Usage = { name: string; file: string };

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    // 테스트·스토리는 런타임이 아니다. 예시로 적은 var(--…) 가 사용처로 잡히면
    // 실패 메시지만 지저분해진다.
    if (/\.(test|stories)\.tsx?$/.test(entry.name)) continue;
    if (SCAN_EXTS.includes(extname(entry.name))) out.push(full);
  }
  return out;
}

/**
 * 파일에서 쓰이지만 그 파일 안에 정의가 없는 변수만 골라낸다.
 * 자기 안에서 선언해 쓰는 지역 변수를 제외 목록에 하드코딩하지 않고
 * 자동으로 걸러내기 위한 것이다.
 */
function externalUsagesIn(source: string, file: string): Usage[] {
  const declared = new Set<string>();
  for (const m of source.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) declared.add(m[1]);

  const used: Usage[] = [];
  for (const m of source.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
    const name = m[1];
    if (declared.has(name)) continue;
    if (EXTERNAL_PREFIXES.some((p) => name.startsWith(p))) continue;
    used.push({ name, file });
  }
  return used;
}

const usages: Usage[] = [];
for (const dir of SCAN_DIRS) {
  for (const file of collectFiles(join(PKG_ROOT, dir))) {
    usages.push(...externalUsagesIn(readFileSync(file, 'utf8'), file.slice(PKG_ROOT.length)));
  }
}

const defined = {
  ...parseCssVars(
    readFileSync(new URL('../../design-tokens/dist/tokens.css', import.meta.url), 'utf8'),
  ),
  ...parseCssVars(readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8')),
};

describe('디자인 시스템 토큰 소비처 대조', () => {
  it('시스템이 쓰는 CSS 변수가 전부 정의되어 있다', () => {
    const undefinedVars = [
      ...new Set(
        usages.filter((u) => !(u.name in defined)).map((u) => `${u.name}  (${u.file})`),
      ),
    ].sort();

    expect(undefinedVars).toEqual([]);
  });

  it('스캔이 실제로 동작한다 — 토큰 사용처를 찾지 못하면 이 테스트는 무의미하다', () => {
    // 스캔 경로나 정규식이 잘못되면 usages 가 비어 위 테스트가 공짜로 통과한다.
    // 실측 46종을 기준으로 하한을 못 박아 그 상황을 잡는다.
    const distinct = new Set(usages.map((u) => u.name));
    expect(distinct.size).toBeGreaterThanOrEqual(40);
    expect(distinct.has('--primary')).toBe(true);
  });
});
