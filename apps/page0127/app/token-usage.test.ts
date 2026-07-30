import { parseCssVars } from '@repo/design-tokens/css-vars';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: 소스가 실제로 쓰는 CSS 변수가 전부 정의되어 있는지 검사한다.
 *
 * 왜 이 방식인가:
 * 이사 직후에는 "이사 전 값 스냅샷(baseline.json)과 같은가"로 회귀를 막았다.
 * 그 방식은 이사를 검증하는 데는 맞았지만, 값이 **정당하게** 바뀌는 순간부터는
 * 방해가 된다 — 다크모드나 브랜드 색 조정이 오면 테스트가 실패하는데 그것이
 * 버그인지 의도인지 구분할 방법이 없다.
 *
 * 반면 이 테스트는 "쓰는데 정의가 없는 변수"만 잡는다. 값이 바뀌어도 깨지지 않고,
 * 이름이 사라지면 반드시 깨진다 — 설계 문서 §4.2 가 지키려던 것이 정확히 이것이다.
 * (값이 실수로 바뀌는 것은 dist/tokens.css 가 커밋되므로 git diff 가 잡는다)
 *
 * 여기가 지키는 것은 **앱 쪽 절반**이다. 디자인 시스템 자신이 쓰는 변수는
 * packages/ui/tests/token-usage.test.ts 가 따로 본다. 둘을 나눈 이유는 방향
 * 때문이다 — 시스템은 자기를 누가 쓰는지 몰라야 하고, 앱은 시스템이 준 것만
 * 써야 한다. 한쪽에 몰아두면 그 경계가 테스트에서부터 흐려진다.
 *
 * 정의처는 두 곳이다:
 * - packages/design-tokens/dist/tokens.css — primitive/semantic 토큰
 * - packages/ui/src/styles/index.css — @theme inline 의 Tailwind 노출 변수
 */

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['src', 'app'];
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
    // 테스트 파일은 앱 런타임이 아니다. 주석에 적힌 예시(`var(--rank-up)` 같은)가
    // 실제 사용처로 잡히면 실패 메시지가 지저분해진다.
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    if (SCAN_EXTS.includes(extname(entry.name))) out.push(full);
  }
  return out;
}

/**
 * 파일에서 쓰이지만 그 파일 안에 정의가 없는 변수만 골라낸다.
 * CSS Module 이 자기 안에서 선언해 쓰는 지역 변수(예: BookListItem 의 --size)를
 * 제외 목록에 하드코딩하지 않고 자동으로 걸러내기 위한 것이다.
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
  for (const file of collectFiles(join(APP_ROOT, dir))) {
    usages.push(...externalUsagesIn(readFileSync(file, 'utf8'), file.slice(APP_ROOT.length)));
  }
}

const defined = {
  ...parseCssVars(
    readFileSync(
      new URL('../../../packages/design-tokens/dist/tokens.css', import.meta.url),
      'utf8',
    ),
  ),
  ...parseCssVars(
    readFileSync(
      new URL('../../../packages/ui/src/styles/index.css', import.meta.url),
      'utf8',
    ),
  ),
};

describe('토큰 소비처 대조', () => {
  it('소스가 쓰는 CSS 변수가 전부 정의되어 있다', () => {
    const undefinedVars = [
      ...new Set(
        usages.filter((u) => !(u.name in defined)).map((u) => `${u.name}  (${u.file})`),
      ),
    ].sort();

    expect(undefinedVars).toEqual([]);
  });

  it('스캔이 실제로 동작한다 — 토큰 사용처를 찾지 못하면 이 테스트는 무의미하다', () => {
    // 스캔 경로나 정규식이 잘못되면 usages 가 비어 위 테스트가 공짜로 통과한다.
    //
    // 하한이 40 에서 15 로 내려간 것은 앱이 토큰을 덜 쓰게 됐다는 뜻이 아니라,
    // @theme inline 과 유틸 클래스가 packages/ui 로 옮겨 갔기 때문이다.
    // 앱에 남은 것은 CSS Module 의 도메인 셰이프 등 19종이고, 그 대부분이
    // 시스템 토큰을 직접 참조한다.
    const distinct = new Set(usages.map((u) => u.name));
    expect(distinct.size).toBeGreaterThanOrEqual(15);
    expect(distinct.has('--line')).toBe(true);
  });
});
