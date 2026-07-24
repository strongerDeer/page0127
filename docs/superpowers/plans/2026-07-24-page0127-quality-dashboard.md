# page0127 품질 모니터링 대시보드 (+ GA 골격) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** page0127 배포 공개 페이지의 품질(성능·접근성·SEO·CWV·번들·CrUX)을 CI에서 주기 측정해 Supabase에 쌓고, admin 콘솔에서 시각화한다. GA 유입 분석은 골격만 깔아둔다.

**Architecture:** 측정(Chrome 필요, GitHub Actions에서 `@repo/quality` 실행)과 표시(admin 서버 컴포넌트가 Supabase 읽기)를 완전히 분리한다. shop-chart의 검증된 품질 엔진을 패키지로 포팅하되, 저장소를 JSON→Supabase로, 앵커를 page0127 공개 페이지로, 빌드 측정을 자기 repo 대상으로 단순화한다.

**Tech Stack:** Next.js 16(App Router, Server Component), TypeScript, npm workspaces + Turborepo, `@supabase/supabase-js`, Lighthouse + chrome-launcher + playwright, CrUX API, recharts, react-markdown, `node --experimental-strip-types`.

## Global Constraints

- 커밋 메시지에 `Co-Authored-By: Claude ...` 트레일러를 **절대 넣지 않는다** (CLAUDE.md 규칙 6).
- 패키지 스코프는 `@repo/*` (기존 `@repo/design-tokens` 컨벤션). npm workspaces(`apps/*`, `packages/*`).
- 측정 엔진 런타임은 `node --experimental-strip-types`. **relative *값* import는 `.ts` 확장자 필수**, `import type`은 확장자 선택. **tsx 금지**(Lighthouse를 깨뜨림).
- Next.js는 **Server Component 우선**, `'use client'`는 hook/이벤트/recharts에만.
- service_role 키 env는 `SUPABASE_SERVICE_ROLE_KEY`, **절대 `NEXT_PUBLIC_` 접두사 금지**, `admin.ts`를 `'use client'`에서 import 금지.
- Supabase 마이그레이션 파일명: `YYYYMMDDHHMMSS_<name>.sql` (생성 시각으로 확정).
- 포팅 원본 루트(절대경로): `/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/`
- 측정 앵커(고정 5개): `home /` · `about /about` · `library /books/all` · `profile /dreamfulbud` · `detail /dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54`
- 학습 포인트에는 한국어 주석. 반복 보일러플레이트는 그대로 작성.
- admin 데이터 조회 패턴은 기존 그대로: `feature/api/getX()`에서 `await assertAdmin()` → `createAdminClient()`(service_role) → 쿼리.

---

## File Structure

**신규 패키지 `packages/quality/`** (측정 엔진, shop-chart 포팅)
- `package.json`, `tsconfig.json` — 패키지 설정
- `src/types.ts` — 측정 결과 타입 (verbatim 포팅)
- `src/config.ts` — page0127 앵커/임계/폼팩터 (**신규 작성**)
- `src/runtime.ts`, `src/lighthouse.ts`, `src/crux.ts`, `src/seo.ts`, `src/analyze.ts` — 측정 모듈 (verbatim 포팅 + import 경로 조정)
- `src/build.ts` — 번들/코드건강 (verbatim 포팅, run.ts에서 앱 경로 주입)
- `src/report.ts` — `buildNarrative`만 (verbatim), `publishReport` 제외
- `src/store.ts` — **Supabase 저장 (신규 작성, JSON 대체)**
- `src/run.ts` — 오케스트레이션 (**어댑트**: prodCheckout 제거, 단일 앱)
- `src/*.test.ts` — vitest 테스트 (verbatim 포팅)

**Supabase**
- `supabase/migrations/<ts>_create_quality_tables.sql` — 테이블 2개 + RLS

**CI**
- `.github/workflows/quality.yml` — 주 1회 + 수동 측정

**page0127 admin** (`apps/page0127/`)
- `src/features/admin-quality/api/getQualityDashboard.ts` — Supabase 조회 (신규)
- `src/features/admin-quality/lib/verdict.ts` (+ `.test.ts`) — RAG 판정 로직 (신규)
- `src/features/admin-quality/ui/QualitySummary.tsx` — RAG 요약 카드
- `src/features/admin-quality/ui/PageScoreTable.tsx` — 페이지별 점수 테이블
- `src/features/admin-quality/ui/FieldTrendChart.tsx` — CrUX 추세 차트 (`'use client'`)
- `src/features/admin-quality/ui/RegressionBanner.tsx` — 회귀 배너
- `src/features/admin-quality/ui/QualityReport.tsx` — 리포트 md 렌더
- `app/(admin)/admin/quality/page.tsx` — 라우트 조립
- `app/(admin)/admin/analytics/page.tsx` + `layout.tsx` — GA 골격
- `src/widgets/admin/ui/AdminNav.tsx` — 링크 2개 추가 (수정)

### 디자인 방향 (frontend-design)

이 대시보드는 **기존 admin 콘솔 언어**를 따른다(조용한 1px `border-line`, lucide 단색 아이콘, 그린 중심 토스풍, 문장형 한국어 카피). 새 브랜드 아이덴티티를 만들지 않는다 — 내부 운영 도구가 기존 콘솔과 이질감을 주면 안 된다.

**시그니처 = RAG 판정 칩.** 색이 곧 판정을 인코딩한다: `pass=그린 / warn=앰버 / fail=레드`, 그리고 **랩 LCP는 회색(판정 제외)** 이다. 이건 장식이 아니라 shop-chart의 도메인 지식("느린4G 랩 LCP는 회선 속도를 재는 값이라 코드 신호가 없다")을 색으로 못박은 것 — 구조가 곧 정보다. 나머지는 전부 조용하게: 추세 차트는 `chartInk`의 그린 primary + 옅은 그리드, 표는 얇은 선만.

---

## Phase 1 — `@repo/quality` 스캐폴드 + 코어 포팅 (로컬 JSON 먼저)

### Task 1: 패키지 스캐폴드

**Files:**
- Create: `packages/quality/package.json`
- Create: `packages/quality/tsconfig.json`
- Create: `packages/quality/src/types.ts` (원본 복사)
- Create: `packages/quality/src/runtime.ts` (원본 복사)

