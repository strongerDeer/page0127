import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: 어드민 코드에서 service_role 클라이언트를 여는 **export 함수**는 스스로 관리자를 확인해야 한다.
 *
 * 왜 레이아웃 확인만으로는 부족한가:
 * App Router 는 레이아웃과 페이지를 병렬로 렌더링한다. 페이지는 레이아웃 children 으로 "들어가는" 게
 * 아니라 따로 만든 RSC 조각이라, 레이아웃이 notFound() 를 던져도 이미 만든 페이지 조각은 응답에
 * 직렬화된다(Next 16.4.6 최소 예제로 확인, 2026-11-24). 그래서 화면은 404 인데 HTML 안 RSC 데이터에
 * 신고 목록 같은 어드민 데이터가 실릴 수 있었다. 확인은 데이터를 꺼내는 함수에서 한다(DAL 원칙).
 *
 * 어떻게 보나:
 * 파일을 맨 왼쪽에서 시작하는 선언 단위로 자르고, `export` 선언 중 `createAdminClient(` 를 부르는 것은
 * 같은 선언 안에서 `assertAdmin()` 또는 `getAdminUser()` 도 불러야 한다. export 되지 않은 도우미는
 * 밖에서 부를 수 없으니(그걸 부르는 export 함수가 확인한다) 보지 않는다.
 */

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** 어드민 데이터를 다루는 폴더 — 여기 있는 export 함수는 어드민 화면·액션에서만 쓰인다 */
const isAdminDir = (rel: string): boolean =>
  /^src\/features\/admin-[^/]+\//.test(rel) ||
  rel.startsWith('src/widgets/admin/') ||
  rel.startsWith('src/features/book-review/');

const collectFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
};

/** 맨 왼쪽(들여쓰기 없음)에서 시작하는 선언마다 잘라 돌려준다 */
const splitTopLevel = (source: string): string[] =>
  source.split(/\n(?=(?:export |const |let |async function |function ))/);

export const findUnguardedExports = (source: string): string[] =>
  splitTopLevel(source)
    .filter(
      (chunk) =>
        chunk.startsWith('export ') && chunk.includes('createAdminClient(')
    )
    .filter(
      (chunk) =>
        !chunk.includes('assertAdmin()') && !chunk.includes('getAdminUser()')
    )
    .map((chunk) => chunk.split('\n')[0]);

describe('어드민 service_role 사용처 관리자 확인', () => {
  it('판정 함수: 확인 없는 export 만 잡고 도우미는 넘긴다', () => {
    const source = [
      "import { createAdminClient } from 'x';",
      'const helper = () => createAdminClient();',
      'export const safe = async () => {',
      '  await assertAdmin();',
      '  return createAdminClient();',
      '};',
      'export const leaky = async () => {',
      '  return createAdminClient();',
      '};',
    ].join('\n');
    expect(findUnguardedExports(source)).toEqual([
      'export const leaky = async () => {',
    ]);
  });

  it('어드민 폴더의 export 함수는 service_role 을 열기 전에 관리자를 확인한다', () => {
    const files = collectFiles(join(APP_ROOT, 'src'))
      .map((file) => ({ file, rel: relative(APP_ROOT, file) }))
      .filter(({ rel }) => isAdminDir(rel));
    // 폴더 이름이 바뀌어 아무 파일도 안 보면 테스트가 헛돈다
    expect(files.length).toBeGreaterThan(10);

    const violations = files.flatMap(({ file, rel }) =>
      findUnguardedExports(readFileSync(file, 'utf8')).map(
        (line) => `${rel}: ${line}`
      )
    );
    expect(violations).toEqual([]);
  });
});
