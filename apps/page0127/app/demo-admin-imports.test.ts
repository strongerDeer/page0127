import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: 체험 계정용 데모 어드민(/demo/admin)은 실제 운영 데이터에 닿는 코드를 **한 줄도** 불러오면 안 된다.
 *
 * 데모는 실제 어드민 패널(features/admin-*\/ui)을 빌려 쓰고 숫자만 예시로 넣는다. 그런데 누가 나중에
 * "실제 숫자 하나만 보여 주자"며 getOverview 같은 api 함수를 불러오면, 체험 계정(여러 사람이 함께 쓰는
 * 공용 계정)에게 service_role 로 읽은 진짜 회원 데이터가 나간다. 실제 api 함수는 assertAdmin 으로
 * 막히긴 하지만, 그 겹 하나에만 기대지 않으려고 import 자체를 막는다.
 *
 * 어떻게 보나:
 * 데모 폴더의 파일에서 시작해 import 를 따라 내려가며(빌려 쓰는 패널이 몰래 api 를 부르는지도 본다)
 * 아래 금지 모듈에 닿는지 확인한다. `import type` 은 빌드 때 지워져 번들에 안 남으므로 따라가지 않는다
 * — 예시 데이터가 실제 api 의 반환 타입을 빌려 쓰는 건 오히려 권장(타입이 바뀌면 바로 알 수 있다).
 */

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** 데모 어드민의 시작점 */
const ENTRY_DIRS = ['app/demo/admin', 'src/widgets/demo-admin'];

/** 닿으면 안 되는 모듈 — 운영 DB(service_role)·GA/Search Console 토큰·관리자 확인 */
const FORBIDDEN: { test: (rel: string) => boolean; why: string }[] = [
  {
    test: (rel) => rel.startsWith('src/shared/config/supabase/admin'),
    why: 'service_role 클라이언트(createAdminClient)',
  },
  {
    test: (rel) => rel.startsWith('src/shared/lib/google/'),
    why: 'GA·Search Console 서비스 계정',
  },
  {
    test: (rel) => rel.startsWith('src/shared/lib/admin/assertAdmin'),
    why: '관리자 확인(데모가 부르면 체험 계정은 404)',
  },
  {
    test: (rel) => /^src\/features\/admin-[^/]+\/api\//.test(rel),
    why: '어드민 데이터 조회·서버 액션(api)',
  },
];

const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const resolveFile = (base: string): string | null => {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXTS) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
};

/** 'import x from' · 'export { x } from' 중 값(type 이 아닌) import 의 경로만 */
export const valueImports = (source: string): string[] => {
  const out: string[] = [];
  const re =
    /(?:^|\n)\s*(import|export)\s+(type\s+)?([\s\S]*?)\s*from\s+['"]([^'"]+)['"]/g;
  for (const m of source.matchAll(re)) {
    if (m[2]) continue; // import type … / export type …
    out.push(m[4]);
  }
  // 부수 효과 import ('import "x"')
  for (const m of source.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g))
    out.push(m[1]);
  return out;
};

const resolveSpecifier = (spec: string, fromFile: string): string | null => {
  if (spec.startsWith('@/app/'))
    return resolveFile(join(APP_ROOT, 'app', spec.slice(6)));
  if (spec.startsWith('@/'))
    return resolveFile(join(APP_ROOT, 'src', spec.slice(2)));
  if (spec.startsWith('.'))
    return resolveFile(resolve(dirname(fromFile), spec));
  return null; // 패키지(react·lucide·@repo/*)는 앱 데이터에 닿지 않는다
};

const collectFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return collectFiles(full);
    return /\.tsx?$/.test(e.name) && !e.name.includes('.test.') ? [full] : [];
  });

/** 시작 파일들에서 import 를 따라가 금지 모듈에 닿는 길을 모두 찾는다 */
const findForbiddenPaths = (entries: string[]): string[] => {
  const seen = new Set<string>();
  const violations: string[] = [];
  const walk = (file: string, chain: string[]) => {
    const rel = relative(APP_ROOT, file);
    const hit = FORBIDDEN.find((f) => f.test(rel));
    if (hit) {
      violations.push(`${[...chain, rel].join(' → ')} (${hit.why})`);
      return;
    }
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    if (/^\s*['"]use server['"]/m.test(source)) {
      violations.push(`${[...chain, rel].join(' → ')} (서버 액션)`);
      return;
    }
    for (const spec of valueImports(source)) {
      const next = resolveSpecifier(spec, file);
      if (next) walk(next, [...chain, rel]);
    }
  };
  for (const entry of entries) walk(entry, []);
  return violations;
};

describe('데모 어드민은 운영 데이터 코드를 불러오지 않는다', () => {
  it('판정 함수: import type 은 넘기고 값 import 만 잡는다', () => {
    const source = [
      "import type { AdminOverview } from '@/features/admin-overview/api/getOverview';",
      "import { type X, getOverview } from '@/features/admin-overview/api/getOverview';",
      "export { a } from './a';",
      "export type { B } from './b';",
      "import './side-effect';",
    ].join('\n');
    expect(valueImports(source)).toEqual([
      '@/features/admin-overview/api/getOverview',
      './a',
      './side-effect',
    ]);
  });

  it('금지 모듈이 잡히는지 — 실제 어드민 페이지는 반드시 닿는다(검사가 헛돌지 않는지 확인)', () => {
    const realAdmin = join(APP_ROOT, 'app/(admin)/admin/page.tsx');
    expect(findForbiddenPaths([realAdmin]).length).toBeGreaterThan(0);
  });

  it('/demo/admin 과 widgets/demo-admin 에서 따라 내려가도 금지 모듈이 없다', () => {
    const entries = ENTRY_DIRS.flatMap((d) => collectFiles(join(APP_ROOT, d)));
    // 폴더가 옮겨져 아무 파일도 안 보면 테스트가 헛돈다
    expect(entries.length).toBeGreaterThanOrEqual(8);
    expect(findForbiddenPaths(entries)).toEqual([]);
  });

  it('데모 페이지는 모두 검색에서 빠진다(noindex) — 예시 숫자가 실제처럼 검색되면 안 된다', () => {
    const layout = readFileSync(
      join(APP_ROOT, 'app/demo/admin/layout.tsx'),
      'utf8'
    );
    expect(layout).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it('데모 페이지마다 체험 계정 확인을 직접 부른다(레이아웃 확인만으로는 페이지 조각이 샌다)', () => {
    const pages = collectFiles(join(APP_ROOT, 'app/demo/admin')).filter((f) =>
      /(page|layout)\.tsx$/.test(f)
    );
    expect(pages.length).toBeGreaterThanOrEqual(4);
    for (const page of pages) {
      expect(readFileSync(page, 'utf8'), relative(APP_ROOT, page)).toContain(
        'await assertDemoViewer()'
      );
    }
  });
});