**Interfaces:**
- Produces: `@repo/quality` 워크스페이스 패키지. `src/types.ts`의 모든 타입(`QualityRecord`, `PageMetrics`, `FieldMetrics`, `FieldHistory`, `FieldHistoryFile`, `QualityHistory`, `SeoMetrics`, `RuntimeMetrics`, `CodeHealthMetrics`, `BundleMetrics`, `RegressionRecord`, `FormFactor` 등).

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@repo/quality",
  "version": "0.0.1",
  "private": true,
  "description": "page0127 품질 측정 엔진 (Lighthouse/CrUX/SEO/번들)",
  "type": "module",
  "scripts": {
    "measure": "node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/run.ts",
    "test": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.86.0",
    "chrome-launcher": "^1.2.1",
    "lighthouse": "^13.3.0",
    "node-html-parser": "^7.1.0",
    "playwright": "^1.60.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 원본 파일 복사**

원본을 그대로 복사한다(로직 변경 없음):
```bash
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/types.ts" packages/quality/src/types.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/runtime.ts" packages/quality/src/runtime.ts
```

- [ ] **Step 4: 의존성 설치 + 타입체크**

Run: `npm install` (루트에서, 워크스페이스 링크) 그리고 `npm run type-check -w @repo/quality`
Expected: 타입 에러 없이 통과 (`runtime.ts`가 참조하는 타입이 `types.ts`에 다 있음).

- [ ] **Step 5: 커밋**

```bash
git add packages/quality/package.json packages/quality/tsconfig.json packages/quality/src/types.ts packages/quality/src/runtime.ts package-lock.json
git commit -m "feat(quality): @repo/quality 패키지 스캐폴드 + 타입/런타임 포팅"
```

---

### Task 2: Lighthouse 모듈 포팅

**Files:**
- Create: `packages/quality/src/lighthouse.ts` (원본 복사)
- Test: `packages/quality/src/lighthouse.test.ts` (원본 복사)

**Interfaces:**
- Consumes: `./types.ts` (Task 1)
- Produces: `measureLighthouseMedian(url, runs, formFactor)` → `MedianLighthouseResult`(lighthouse/cwv/weight/samples/lcpSpreadMs/tbtSpreadMs), `measureLighthouse`, `median`.

- [ ] **Step 1: 원본 복사**

```bash
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/lighthouse.ts" packages/quality/src/lighthouse.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/lighthouse.test.ts" packages/quality/src/lighthouse.test.ts
```

- [ ] **Step 2: import 경로 점검**

`lighthouse.ts` 상단의 relative 값 import가 `.ts` 확장자를 쓰는지 확인한다(예: `from './types.ts'`가 아니라 `import type`이면 확장자 없어도 됨). 값 import에 `.ts`가 빠져 있으면 추가한다. 외부 패키지(`lighthouse`, `chrome-launcher`) import는 그대로 둔다.

- [ ] **Step 3: 테스트 실행**

Run: `npm test -w @repo/quality -- lighthouse`
Expected: PASS (median 계산 등 순수 함수 테스트).

- [ ] **Step 4: 커밋**

```bash
git add packages/quality/src/lighthouse.ts packages/quality/src/lighthouse.test.ts
git commit -m "feat(quality): Lighthouse 측정 모듈 포팅"
```

---

### Task 3: CrUX 모듈 포팅

**Files:**
- Create: `packages/quality/src/crux.ts` (원본 복사)
- Test: `packages/quality/src/crux.test.ts` (원본 복사)

**Interfaces:**
- Consumes: `./types.ts`
- Produces: `measureField(url)` → `FieldMetrics | undefined`, `measureFieldHistory(url)` → `FieldHistory | undefined`, `mergeFieldHistory(prev, next)`, `parseCruxRecord`, `parseCruxHistoryRecord`, `mergeSeries`.

- [ ] **Step 1: 원본 복사**

```bash
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/crux.ts" packages/quality/src/crux.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/crux.test.ts" packages/quality/src/crux.test.ts
```

- [ ] **Step 2: import 경로 점검** — Task 2 Step 2와 동일하게 값 import `.ts` 확인.

- [ ] **Step 3: 테스트 실행**

Run: `npm test -w @repo/quality -- crux`
Expected: PASS (CrUX 응답 파싱·병합 순수 함수 테스트. 결측 `null`/`"NaN"` 처리 포함).

- [ ] **Step 4: 커밋**

```bash
git add packages/quality/src/crux.ts packages/quality/src/crux.test.ts
git commit -m "feat(quality): CrUX 필드/추세 모듈 포팅"
```

---

### Task 4: SEO + analyze(회귀) 모듈 포팅

**Files:**
- Create: `packages/quality/src/seo.ts`, `packages/quality/src/analyze.ts` (원본 복사)
- Test: `packages/quality/src/seo.test.ts`, `packages/quality/src/analyze.test.ts` (원본 복사)

**Interfaces:**
- Consumes: `./types.ts`
- Produces: `measureSeo(baseUrl, html)` → `SeoMetrics`, `parseSeoFromHtml`, `checkUrlOk`; `analyze(history: QualityRecord[])` → `Analysis`(`regressions`, `suppressedRegressions`, `sameDeployment` 등).

- [ ] **Step 1: 원본 복사**

```bash
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/seo.ts" packages/quality/src/seo.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/seo.test.ts" packages/quality/src/seo.test.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/analyze.ts" packages/quality/src/analyze.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/analyze.test.ts" packages/quality/src/analyze.test.ts
```

- [ ] **Step 2: import 경로 점검** — 값 import `.ts` 확인. `analyze.ts`는 `./config.ts`의 `REGRESSION`을 import한다 — config는 Task 6에서 만들므로 **이 단계에서 타입체크는 아직 실패할 수 있다**(config 미존재). 테스트는 순수 함수라 통과해야 한다.

- [ ] **Step 3: 테스트 실행**

Run: `npm test -w @repo/quality -- seo analyze`
Expected: PASS. (analyze 테스트가 `REGRESSION` 상수를 필요로 하면, Task 6의 config를 먼저 만들거나 테스트가 자체 fixture를 쓰는지 확인 — 원본 테스트 구조를 따른다.)

- [ ] **Step 4: 커밋**

```bash
git add packages/quality/src/seo.ts packages/quality/src/seo.test.ts packages/quality/src/analyze.ts packages/quality/src/analyze.test.ts
git commit -m "feat(quality): SEO 정적체크 + 회귀 판정 모듈 포팅"
```

---

### Task 5: build(번들/코드건강) + report(내러티브) 포팅

**Files:**
- Create: `packages/quality/src/build.ts`, `packages/quality/src/report.ts`
- Test: `packages/quality/src/build.test.ts` (원본 복사)

**Interfaces:**
- Consumes: `./types.ts`, `./analyze.ts`
- Produces: `measureBuild(repoPath)` → `BuildResult`(`bundle`, `buildTimeSec`, `codeHealth`), `measureBundle`, `computeFirstLoadKb`, `parseTscCount`, `parseEslintCount`; `buildNarrative(a: Analysis): string`.

- [ ] **Step 1: build.ts 복사**

```bash
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/build.ts" packages/quality/src/build.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/build.test.ts" packages/quality/src/build.test.ts
```
`build.ts`는 `repoPath`를 인자로 받아 그 경로에서 `next build`/`tsc`/`eslint`를 돌려 파싱한다. page0127도 Next 앱이라 그대로 동작한다. **경로만 run.ts에서 page0127 앱 경로로 주입**한다(로직 수정 불필요).

- [ ] **Step 2: report.ts 복사 후 `publishReport` 제거**

```bash
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/report.ts" packages/quality/src/report.ts
```
`report.ts`에서 **`publishReport` 함수와 그것이 쓰는 파일시스템 import(`node:fs` 등), 외부 로그 경로 상수를 삭제**한다. `buildNarrative(a: Analysis): string`만 남긴다. page0127은 이 내러티브 문자열을 레코드의 `report_md`에 저장하므로 파일 발행이 필요 없다.

- [ ] **Step 3: import 경로 점검 + build 테스트**

Run: `npm test -w @repo/quality -- build`
Expected: PASS (KB 계산·tsc/eslint 출력 파싱 순수 함수 테스트).

- [ ] **Step 4: 커밋**

```bash
git add packages/quality/src/build.ts packages/quality/src/build.test.ts packages/quality/src/report.ts
git commit -m "feat(quality): 번들/코드건강 포팅 + report는 내러티브만 유지"
```

---

### Task 6: page0127용 `config.ts` 작성

**Files:**
- Create: `packages/quality/src/config.ts` (신규)

**Interfaces:**
- Consumes: `./types.ts` (`FormFactor`)
- Produces: `APP`(단일 앱 설정: `targetUrl`, `pages[]`), `LIGHTHOUSE_RUNS`, `FORM_FACTORS`, `REGRESSION`, `DATA_PATH`, `FIELD_HISTORY_PATH`.

- [ ] **Step 1: config.ts 작성**

```ts
import type { FormFactor } from './types.ts';

export type PageAnchor = { name: string; path: string };

// 측정 대상 배포 URL. CI에서 QUALITY_TARGET_URL로 주입.
// 로컬 검증 시엔 로컬 개발 서버(예: http://localhost:3000)를 넣는다.
const TARGET_URL = process.env.QUALITY_TARGET_URL ?? 'http://localhost:3000';

// 측정 앵커는 "인기 페이지"가 아니라 **회귀 감지용 고정 URL**이다.
// 같은 URL을 계속 재야 코드 변경 영향을 주차 간 비교로 잡는다.
// 실사용자 대표성은 CrUX(record.field, origin 집계)가 담당한다.
export const APP = {
  name: 'page0127',
  env: 'production' as const,
  targetUrl: TARGET_URL,
  pages: [
    { name: 'home', path: '/' },
    { name: 'about', path: '/about' },
    { name: 'library', path: '/books/all' },
    // profile: 동적 사용자 페이지. dreamfulbud는 소유자 계정이라 삭제 위험이 없다.
    { name: 'profile', path: '/dreamfulbud' },
    // detail: 무거운 동적 상세. 고정 bookId로 시계열을 유지한다(삭제되면 config에서 교체).
    {
      name: 'detail',
      path: '/dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54',
    },
  ] satisfies PageAnchor[],
};

// Lighthouse 반복 횟수(중앙값). 느린4G LCP/SI 노이즈를 걷어낸다. LH_RUNS로 조정.
export const LIGHTHOUSE_RUNS = Math.max(1, Number(process.env.LH_RUNS ?? 3));

// 측정 폼팩터. 기본 둘 다 → 측정 시간 약 2배. LH_FORM_FACTORS로 조정.
const parseFormFactors = (raw: string | undefined): FormFactor[] => {
  if (!raw) return ['mobile', 'desktop'];
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is FormFactor => s === 'mobile' || s === 'desktop');
  if (parsed.length === 0) {
    throw new Error(`LH_FORM_FACTORS 값이 잘못됨: '${raw}' (허용: mobile, desktop)`);
  }
  return [...new Set(parsed)];
};
export const FORM_FACTORS = parseFormFactors(process.env.LH_FORM_FACTORS);

// 회귀 임계 — shop-chart 실측 튜닝값을 초기값으로 그대로 사용, page0127 노이즈 보며 조정.
export const REGRESSION = {
  performanceDrop: 8,
  bundleIncreaseRatio: 0.1,
  lcpMaxMs: 2500,
  clsMax: 0.1,
  tbtMaxMs: 200,
  lcpMinRegressionMs: 1500,
  tbtMinRegressionMs: 100,
  weightIncreaseRatio: 0.15,
};

// 로컬 JSON 검증 단계(Task 8)에서만 쓰는 경로. Supabase 전환(Task 10) 후엔 미사용.
export const DATA_PATH = 'packages/quality/.data/quality-metrics.json';
export const FIELD_HISTORY_PATH = 'packages/quality/.data/quality-field-history.json';
```

- [ ] **Step 2: analyze가 REGRESSION을 참조하면 타입체크로 확인**

Run: `npm run type-check -w @repo/quality`
Expected: `config.ts` 관련 에러 없음. `analyze.ts`가 `REGRESSION`을 import하면 이제 해소된다. (아직 `run.ts`/`store.ts` 미작성으로 그쪽 에러는 남을 수 있음 — 다음 태스크에서 해소.)

- [ ] **Step 3: 커밋**

```bash
git add packages/quality/src/config.ts
git commit -m "feat(quality): page0127 앵커/임계/폼팩터 config 작성"
```

---

### Task 7: `store.ts` — 로컬 JSON 버전 (검증용)

**Files:**
- Create: `packages/quality/src/store.ts` (원본 복사 후 `.data` 경로만)
- Test: `packages/quality/src/store.test.ts` (원본 복사)

**Interfaces:**
- Consumes: `./types.ts`, `./crux.ts`(`mergeFieldHistory`)
- Produces: `readHistory(path)` → `QualityHistory`, `appendRecord(path, record)`, `saveFieldHistory(path, app, next)`, `readFieldHistory(path)`.

> 이 태스크는 **로컬 동작 검증을 먼저** 하기 위한 JSON 버전이다(spec 구현순서 1). Task 10에서 Supabase로 교체한다. 원본 store를 그대로 써서 측정 파이프라인이 도는지부터 확인한다.

- [ ] **Step 1: 원본 복사 + 디렉터리**

```bash
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/store.ts" packages/quality/src/store.ts
cp "/Users/dreamfulbud/Desktop/stronger/novera/shop-chart/scripts/quality/store.test.ts" packages/quality/src/store.test.ts
mkdir -p packages/quality/.data
echo "packages/quality/.data/" >> .gitignore
```

- [ ] **Step 2: import 경로 점검 + 테스트**

Run: `npm test -w @repo/quality -- store`
Expected: PASS (JSON 읽기/쓰기/병합 테스트).

- [ ] **Step 3: 커밋**

```bash
git add packages/quality/src/store.ts packages/quality/src/store.test.ts .gitignore
git commit -m "feat(quality): store JSON 버전 포팅 (로컬 검증용)"
```

---

### Task 8: `run.ts` 어댑트 + 로컬 스모크 실행

**Files:**
- Create: `packages/quality/src/run.ts` (**어댑트**: prodCheckout 제거, 단일 앱, build 경로 주입)

**Interfaces:**
- Consumes: config(`APP`, `LIGHTHOUSE_RUNS`, `FORM_FACTORS`, `DATA_PATH`, `FIELD_HISTORY_PATH`), lighthouse, crux, seo, runtime, build, analyze, report, store.
- Produces: 실행 엔트리포인트. `.data/quality-metrics.json`에 레코드 1건 append.

- [ ] **Step 1: run.ts 작성** (원본에서 `ensureProdWorktree`/`prodCheckout` import·분기 삭제, 단일 `APP` 사용, build 경로는 page0127 앱 경로)

```ts
import { execSync } from 'node:child_process';

import { analyze } from './analyze.ts';
import { measureBuild } from './build.ts';
import {
  APP,
  DATA_PATH,
  FIELD_HISTORY_PATH,
  FORM_FACTORS,
  LIGHTHOUSE_RUNS,
} from './config.ts';
import { measureField, measureFieldHistory } from './crux.ts';
import { measureLighthouseMedian } from './lighthouse.ts';
import { buildNarrative } from './report.ts';
import { measureRuntime } from './runtime.ts';
import { measureSeo } from './seo.ts';
import { appendRecord, readHistory, saveFieldHistory } from './store.ts';
import type { FormFactor, PageMetrics, QualityRecord } from './types.ts';

// 번들/코드건강을 측정할 대상 = page0127 앱 디렉터리(자기 repo).
// shop-chart처럼 별도 repo를 체크아웃하지 않는다 — CI가 이미 page0127을 체크아웃해 둔다.
const BUILD_PATH = process.env.QUALITY_BUILD_PATH ?? 'apps/page0127';

const gitRef = (repoPath: string): string => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
};

const measurePages = async (formFactor: FormFactor): Promise<PageMetrics[]> => {
  const pages: PageMetrics[] = [];
  for (const p of APP.pages) {
    const url = `${APP.targetUrl}${p.path}`;
    const lh = await measureLighthouseMedian(url, LIGHTHOUSE_RUNS, formFactor);
    pages.push({
      name: p.name,
      url,
      formFactor,
      lighthouse: lh.lighthouse,
      cwv: lh.cwv,
      weight: lh.weight,
      samples: lh.samples,
      lcpSpreadMs: lh.lcpSpreadMs,
      tbtSpreadMs: lh.tbtSpreadMs,
    });
  }
  return pages;
};

const main = async (): Promise<void> => {
  console.error(
    `[quality] 측정 시작: ${APP.name} (폼팩터: ${FORM_FACTORS.join(', ')})`
  );

  // 모바일은 히스토리 연속성의 기준. 없으면 기록하지 않는다(회귀 시계열 단절 방지).
  const pages = FORM_FACTORS.includes('mobile')
    ? await measurePages('mobile')
    : [];
  if (pages.length === 0) {
    throw new Error(
      'LH_FORM_FACTORS에 mobile이 없어 기준 시계열을 만들 수 없습니다.'
    );
  }
  const desktopPages = FORM_FACTORS.includes('desktop')
    ? await measurePages('desktop')
    : undefined;

  const homeUrl = `${APP.targetUrl}${APP.pages[0]?.path ?? '/'}`;
  const homeHtml = await fetch(homeUrl).then((r) => r.text());
  const seo = await measureSeo(APP.targetUrl, homeHtml);
  const runtime = await measureRuntime(homeUrl);

  // CrUX는 외부 API 의존 → 실패해도 측정 전체를 죽이지 않는다. 없으면 field undefined.
  let field;
  try {
    field = await measureField(homeUrl);
  } catch (e) {
    console.warn('[quality] CrUX 조회 실패 — 필드 지표 없이 진행:', e);
  }
  try {
    const fieldHistory = await measureFieldHistory(homeUrl);
    if (fieldHistory) saveFieldHistory(FIELD_HISTORY_PATH, APP.name, fieldHistory);
  } catch (e) {
    console.warn('[quality] CrUX 추세 조회 실패 — 추세 없이 진행:', e);
  }

  const build = measureBuild(BUILD_PATH);

  const record: QualityRecord = {
    timestamp: new Date().toISOString(),
    app: APP.name,
    env: APP.env,
    targetUrl: APP.targetUrl,
    gitRef: gitRef(BUILD_PATH),
    pages,
    ...(desktopPages ? { desktopPages } : {}),
    bundle: build.bundle,
    buildTimeSec: build.buildTimeSec,
    ...(field ? { field } : {}),
    seo,
    runtime,
    codeHealth: build.codeHealth,
  };

  const priorHistory = readHistory(DATA_PATH).history.filter(
    (r) => r.app === APP.name
  );
  const analysis = analyze([...priorHistory, record]);
  record.analysisComment = buildNarrative(analysis);
  record.regressions = analysis.regressions;
  record.suppressedRegressions = analysis.suppressedRegressions;

  appendRecord(DATA_PATH, record);
  console.error(
    `[quality] 완료: ${APP.name} (회귀 ${analysis.regressions.length}건)`
  );
};

main().catch((e) => {
  console.error('[quality] 실패:', e);
  process.exitCode = 1;
});
```

- [ ] **Step 2: 타입체크**

Run: `npm run type-check -w @repo/quality`
Expected: 에러 없음 (모든 모듈이 연결됨).

- [ ] **Step 3: 로컬 스모크 실행** (page0127 dev 서버가 `localhost:3000`에 떠 있어야 함. 빠른 검증을 위해 1회·모바일만)

Run (루트에서):
```bash
QUALITY_TARGET_URL=http://localhost:3000 LH_RUNS=1 LH_FORM_FACTORS=mobile npm run measure -w @repo/quality
```
Expected: `[quality] 완료: page0127 ...` 출력 + `packages/quality/.data/quality-metrics.json`에 레코드 1건 생성. (CrUX 키 없으면 필드 경고만, 측정은 계속.)

- [ ] **Step 4: 커밋** (`.data`는 gitignore라 제외됨)

```bash
git add packages/quality/src/run.ts
git commit -m "feat(quality): run 오케스트레이션 어댑트 (단일 앱, prodCheckout 제거)"
```

---

## Phase 2 — Supabase 스키마 + 저장 전환

### Task 9: 품질 테이블 마이그레이션

**Files:**
- Create: `supabase/migrations/<ts>_create_quality_tables.sql`

**Interfaces:**
- Produces: `public.quality_records`, `public.quality_field_history` 테이블 + RLS.

- [ ] **Step 1: 마이그레이션 작성** (파일명 `<ts>`는 `date +%Y%m%d%H%M%S`로 생성)

```sql
-- 품질 측정 결과 저장.
-- 쓰기는 CI의 service_role(RLS 우회). 읽기는 admin 서버 코드가 createAdminClient로
-- (역시 service_role). 그래서 authenticated/anon용 정책은 만들지 않는다(= 전면 거부).

create table public.quality_records (
  id            uuid primary key default gen_random_uuid(),
  measured_at   timestamptz not null default now(),
  git_ref       text,
  form_factors  text[] not null,
  record        jsonb not null,
  report_md     text,
  schema_version int not null default 1
);
alter table public.quality_records enable row level security;

create index quality_records_measured_at_idx
  on public.quality_records (measured_at desc);

-- CrUX 25주 추세 — period_end 기준 upsert 병합(25주 롤링 윈도 밖 과거 보존).
create table public.quality_field_history (
  period_end        date not null,
  metric            text not null,
  period_start      date not null,
  p75               double precision,
  good              double precision,
  needs_improvement double precision,
  poor              double precision,
  primary key (period_end, metric)
);
alter table public.quality_field_history enable row level security;
```

- [ ] **Step 2: 로컬 적용** (로컬 Supabase가 떠 있을 때)

Run: `npx supabase db push` 또는 `npx supabase migration up`
Expected: 두 테이블 생성 성공.

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/*_create_quality_tables.sql
git commit -m "feat(quality): quality_records/field_history 테이블 + RLS 마이그레이션"
```

---

### Task 10: `store.ts` — Supabase 저장으로 교체

**Files:**
- Modify: `packages/quality/src/store.ts` (Supabase 버전으로 재작성)
- Modify: `packages/quality/src/run.ts` (저장 시그니처 변경 반영)
- Test: `packages/quality/src/store.test.ts` (순수 병합 함수 테스트만 유지)

**Interfaces:**
- Consumes: `@supabase/supabase-js`, env `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `./crux.ts`(`mergeFieldHistory`)
- Produces: `saveRecord(record, reportMd)` → `Promise<void>`, `readPriorRecords()` → `Promise<QualityRecord[]>`, `saveFieldHistoryToDb(app, history)` → `Promise<void>`, `mergeFieldHistory` re-export.

- [ ] **Step 1: store.ts 재작성**

```ts
import { createClient } from '@supabase/supabase-js';

import { mergeSeries } from './crux.ts';
import type {
  FieldHistory,
  FieldHistoryPoint,
  QualityRecord,
} from './types.ts';

// service_role 클라이언트 — RLS 우회. CI/서버에서만. 키를 로그에 남기지 않는다.
const db = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

// 회귀 판정용 직전 레코드들(최근 → 과거). record jsonb만 꺼내 복원한다.
export const readPriorRecords = async (): Promise<QualityRecord[]> => {
  const { data, error } = await db()
    .from('quality_records')
    .select('record')
    .order('measured_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  // analyze()는 오름차순(과거→현재)을 기대하므로 뒤집는다.
  return (data ?? []).map((r) => r.record as QualityRecord).reverse();
};

export const saveRecord = async (
  record: QualityRecord,
  reportMd: string
): Promise<void> => {
  const { error } = await db().from('quality_records').insert({
    measured_at: record.timestamp,
    git_ref: record.gitRef,
    form_factors: record.desktopPages ? ['mobile', 'desktop'] : ['mobile'],
    record,
    report_md: reportMd,
    schema_version: 1,
  });
  if (error) throw error;
};

// CrUX 추세: period_end 기준 upsert. 'all' 시리즈(가장 긴 추세)만 저장한다.
export const saveFieldHistoryToDb = async (
  history: FieldHistory
): Promise<void> => {
  const series = history.all ?? history.mobile ?? history.desktop;
  if (!series) return;

  const metrics: (keyof FieldHistoryPoint)[] = [
    'lcp',
    'inp',
    'cls',
    'fcp',
    'ttfb',
  ];
  const rows = series.points.flatMap((pt) =>
    metrics
      .filter((m) => m !== 'periodStart' && m !== 'periodEnd')
      .map((m) => {
        const mp = pt[m];
        if (!mp || typeof mp !== 'object') return null;
        return {
          period_end: pt.periodEnd,
          metric: m as string,
          period_start: pt.periodStart,
          p75: mp.p75 ?? null,
          good: mp.good ?? null,
          needs_improvement: mp.needsImprovement ?? null,
          poor: mp.poor ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  );
  if (rows.length === 0) return;

  const { error } = await db()
    .from('quality_field_history')
    .upsert(rows, { onConflict: 'period_end,metric' });
  if (error) throw error;
};

export { mergeSeries };
```

> 주의: `FieldHistoryPoint`의 실제 필드 형태(`lcp?: FieldMetricPoint` 등)를 `types.ts`에서 확인해 위 `metrics` 매핑을 맞춘다. `periodStart`/`periodEnd`는 문자열 필드라 metric 루프에서 제외한다.

- [ ] **Step 2: run.ts 저장부 교체**

`run.ts`에서 `./store.ts` import를 `{ readPriorRecords, saveRecord, saveFieldHistoryToDb }`로 바꾸고:
- `saveFieldHistory(FIELD_HISTORY_PATH, ...)` → `await saveFieldHistoryToDb(fieldHistory)`
- `readHistory(DATA_PATH).history.filter(...)` → `await readPriorRecords()`
- `appendRecord(DATA_PATH, record)` → `await saveRecord(record, record.analysisComment ?? '')`
- `config.ts`의 `DATA_PATH`/`FIELD_HISTORY_PATH` import 제거.

- [ ] **Step 3: store 순수함수 테스트 유지**

`store.test.ts`에서 JSON 파일 I/O 테스트는 제거하고, 병합 로직 테스트만 남긴다(또는 `crux.test.ts`가 이미 커버하면 삭제). 
Run: `npm test -w @repo/quality`
Expected: PASS.

- [ ] **Step 4: 로컬 Supabase에 저장 검증**

Run:
```bash
NEXT_PUBLIC_SUPABASE_URL=<로컬 url> SUPABASE_SERVICE_ROLE_KEY=<로컬 service key> \
QUALITY_TARGET_URL=http://localhost:3000 LH_RUNS=1 LH_FORM_FACTORS=mobile \
npm run measure -w @repo/quality
```
Expected: `quality_records`에 1행 insert (Supabase Studio에서 확인).

- [ ] **Step 5: 커밋**

```bash
git add packages/quality/src/store.ts packages/quality/src/store.test.ts packages/quality/src/run.ts
git commit -m "feat(quality): 저장소를 Supabase로 전환 (service_role)"
```

---

## Phase 3 — GitHub Actions

### Task 11: 주기 측정 워크플로우

**Files:**
- Create: `.github/workflows/quality.yml`

**Interfaces:**
- Consumes: GitHub Secrets `SUPABASE_URL`(=NEXT_PUBLIC_SUPABASE_URL 값), `SUPABASE_SERVICE_ROLE_KEY`, `CRUX_API_KEY`, `QUALITY_TARGET_URL`.

- [ ] **Step 1: 워크플로우 작성**

```yaml
name: quality

on:
  schedule:
    - cron: '0 0 * * 1' # 매주 월 09:00 KST (UTC 00:00)
  workflow_dispatch: {}

jobs:
  measure:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      # 번들/코드건강 측정 대상 빌드 (measureBuild가 .next 산출물 파싱)
      - run: npm run build -w page0127
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      - run: npm run measure -w @repo/quality
        env:
          QUALITY_TARGET_URL: ${{ secrets.QUALITY_TARGET_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          CRUX_API_KEY: ${{ secrets.CRUX_API_KEY }}
```

> `page0127`은 workspace 이름(package.json의 `name`)이다. 실제 값과 다르면 맞춘다. `measureBuild`가 참조하는 앱 경로는 `run.ts`의 `QUALITY_BUILD_PATH`(기본 `apps/page0127`)와 일치해야 한다.

- [ ] **Step 2: 워크플로우 문법 검증**

Run: `npx --yes @action-validator/cli .github/workflows/quality.yml` (또는 GitHub에 푸시 후 Actions 탭에서 `workflow_dispatch` 수동 실행)
Expected: 문법 오류 없음.

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/quality.yml
git commit -m "ci(quality): 주 1회 + 수동 품질 측정 워크플로우"
```

---

## Phase 4 — `/admin/quality` 시각화

### Task 12: 판정 로직 + 데이터 조회

**Files:**
- Create: `apps/page0127/src/features/admin-quality/lib/verdict.ts`
- Test: `apps/page0127/src/features/admin-quality/lib/verdict.test.ts`
- Create: `apps/page0127/src/features/admin-quality/api/getQualityDashboard.ts`

**Interfaces:**
- Consumes: `@repo/quality`(`QualityRecord` 타입), `@/shared/config/supabase/admin`(`createAdminClient`), `@/shared/lib/admin/assertAdmin`.
- Produces: `verdict(metric, value, formFactor)` → `'pass' | 'warn' | 'fail' | 'neutral'`; `getQualityDashboard()` → `{ latest: QualityRecord | null; fieldHistory: FieldHistoryRow[] }`.

- [ ] **Step 1: verdict 실패 테스트**

```ts
import { describe, expect, it } from 'vitest';
import { verdict } from './verdict';

describe('verdict', () => {
  it('랩 LCP는 항상 neutral (판정 제외)', () => {
    expect(verdict('labLcp', 9000, 'mobile')).toBe('neutral');
  });
  it('실사용자 LCP 2500ms 이하 good은 pass', () => {
    expect(verdict('fieldLcpP75', 2000, 'mobile')).toBe('pass');
  });
  it('실사용자 LCP 4000ms 초과는 fail', () => {
    expect(verdict('fieldLcpP75', 4500, 'mobile')).toBe('fail');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w page0127 -- verdict`
Expected: FAIL ("verdict is not a function").

- [ ] **Step 3: verdict 구현** (CWV 표준 임계 + 랩 LCP neutral)

```ts
export type Verdict = 'pass' | 'warn' | 'fail' | 'neutral';
export type VerdictMetric =
  | 'labLcp' // 느린4G 랩 LCP → 회선 속도라 판정 제외(neutral)
  | 'fieldLcpP75'
  | 'fieldInpP75'
  | 'fieldClsP75'
  | 'tbt'
  | 'cls';

// CWV 표준 임계: good / poor 경계. 그 사이는 warn.
const THRESHOLDS: Record<string, [number, number]> = {
  fieldLcpP75: [2500, 4000],
  fieldInpP75: [200, 500],
  fieldClsP75: [0.1, 0.25],
  tbt: [200, 600],
  cls: [0.1, 0.25],
};

export const verdict = (
  metric: VerdictMetric,
  value: number,
  _formFactor: 'mobile' | 'desktop'
): Verdict => {
  // 랩 LCP는 코드 신호가 없어 색으로 판정하지 않는다(shop-chart 도메인 지식).
  if (metric === 'labLcp') return 'neutral';
  const t = THRESHOLDS[metric];
  if (!t) return 'neutral';
  if (value <= t[0]) return 'pass';
  if (value <= t[1]) return 'warn';
  return 'fail';
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w page0127 -- verdict`
Expected: PASS.

- [ ] **Step 5: getQualityDashboard 구현**

```ts
import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type { QualityRecord } from '@repo/quality/types';

export type FieldHistoryRow = {
  period_end: string;
  metric: string;
  p75: number | null;
  good: number | null;
};

export type QualityDashboard = {
  latest: QualityRecord | null;
  fieldHistory: FieldHistoryRow[];
};

export async function getQualityDashboard(): Promise<QualityDashboard> {
  await assertAdmin();
  const supabase = createAdminClient();

  const [latestRes, historyRes] = await Promise.all([
    supabase
      .from('quality_records')
      .select('record')
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('quality_field_history')
      .select('period_end, metric, p75, good')
      .order('period_end', { ascending: true }),
  ]);

  if (latestRes.error)
    console.error('[admin] quality_records 조회 실패:', latestRes.error.message);
  if (historyRes.error)
    console.error('[admin] field_history 조회 실패:', historyRes.error.message);

  return {
    latest: (latestRes.data?.record as QualityRecord) ?? null,
    fieldHistory: (historyRes.data as FieldHistoryRow[]) ?? [],
  };
}
```

> `@repo/quality/types` 서브패스 export가 필요하다. `packages/quality/package.json`에 `"exports": { "./types": "./src/types.ts" }`를 추가한다(Task 1 package.json 수정). page0127 tsconfig가 워크스페이스 소스를 직접 참조하는지 확인 — 안 되면 상대 타입 복제 대신 `paths` 매핑을 추가한다.

- [ ] **Step 6: 커밋**

```bash
git add apps/page0127/src/features/admin-quality/lib apps/page0127/src/features/admin-quality/api packages/quality/package.json
git commit -m "feat(admin-quality): 판정 로직 + 대시보드 조회 api"
```

---

### Task 13: RAG 요약 카드 + 페이지 점수 테이블

**Files:**
- Create: `apps/page0127/src/features/admin-quality/ui/QualitySummary.tsx`
- Create: `apps/page0127/src/features/admin-quality/ui/PageScoreTable.tsx`

**Interfaces:**
- Consumes: `getQualityDashboard` 결과(`QualityRecord`), `verdict`.
- Produces: `<QualitySummary record={...} />`, `<PageScoreTable record={...} />` (서버 컴포넌트, 색은 verdict 기반).

- [ ] **Step 1: QualitySummary 작성** (RAG 칩 = 시그니처. 색이 곧 판정)

```tsx
import { verdict, type Verdict } from '../lib/verdict';
import type { QualityRecord } from '@repo/quality/types';

// 판정 → 클래스. neutral은 회색(랩 LCP 등 "판정 제외").
const CHIP: Record<Verdict, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  fail: 'bg-red-50 text-red-700 ring-red-600/20',
  neutral: 'bg-gray-100 text-gray-500 ring-gray-400/20',
};

function Chip({ v, label }: { v: Verdict; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CHIP[v]}`}
    >
      {label}
    </span>
  );
}

export function QualitySummary({ record }: { record: QualityRecord }) {
  const field = record.field?.mobile;
  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>실사용자 핵심 지표 (모바일)</h2>
      {field ? (
        <div className='flex flex-wrap gap-2'>
          {field.lcp != null && (
            <Chip v={verdict('fieldLcpP75', field.lcp, 'mobile')} label={`LCP ${Math.round(field.lcp)}ms`} />
          )}
          {field.inp != null && (
            <Chip v={verdict('fieldInpP75', field.inp, 'mobile')} label={`INP ${Math.round(field.inp)}ms`} />
          )}
          {field.cls != null && (
            <Chip v={verdict('fieldClsP75', field.cls, 'mobile')} label={`CLS ${field.cls.toFixed(2)}`} />
          )}
        </div>
      ) : (
        <p className='text-sm text-text-faint'>
          아직 실사용자(CrUX) 데이터가 없습니다. 트래픽이 쌓이면 표시됩니다.
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: PageScoreTable 작성** (앵커별 Lighthouse 4점수 + CWV. 랩 LCP 열은 neutral 회색)

```tsx
import type { QualityRecord } from '@repo/quality/types';

export function PageScoreTable({ record }: { record: QualityRecord }) {
  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>페이지별 점수 (모바일)</h2>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='text-text-faint'>
            <tr className='border-b border-line text-left'>
              <th className='py-2 pr-4 font-medium'>페이지</th>
              <th className='py-2 pr-4 font-medium'>성능</th>
              <th className='py-2 pr-4 font-medium'>접근성</th>
              <th className='py-2 pr-4 font-medium'>SEO</th>
              <th className='py-2 pr-4 font-medium'>모범사례</th>
              <th className='py-2 pr-4 font-medium'>LCP(랩)</th>
            </tr>
          </thead>
          <tbody>
            {record.pages.map((p) => (
              <tr key={p.name} className='border-b border-line/60'>
                <td className='py-2 pr-4'>{p.name}</td>
                <td className='py-2 pr-4'>{p.lighthouse.performance}</td>
                <td className='py-2 pr-4'>{p.lighthouse.accessibility}</td>
                <td className='py-2 pr-4'>{p.lighthouse.seo}</td>
                <td className='py-2 pr-4'>{p.lighthouse.bestPractices}</td>
                {/* 랩 LCP는 판정 제외 → 회색 */}
                <td className='py-2 pr-4 text-text-faint'>{Math.round(p.cwv.lcp)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 타입체크**

Run: `npm run type-check -w page0127`
Expected: 에러 없음. (`text-text-faint`/`border-line`은 기존 토큰. 없으면 `text-[--text-faint]` 등 기존 사용례를 따른다.)

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/src/features/admin-quality/ui/QualitySummary.tsx apps/page0127/src/features/admin-quality/ui/PageScoreTable.tsx
git commit -m "feat(admin-quality): RAG 요약 카드 + 페이지 점수 테이블"
```

---

### Task 14: CrUX 추세 차트 + 회귀 배너 + 리포트

**Files:**
- Create: `apps/page0127/src/features/admin-quality/ui/FieldTrendChart.tsx` (`'use client'`)
- Create: `apps/page0127/src/features/admin-quality/ui/RegressionBanner.tsx`
- Create: `apps/page0127/src/features/admin-quality/ui/QualityReport.tsx`

**Interfaces:**
- Consumes: `FieldHistoryRow[]`, `QualityRecord`(`regressions`), `react-markdown`, `chartInk`(`@/shared/lib/chartStyles`).
- Produces: 3개 표시 컴포넌트.

- [ ] **Step 1: FieldTrendChart** (LCP good 비율 추세, 결측은 선 안 이음)

```tsx
'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartInk } from '@/shared/lib/chartStyles';

import type { FieldHistoryRow } from '../api/getQualityDashboard';

// metric='lcp'의 good 비율(0~1)을 주 단위로. 값 없는 주는 점만(선 안 이음).
export function FieldTrendChart({ rows }: { rows: FieldHistoryRow[] }) {
  const data = rows
    .filter((r) => r.metric === 'lcp')
    .map((r) => ({ week: r.period_end.slice(5), good: r.good }));

  if (data.length === 0) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-faint'>
        CrUX 추세 데이터가 아직 없습니다.
      </p>
    );
  }

  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>LCP 양호(good) 비율 추세</h2>
      <ResponsiveContainer width='100%' height={220}>
        <LineChart data={data}>
          <CartesianGrid stroke={chartInk.grid} strokeDasharray='3 3' />
          <XAxis dataKey='week' tick={{ fill: chartInk.axis, fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fill: chartInk.axis, fontSize: 11 }} />
          <Tooltip />
          <Line
            type='monotone'
            dataKey='good'
            stroke={chartInk.primary}
            connectNulls={false}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
```

- [ ] **Step 2: RegressionBanner**

```tsx
import type { QualityRecord } from '@repo/quality/types';

export function RegressionBanner({ record }: { record: QualityRecord }) {
  const regressions = record.regressions ?? [];
  if (regressions.length === 0) return null;
  return (
    <section className='rounded-lg border border-red-300 bg-red-50 p-4'>
      <h2 className='mb-2 text-sm font-semibold text-red-700'>
        회귀 {regressions.length}건 감지
      </h2>
      <ul className='list-disc space-y-1 pl-5 text-sm text-red-700'>
        {regressions.map((r, i) => (
          <li key={i}>{r.detail}</li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: QualityReport** (`react-markdown` 설치 필요)

Run 먼저: `npm install react-markdown -w page0127`
```tsx
import ReactMarkdown from 'react-markdown';

export function QualityReport({ md }: { md: string | null }) {
  if (!md) return null;
  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>측정 리포트</h2>
      <div className='prose prose-sm max-w-none'>
        <ReactMarkdown>{md}</ReactMarkdown>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 타입체크**

Run: `npm run type-check -w page0127`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/src/features/admin-quality/ui/FieldTrendChart.tsx apps/page0127/src/features/admin-quality/ui/RegressionBanner.tsx apps/page0127/src/features/admin-quality/ui/QualityReport.tsx apps/page0127/package.json package-lock.json
git commit -m "feat(admin-quality): CrUX 추세 차트 + 회귀 배너 + 리포트 렌더"
```

---

### Task 15: `/admin/quality` 라우트 조립

**Files:**
- Create: `apps/page0127/app/(admin)/admin/quality/page.tsx`

**Interfaces:**
- Consumes: `getQualityDashboard`, 5개 UI 컴포넌트.

- [ ] **Step 1: page.tsx 작성** (서버 컴포넌트. `(admin)` 레이아웃이 `assertAdmin` 게이트)

```tsx
import { getQualityDashboard } from '@/features/admin-quality/api/getQualityDashboard';
import { FieldTrendChart } from '@/features/admin-quality/ui/FieldTrendChart';
import { PageScoreTable } from '@/features/admin-quality/ui/PageScoreTable';
import { QualityReport } from '@/features/admin-quality/ui/QualityReport';
import { QualitySummary } from '@/features/admin-quality/ui/QualitySummary';
import { RegressionBanner } from '@/features/admin-quality/ui/RegressionBanner';

export default async function AdminQualityPage() {
  const { latest, fieldHistory } = await getQualityDashboard();

  if (!latest) {
    return (
      <section>
        <h1 className='mb-4 text-base font-semibold'>품질</h1>
        <p className='text-sm text-text-faint'>
          아직 측정 데이터가 없습니다. 품질 워크플로우가 처음 실행되면 표시됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className='space-y-4'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-base font-semibold'>품질</h1>
        <span className='text-xs text-text-faint'>
          측정 {new Date(latest.timestamp).toLocaleString('ko-KR')} · {latest.gitRef}
        </span>
      </div>
      <RegressionBanner record={latest} />
      <QualitySummary record={latest} />
      <PageScoreTable record={latest} />
      <FieldTrendChart rows={fieldHistory} />
      <QualityReport md={latest.analysisComment ?? null} />
    </section>
  );
}
```

- [ ] **Step 2: 빌드/타입체크**

Run: `npm run type-check -w page0127`
Expected: 에러 없음.

- [ ] **Step 3: 로컬 확인** (admin 계정으로 `/admin/quality` 접속 — 측정 데이터가 로컬 Supabase에 있으면 렌더)

Run: `npm run dev -w page0127` → 브라우저에서 `/admin/quality`
Expected: 요약 카드/테이블 렌더(데이터 없으면 "측정 데이터 없음" 안내). 비-admin은 404.

- [ ] **Step 4: 커밋**

```bash
git add "apps/page0127/app/(admin)/admin/quality/page.tsx"
git commit -m "feat(admin-quality): /admin/quality 라우트 조립"
```

---

## Phase 5 — 네비 + GA 골격

### Task 16: AdminNav 링크 + `/admin/analytics` 골격

**Files:**
- Modify: `apps/page0127/src/widgets/admin/ui/AdminNav.tsx`
- Create: `apps/page0127/app/(admin)/admin/analytics/page.tsx`

**Interfaces:**
- Produces: 네비에 "품질"/"유입분석" 링크, GA 골격 페이지(탭 + 플레이스홀더).

- [ ] **Step 1: AdminNav에 링크 2개 추가**

`NAV` 배열에 추가(lucide 아이콘 `Gauge`, `LineChart` import):
```tsx
import { Gauge, ImageIcon, LayoutDashboard, LineChart, Receipt, Users } from 'lucide-react';

const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/quality', label: '품질', icon: Gauge },
  { href: '/admin/analytics', label: '유입분석', icon: LineChart },
  { href: '/admin/costs', label: 'AI 비용', icon: Receipt },
  { href: '/admin/members', label: '회원 관리', icon: Users },
  { href: '/admin/banners', label: '메인 배너', icon: ImageIcon },
];
```

- [ ] **Step 2: `/admin/analytics` 골격 페이지 작성** (데이터 없이 IA만. 다음 라운드에 각 탭 채움)

```tsx
// GA 유입·행동 분석 골격. 데이터 연결은 다음 라운드(베타 트래픽 후).
// 여기서는 정보구조(탭)만 고정한다.
const TABS = [
  { key: 'acquisition', label: '유입', desc: '소스/매체/캠페인' },
  { key: 'geo', label: '국가·지역', desc: '국가별, 시/군/구별' },
  { key: 'search', label: '검색어', desc: 'Search Console 검색어·노출·클릭' },
  { key: 'pages', label: '인기·이탈 페이지', desc: '인기 페이지, 이탈 페이지' },
  { key: 'quality', label: '방문 품질', desc: '기기·브라우저·해상도·OS·성별·연령·요일' },
];

export default function AdminAnalyticsPage() {
  return (
    <section className='space-y-4'>
      <h1 className='text-base font-semibold'>유입분석</h1>
      <p className='text-sm text-text-faint'>
        GA·Search Console 연결은 베타 트래픽이 쌓인 뒤 추가됩니다. 아래는 준비된 분석 영역입니다.
      </p>
      <div className='grid gap-3 sm:grid-cols-2'>
        {TABS.map((t) => (
          <div key={t.key} className='rounded-lg border border-line p-4'>
            <div className='text-sm font-medium'>{t.label}</div>
            <div className='mt-1 text-xs text-text-faint'>{t.desc}</div>
            <div className='mt-3 text-xs text-text-faint'>데이터 연결 예정</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 타입체크 + 네비 확인**

Run: `npm run type-check -w page0127` 그리고 dev 서버에서 `/admin` 좌측 네비에 "품질"/"유입분석" 노출, `/admin/analytics` 골격 렌더 확인.
Expected: 통과, 링크·골격 정상.

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/src/widgets/admin/ui/AdminNav.tsx "apps/page0127/app/(admin)/admin/analytics/page.tsx"
git commit -m "feat(admin): 네비에 품질/유입분석 추가 + GA 골격 페이지"
```

---

## Self-Review

**Spec coverage 확인:**
- §5 `@repo/quality` 포팅 → Task 1~8 ✅ (types/runtime/lighthouse/crux/seo/analyze/build/report/config/store/run)
- §5.2 조정 3곳: store→Supabase(Task 10), config→page0127 앵커(Task 6), report→레코드 저장(Task 5 + run에서 report_md)  ✅
- §6 Supabase 스키마 → Task 9 ✅
- §7 GitHub Actions → Task 11 ✅
- §8 admin/quality 5블록 → Task 12~15 ✅
- §9 admin/analytics 골격 → Task 16 ✅
- §10 앵커/주기/폼팩터 → config(Task 6) + workflow cron(Task 11) ✅
- §11 보안: service_role만 CI/서버, RLS 전면거부+우회 → Task 9 주석 + admin.ts 패턴 ✅

**열린 확인 포인트(구현 중 검증):**
- `@repo/quality/types` 서브패스 export가 page0127 tsconfig에서 해석되는지(Task 12 Step 5) — 안 되면 `paths` 매핑 또는 타입 복제.
- `analyze.test.ts`가 `config.ts`의 `REGRESSION`에 의존하면 Task 4/6 순서 조정.
- `text-text-faint`/`border-line` 토큰명이 실제 globals와 일치하는지(기존 사용례 grep로 확인).
- `report.ts`의 `buildNarrative`가 `publishReport` 제거 후에도 독립 동작하는지(Task 5).

**Placeholder scan:** "데이터 연결 예정"은 GA 골격의 의도된 최종 UI 카피(플레이스홀더 아님). 그 외 TBD/TODO 없음.

**Type consistency:** `QualityRecord`(포팅 원본 타입)를 admin에서 그대로 소비. `verdict` 시그니처(Task 12)와 사용처(Task 13) 일치. `FieldHistoryRow`(Task 12) → 차트(Task 14) 일치. `saveRecord`/`readPriorRecords`/`saveFieldHistoryToDb`(Task 10) → run.ts(Task 10 Step 2) 일치.
