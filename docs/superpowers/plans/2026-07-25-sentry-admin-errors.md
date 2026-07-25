# 어드민 에러 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 환경 Sentry 이슈를 어드민에서 한글로, 우선순위가 분류된 상태로 확인할 수 있게 한다.

**Architecture:** 판정 규칙을 네트워크에 의존하지 않는 순수 함수(`triage`)로 분리하고, Sentry 조회는 Server Component에서만 실행해 토큰이 브라우저에 노출되지 않게 한다. 화면은 등급별 섹션으로 나누고 상세 조사는 Sentry permalink로 넘긴다. 기존 `admin-quality` / `admin-costs` feature와 동일한 FSD 배치를 따른다.

**Tech Stack:** Next.js 16 (App Router, Server Component), TypeScript, Vitest, Tailwind, lucide-react

## Global Constraints

- **Server Component 전용.** 이 기능에는 `'use client'`를 쓰지 않는다. 상태·이벤트 핸들러가 필요 없다.
- **토큰 환경변수는 `SENTRY_ISSUES_TOKEN`.** `NEXT_PUBLIC_` 접두사를 붙이면 브라우저로 노출되므로 절대 금지.
- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 넣지 않는다** (CLAUDE.md 규칙).
- 운영 environment 이름은 `production`이 아니라 **`vercel-production`**.
- Sentry API의 `statsPeriod`은 `''`, `'24h'`, `'14d'`만 허용한다. 다른 값은 HTTP 400.
- Sentry 응답의 `count`는 **문자열**이다 (`"2"`). 숫자로 쓰려면 변환한다.
- 테스트 파일은 `*.test.ts` (vitest). `e2e/*.spec.ts`는 Playwright 몫이라 건드리지 않는다.
- 주석은 한국어로, **학습 포인트에만** 단다. 보일러플레이트에는 달지 않는다.
- 작업 디렉터리는 워크트리 루트. 모든 경로는 `apps/page0127/` 기준이다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `apps/page0127/src/features/admin-errors/lib/triage.ts` | 타입 정의 + 판정 규칙 (순수 함수, 네트워크 없음) |
| `apps/page0127/src/features/admin-errors/lib/triage.test.ts` | 판정 규칙 검증 |
| `apps/page0127/src/features/admin-errors/api/getSentryIssues.ts` | Sentry 조회 + 실패 분류 + 등급 부여 |
| `apps/page0127/src/features/admin-errors/api/getSentryIssues.test.ts` | 실패 분류 함수 검증 |
| `apps/page0127/src/features/admin-errors/ui/ErrorCard.tsx` | 이슈 카드 한 장 |
| `apps/page0127/src/features/admin-errors/ui/ErrorList.tsx` | 등급별 섹션 + 실패 안내 |
| `apps/page0127/app/(admin)/admin/errors/page.tsx` | 라우트 조립 |
| `apps/page0127/src/widgets/admin/ui/AdminNav.tsx` | "에러" 메뉴 추가 (수정) |
| `apps/page0127/.env.example` | `SENTRY_ISSUES_TOKEN` 항목 추가 (수정) |
| `apps/page0127/docs/sentry-guide.md` | 운영 가이드 |

---

### Task 1: 판정 규칙 (triage)

**Files:**
- Create: `apps/page0127/src/features/admin-errors/lib/triage.ts`
- Test: `apps/page0127/src/features/admin-errors/lib/triage.test.ts`

**Interfaces:**
- Consumes: 없음 (이 기능의 최하위 모듈)
- Produces:
  - `type SentryIssue` — `{ id: string; shortId: string; title: string; culprit: string | null; level: string; count: string; firstSeen: string; lastSeen: string; permalink: string; metadata?: { type?: string; value?: string } }`
  - `type Grade = 'urgent' | 'watch' | 'quiet' | 'log' | 'noise'`
  - `type TriagedIssue = SentryIssue & { grade: Grade }`
  - `const triage: (issue: SentryIssue, now: Date) => Grade`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

Create `apps/page0127/src/features/admin-errors/lib/triage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { triage, type SentryIssue } from './triage';

// 실측 이슈(2026-07-23 발생)를 기준으로 삼는다. 필드는 판정에 쓰는 것만 채운다.
const issue = (over: Partial<SentryIssue> = {}): SentryIssue => ({
  id: '7628533891',
  shortId: 'PAGE0127-7',
  title: "TypeError: Cannot read properties of null (reading 'id')",
  culprit: 'GET /dashboard',
  level: 'error',
  count: '1',
  firstSeen: '2026-07-23T08:45:41.688000Z',
  lastSeen: '2026-07-23T08:45:41.688000Z',
  permalink: 'https://stronger.sentry.io/issues/7628533891/',
  metadata: { type: 'TypeError', value: "Cannot read properties of null (reading 'id')" },
  ...over,
});

const at = (iso: string) => new Date(iso);

describe('triage', () => {
  it('2일 전 1회 발생한 실측 이슈는 지켜보기', () => {
    expect(triage(issue(), at('2026-07-25T00:00:00Z'))).toBe('watch');
  });

  it('같은 이슈도 11일 뒤 기준으로 보면 잠잠해짐', () => {
    expect(triage(issue(), at('2026-08-05T00:00:00Z'))).toBe('quiet');
  });

  it('12시간 전에 발생했으면 긴급', () => {
    expect(
      triage(issue({ lastSeen: '2026-07-24T12:00:00Z' }), at('2026-07-25T00:00:00Z'))
    ).toBe('urgent');
  });

  it('3일 이상 이어지고 있으면 긴급', () => {
    expect(
      triage(
        issue({ firstSeen: '2026-07-20T00:00:00Z', lastSeen: '2026-07-23T12:00:00Z' }),
        at('2026-07-25T00:00:00Z')
      )
    ).toBe('urgent');
  });

  it('fatal은 긴급', () => {
    expect(triage(issue({ level: 'fatal' }), at('2026-07-25T00:00:00Z'))).toBe('urgent');
  });

  it.each([
    'ResizeObserver loop completed with undelivered notifications.',
    'AbortError: The user aborted a request.',
    'Error at chrome-extension://abcdef/inject.js',
    'NEXT_REDIRECT',
    'Non-Error promise rejection captured with value: undefined',
  ])('노이즈 패턴은 무시: %s', (value) => {
    expect(triage(issue({ metadata: { value } }), at('2026-07-25T00:00:00Z'))).toBe('noise');
  });

  it('하이드레이션 불일치는 진짜 버그라 노이즈로 묻지 않는다', () => {
    const value = 'Text content does not match server-rendered HTML. ResizeObserver loop';
    expect(triage(issue({ metadata: { value } }), at('2026-07-25T00:00:00Z'))).not.toBe('noise');
  });

  it('한글이 섞인 메시지는 우리가 남긴 로그', () => {
    expect(
      triage(issue({ metadata: { value: '도서 검색 실패: timeout' } }), at('2026-07-25T00:00:00Z'))
    ).toBe('log');
  });

  it('영어뿐인 크래시는 로그로 분류하지 않는다', () => {
    expect(triage(issue(), at('2026-07-25T00:00:00Z'))).not.toBe('log');
  });

  it('metadata.value가 없으면 title로 판정한다', () => {
    expect(
      triage(
        issue({ title: 'Error: 프로필 저장 실패', metadata: undefined }),
        at('2026-07-25T00:00:00Z')
      )
    ).toBe('log');
  });
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run:
```bash
cd apps/page0127 && npx vitest run src/features/admin-errors/lib/triage.test.ts
```
Expected: FAIL — `Failed to resolve import "./triage"`

- [ ] **Step 3: 최소 구현을 작성한다**

Create `apps/page0127/src/features/admin-errors/lib/triage.ts`:

```ts
// Sentry 이슈 목록 API 응답에서 판정에 쓰는 필드만 추린 타입.
// 실제 응답에는 필드가 훨씬 많지만, 쓰는 것만 선언해 결합을 줄인다.
export type SentryIssue = {
  id: string;
  shortId: string;
  title: string;
  culprit: string | null;
  level: string;
  // Sentry는 발생 횟수를 문자열로 준다("2"). 숫자로 쓸 땐 변환이 필요하다.
  count: string;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  metadata?: { type?: string; value?: string };
};

export type Grade = 'urgent' | 'watch' | 'quiet' | 'log' | 'noise';

export type TriagedIssue = SentryIssue & { grade: Grade };

// 사용자 체감 피해가 없거나 우리 코드 밖에서 나는 것들.
const NOISE_PATTERNS = [
  /ResizeObserver loop/i,
  /AbortError/i,
  /aborted a request/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /NEXT_REDIRECT/,
  /NEXT_NOT_FOUND/,
  /Non-Error promise rejection captured/i,
];

// 하이드레이션 불일치는 화면이 실제로 깨지는 버그다. 다른 노이즈 문구가
// 섞여 있더라도 절대 묻으면 안 되므로 먼저 걸러낸다.
const NEVER_NOISE = /Text content does not match/i;

// 이 프로젝트의 console.error 메시지는 대부분 한글이고(95곳 중 84곳),
// 런타임·라이브러리가 내는 진짜 크래시 메시지는 전부 영어다.
// 그래서 한글 포함 여부가 "우리가 남긴 로그"의 판별식이 된다.
const HANGUL = /[가-힣]/;

const DAY_MS = 24 * 60 * 60 * 1000;

const messageOf = (issue: SentryIssue) => issue.metadata?.value ?? issue.title;

/**
 * 이슈 하나에 등급을 매긴다. 위에서부터 순서대로 평가하고 처음 걸린 등급으로 확정한다.
 *
 * environment 필터(vercel-production)는 조회 URL에서 이미 처리되므로 여기서는 다루지 않는다.
 * 현재 시각을 인자로 받는 이유는 테스트에서 기준 시각을 고정하기 위해서다.
 */
export const triage = (issue: SentryIssue, now: Date): Grade => {
  const message = messageOf(issue);

  if (!NEVER_NOISE.test(message) && NOISE_PATTERNS.some((p) => p.test(message))) {
    return 'noise';
  }

  if (HANGUL.test(message)) return 'log';

  const firstSeen = new Date(issue.firstSeen).getTime();
  const lastSeen = new Date(issue.lastSeen).getTime();
  const sinceLast = now.getTime() - lastSeen;

  // 일주일 넘게 조용하면 이미 고쳤을 가능성이 높다 → Resolve를 재촉한다.
  if (sinceLast > 7 * DAY_MS) return 'quiet';

  if (sinceLast <= DAY_MS) return 'urgent';
  if (lastSeen - firstSeen >= 3 * DAY_MS) return 'urgent';
  if (issue.level === 'fatal') return 'urgent';

  return 'watch';
};
```

- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**

Run:
```bash
cd apps/page0127 && npx vitest run src/features/admin-errors/lib/triage.test.ts
```
Expected: PASS — 13 passed (`it.each` 5건 포함)

- [ ] **Step 5: 커밋한다**

```bash
git add apps/page0127/src/features/admin-errors/lib/
git commit -m "feat(admin-errors): Sentry 이슈 등급 판정 규칙

한글 포함 여부로 로그성을 가른다. console.error 95곳 중 84곳이 한글이고
런타임이 내는 진짜 크래시는 전부 영어라는 실측에 근거한다."
```

---

### Task 2: Sentry 조회

**Files:**
- Create: `apps/page0127/src/features/admin-errors/api/getSentryIssues.ts`
- Test: `apps/page0127/src/features/admin-errors/api/getSentryIssues.test.ts`

**Interfaces:**
- Consumes: Task 1의 `SentryIssue`, `TriagedIssue`, `triage`
- Produces:
  - `type SentryFailure = { kind: 'no-token' } | { kind: 'forbidden' } | { kind: 'error'; status?: number }`
  - `type SentryIssuesResult = { ok: true; issues: TriagedIssue[] } | { ok: false; failure: SentryFailure }`
  - `const classifyFailure: (status: number) => SentryFailure`
  - `async function getSentryIssues(now?: Date): Promise<SentryIssuesResult>`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`getSentryIssues` 자체는 네트워크와 인증에 의존하므로 단위 테스트하지 않는다. 대신 화면 분기를 결정하는 순수 함수 `classifyFailure`만 검증한다.

Create `apps/page0127/src/features/admin-errors/api/getSentryIssues.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { classifyFailure } from './getSentryIssues';

describe('classifyFailure', () => {
  it('401은 권한 문제로 분류한다', () => {
    expect(classifyFailure(401)).toEqual({ kind: 'forbidden' });
  });

  it('403도 권한 문제로 분류한다 (스코프가 모자란 토큰)', () => {
    expect(classifyFailure(403)).toEqual({ kind: 'forbidden' });
  });

  it('그 밖의 상태 코드는 일반 실패로 두고 코드를 보존한다', () => {
    expect(classifyFailure(500)).toEqual({ kind: 'error', status: 500 });
  });
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run:
```bash
cd apps/page0127 && npx vitest run src/features/admin-errors/api/getSentryIssues.test.ts
```
Expected: FAIL — `Failed to resolve import "./getSentryIssues"`

- [ ] **Step 3: 구현을 작성한다**

Create `apps/page0127/src/features/admin-errors/api/getSentryIssues.ts`:

```ts
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { triage, type SentryIssue, type TriagedIssue } from '../lib/triage';

const ORG = 'stronger';
const PROJECT = 'page0127';
// Vercel 연동이 자동으로 붙이는 운영 환경 이름. 'production'으로 조회하면 0건이 나온다.
const ENVIRONMENT = 'vercel-production';

export type SentryFailure =
  | { kind: 'no-token' }
  | { kind: 'forbidden' }
  | { kind: 'error'; status?: number };

export type SentryIssuesResult =
  | { ok: true; issues: TriagedIssue[] }
  | { ok: false; failure: SentryFailure };

export const classifyFailure = (status: number): SentryFailure =>
  status === 401 || status === 403 ? { kind: 'forbidden' } : { kind: 'error', status };

/**
 * 운영 환경의 미해결 이슈를 가져와 등급을 매긴다.
 *
 * 실패해도 예외를 던지지 않는다. Sentry가 죽거나 토큰이 없어도 어드민의 다른
 * 메뉴는 멀쩡해야 하므로, 결과 타입으로 실패를 표현해 화면이 안내를 띄우게 한다.
 */
export async function getSentryIssues(now = new Date()): Promise<SentryIssuesResult> {
  await assertAdmin();

  const token = process.env.SENTRY_ISSUES_TOKEN;
  if (!token) return { ok: false, failure: { kind: 'no-token' } };

  const url = new URL(`https://sentry.io/api/0/projects/${ORG}/${PROJECT}/issues/`);
  url.searchParams.set('query', 'is:unresolved');
  // statsPeriod은 '', '24h', '14d'만 허용된다. 빈 값이 전체 기간이다.
  url.searchParams.set('statsPeriod', '');
  url.searchParams.set('environment', ENVIRONMENT);
  url.searchParams.set('limit', '100');

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // 어드민을 새로고침할 때마다 Sentry를 두드리면 요청 한도에 걸린다.
      next: { revalidate: 300 },
    });

    if (!res.ok) return { ok: false, failure: classifyFailure(res.status) };

    const raw = (await res.json()) as SentryIssue[];
    return { ok: true, issues: raw.map((i) => ({ ...i, grade: triage(i, now) })) };
  } catch {
    console.error('[admin] Sentry 이슈 조회 실패');
    return { ok: false, failure: { kind: 'error' } };
  }
}
```

- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**

Run:
```bash
cd apps/page0127 && npx vitest run src/features/admin-errors/
```
Expected: PASS — 2개 파일, 16 passed

- [ ] **Step 5: 커밋한다**

```bash
git add apps/page0127/src/features/admin-errors/api/
git commit -m "feat(admin-errors): Sentry 이슈 조회 + 실패 분류

실패를 예외 대신 결과 타입으로 표현해 Sentry 장애가 어드민 전체를
막지 않게 한다. 응답은 5분 캐시한다."
```

---

### Task 3: 화면 컴포넌트

**Files:**
- Create: `apps/page0127/src/features/admin-errors/ui/ErrorCard.tsx`
- Create: `apps/page0127/src/features/admin-errors/ui/ErrorList.tsx`

**Interfaces:**
- Consumes: Task 1의 `TriagedIssue`, `Grade` / Task 2의 `SentryIssuesResult`, `SentryFailure`
- Produces:
  - `const ErrorCard: ({ issue, now }: { issue: TriagedIssue; now: Date }) => JSX.Element`
  - `const ErrorList: ({ result, now }: { result: SentryIssuesResult; now: Date }) => JSX.Element`

두 컴포넌트 모두 `now`를 받는다. "2일 전" 같은 상대 시각을 렌더 시점이 아니라 **조회 시점 기준**으로 계산해야 판정 등급과 표시가 어긋나지 않기 때문이다. Task 4의 페이지가 `now`를 하나 만들어 조회와 화면 양쪽에 넘긴다.

기존 어드민 UI와 동일하게 Server Component이며 테스트는 두지 않는다 (`admin-quality/ui`도 같다).

- [ ] **Step 1: ErrorCard를 작성한다**

Create `apps/page0127/src/features/admin-errors/ui/ErrorCard.tsx`:

```tsx
import type { Grade, TriagedIssue } from '../lib/triage';

const TONE: Record<Grade, string> = {
  urgent: 'border-red-300 bg-red-50',
  watch: 'border-amber-300 bg-amber-50',
  quiet: 'border-line',
  log: 'border-line',
  noise: 'border-line',
};

// 마지막 발생을 "2일 전"처럼 읽기 쉽게 바꾼다.
const sinceLabel = (lastSeen: string, now: Date) => {
  const diff = now.getTime() - new Date(lastSeen).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

export const ErrorCard = ({ issue, now }: { issue: TriagedIssue; now: Date }) => (
  <li className={`rounded-lg border p-4 ${TONE[issue.grade]}`}>
    <div className='text-sm font-medium'>{issue.metadata?.type ?? '오류'}</div>
    <p className='mt-1 line-clamp-2 text-sm text-text-faint'>
      {issue.metadata?.value ?? issue.title}
    </p>
    <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-faint'>
      <span>{issue.culprit ?? '위치 불명'}</span>
      <span>{issue.count}회</span>
      <span>{sinceLabel(issue.lastSeen, now)}</span>
      <span>{issue.shortId}</span>
      <a href={issue.permalink} target='_blank' rel='noreferrer' className='underline'>
        Sentry에서 보기
      </a>
    </div>
  </li>
);
```

- [ ] **Step 2: ErrorList를 작성한다**

Create `apps/page0127/src/features/admin-errors/ui/ErrorList.tsx`:

```tsx
import type { SentryFailure, SentryIssuesResult } from '../api/getSentryIssues';
import type { Grade } from '../lib/triage';

import { ErrorCard } from './ErrorCard';

const TOKEN_DOC = 'https://sentry.io/settings/account/api/auth-tokens/';

const FAILURE_TEXT: Record<SentryFailure['kind'], string> = {
  'no-token': 'Sentry 토큰이 설정되지 않았습니다. SENTRY_ISSUES_TOKEN을 등록해주세요.',
  forbidden: '토큰 권한이 모자랍니다. event:read와 project:read가 필요합니다.',
  error: 'Sentry 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
};

// 화면에 보여줄 순서와 제목. noise는 마지막에 접어둔다.
const SECTIONS: { grade: Grade; title: string; hint: string }[] = [
  { grade: 'urgent', title: '🔴 지금 고치세요', hint: '최근 발생했거나 계속 이어지는 오류' },
  { grade: 'watch', title: '🟡 지켜보세요', hint: '드물게 발생 중' },
  { grade: 'quiet', title: '🟡 잠잠해짐', hint: '7일 넘게 조용합니다. 고쳤다면 Sentry에서 Resolve 하세요' },
  { grade: 'log', title: '⚪ 로그성', hint: 'console.error로 남긴 기록. 크래시가 아닙니다' },
  { grade: 'noise', title: '🚫 무시해도 되는 것', hint: '브라우저 잡음·확장 프로그램·정상 제어 흐름' },
];

export const ErrorList = ({ result, now }: { result: SentryIssuesResult; now: Date }) => {
  if (!result.ok) {
    return (
      <div className='rounded-lg border border-line p-4 text-sm'>
        <p>{FAILURE_TEXT[result.failure.kind]}</p>
        {result.failure.kind === 'no-token' && (
          <a href={TOKEN_DOC} target='_blank' rel='noreferrer' className='mt-2 inline-block underline'>
            토큰 발급하러 가기
          </a>
        )}
      </div>
    );
  }

  if (result.issues.length === 0) {
    return (
      <p className='text-sm text-text-faint'>운영 환경에 확인할 오류가 없습니다.</p>
    );
  }

  return (
    <div className='space-y-6'>
      {SECTIONS.map(({ grade, title, hint }) => {
        const items = result.issues.filter((i) => i.grade === grade);
        if (items.length === 0) return null;

        const body = (
          <ul className='mt-2 space-y-2'>
            {items.map((issue) => (
              <ErrorCard key={issue.id} issue={issue} now={now} />
            ))}
          </ul>
        );

        // 로그성·노이즈는 평소에 시야를 가리지 않도록 접어둔다.
        if (grade === 'log' || grade === 'noise') {
          return (
            <details key={grade}>
              <summary className='cursor-pointer text-sm font-semibold'>
                {title} ({items.length})
              </summary>
              <p className='mt-1 text-xs text-text-faint'>{hint}</p>
              {body}
            </details>
          );
        }

        return (
          <section key={grade}>
            <h2 className='text-sm font-semibold'>
              {title} ({items.length})
            </h2>
            <p className='mt-1 text-xs text-text-faint'>{hint}</p>
            {body}
          </section>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 3: 타입 검사를 통과하는지 확인한다**

Run:
```bash
cd apps/page0127 && npm run type-check
```
Expected: 오류 없이 종료 (exit 0)

- [ ] **Step 4: 커밋한다**

```bash
git add apps/page0127/src/features/admin-errors/ui/
git commit -m "feat(admin-errors): 등급별 이슈 목록 UI

로그성·노이즈는 details로 접어 기본 시야에서 뺀다."
```

---

### Task 4: 라우트 조립과 메뉴 연결

**Files:**
- Create: `apps/page0127/app/(admin)/admin/errors/page.tsx`
- Modify: `apps/page0127/src/widgets/admin/ui/AdminNav.tsx`
- Modify: `apps/page0127/.env.example`

**Interfaces:**
- Consumes: Task 2의 `getSentryIssues`, Task 3의 `ErrorList`
- Produces: `/admin/errors` 라우트

- [ ] **Step 1: 페이지를 작성한다**

Create `apps/page0127/app/(admin)/admin/errors/page.tsx`:

```tsx
import { getSentryIssues } from '@/features/admin-errors/api/getSentryIssues';
import { ErrorList } from '@/features/admin-errors/ui/ErrorList';

export default async function AdminErrorsPage() {
  // 조회와 화면이 같은 기준 시각을 쓰도록 한 번만 만들어 넘긴다.
  const now = new Date();
  const result = await getSentryIssues(now);

  return (
    <section className='space-y-4'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-base font-semibold'>에러</h1>
        <span className='text-xs text-text-faint'>운영 환경(vercel-production) · 5분 캐시</span>
      </div>
      <ErrorList result={result} now={now} />
    </section>
  );
}
```

- [ ] **Step 2: 네비게이션에 항목을 추가한다**

Modify `apps/page0127/src/widgets/admin/ui/AdminNav.tsx` — import에 `Bug`를 추가하고 `NAV` 배열에 한 줄 넣는다.

import 블록 (알파벳 순서를 지킨다):
```tsx
import {
  Bug,
  Gauge,
  ImageIcon,
  LayoutDashboard,
  LineChart,
  Receipt,
  Users,
} from 'lucide-react';
```

NAV 배열 — `품질` 다음에 넣는다:
```tsx
const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/quality', label: '품질', icon: Gauge },
  { href: '/admin/errors', label: '에러', icon: Bug },
  { href: '/admin/analytics', label: '유입분석', icon: LineChart },
  { href: '/admin/costs', label: 'AI 비용', icon: Receipt },
  { href: '/admin/members', label: '회원 관리', icon: Users },
  { href: '/admin/banners', label: '메인 배너', icon: ImageIcon },
];
```

- [ ] **Step 3: .env.example에 항목을 추가한다**

Modify `apps/page0127/.env.example` — `SENTRY_AUTH_TOKEN=` 바로 아래에 추가한다:

```
# 어드민 에러 탭이 이슈를 읽는 데 쓰는 개인 토큰(sntryu_로 시작).
# 스코프는 event:read, project:read 두 개만. 소스맵용 SENTRY_AUTH_TOKEN과는 별개다.
# 발급: https://sentry.io/settings/account/api/auth-tokens/
SENTRY_ISSUES_TOKEN=
```

- [ ] **Step 4: 린트와 타입 검사를 돌린다**

Run:
```bash
cd apps/page0127 && npm run lint && npm run type-check
```
Expected: 둘 다 오류 없이 종료

- [ ] **Step 5: 개발 서버로 실제 화면을 확인한다**

Run:
```bash
cd apps/page0127 && npm run dev
```

브라우저에서 `http://localhost:3000/admin/errors` 접속. 확인할 것:

- 좌측 메뉴에 "에러"가 보이고 클릭하면 이동한다
- `🟡 지켜보세요` 섹션에 `TypeError · GET /dashboard · 1회` 카드가 뜬다 (실측 유일 미해결 건)
- "Sentry에서 보기"가 `https://stronger.sentry.io/issues/7628533891/`로 열린다
- `.env.local`에서 `SENTRY_ISSUES_TOKEN`을 잠시 주석 처리하면 토큰 안내와 발급 링크가 뜬다 (확인 후 되돌린다)

확인이 끝나면 `Ctrl+C`로 서버를 끈다.

- [ ] **Step 6: 커밋한다**

```bash
git add apps/page0127/app/\(admin\)/admin/errors/ apps/page0127/src/widgets/admin/ui/AdminNav.tsx apps/page0127/.env.example
git commit -m "feat(admin-errors): /admin/errors 라우트 + 네비 연결

SENTRY_ISSUES_TOKEN을 .env.example에 문서화한다."
```

---

### Task 5: 운영 가이드 문서

**Files:**
- Create: `apps/page0127/docs/sentry-guide.md`

**Interfaces:**
- Consumes: Task 1의 판정 규칙 (문서와 코드가 같은 기준을 설명해야 한다)
- Produces: 없음 (문서)

- [ ] **Step 1: 가이드를 작성한다**

Create `apps/page0127/docs/sentry-guide.md`:

````markdown
# Sentry 운영 가이드

## 1. Sentry가 하는 일

사이트에서 에러가 터지면 사용자가 알려주지 않아도 자동으로 기록해두는 서비스다. 언제·어디서·어떤 코드에서 터졌는지가 남는다.

## 2. ⚠️ 환경 필터는 `vercel-production`

**가장 먼저 확인할 것.** Sentry 화면 상단 환경 필터에서 `production`을 고르면 **0건**이 나온다. 그런 이름의 환경이 없기 때문이다.

```
development         로컬 개발 서버(npm run dev)에서 난 것 — 볼 필요 없음
vercel-production   진짜 운영 ★ 이것을 골라야 한다
```

Vercel 연동이 자동으로 붙인 이름이다.

## 3. 화면 용어

| 영어 | 뜻 |
|---|---|
| Issue | 같은 종류의 에러를 묶은 그룹. 목록에서 보는 단위 |
| Event | 실제 발생 1건. "32 events" = 32번 터짐 |
| Stack trace | 에러까지 거쳐온 함수 호출 경로. 파일명·줄번호가 여기 있다 |
| Breadcrumbs | 에러 직전의 클릭·이동·네트워크 기록. 재현할 때 쓴다 |
| Culprit | 이슈 제목 아래 회색 글씨. 대략적인 발생 위치 |
| Level | 심각도. fatal > error > warning > info |
| Unresolved | 미해결. 기본 필터 |
| Resolve | 고쳤다고 표시. 다시 터지면 Regression(재발)으로 올라온다 |
| Unhandled | 코드가 잡지 못하고 터져나간 에러. 대개 더 심각하다 |

## 4. 판정 규칙

어드민 `/admin/errors`가 자동으로 매기는 등급이다. 위에서부터 순서대로 평가한다.

| 순서 | 조건 | 등급 |
|---|---|---|
| 1 | 환경이 `vercel-production`이 아님 | 목록에서 제외 |
| 2 | 노이즈 패턴 매칭 | 🚫 무시 |
| 3 | 메시지에 한글 포함 | ⚪ 로그성 |
| 4 | 마지막 발생이 7일 이전 | 🟡 잠잠해짐 |
| 5 | 24시간 내 발생 / 3일 이상 지속 / fatal | 🔴 지금 고치세요 |
| 6 | 나머지 | 🟡 지켜보세요 |

### 3번이 한글로 판정하는 이유

이 프로젝트의 `console.error` 95곳 중 84곳이 한글 메시지다(`도서 검색 실패:` 등). 반면 런타임과 라이브러리가 내는 진짜 크래시 메시지는 전부 영어다. 그래서 한글 포함 여부가 "우리가 의도적으로 남긴 로그"의 판별식이 된다.

> **관례:** 로그 메시지는 한글로 쓴다. 영어로 쓰기 시작하면 이 규칙이 무너져 진짜 크래시와 섞인다.

### 4번이 필요한 이유

고쳐놓고 Sentry에서 Resolve를 안 누르면 목록에 계속 남는다. 실제로 2026-07-23의 `/settings` 두 건이 그랬다. 이 등급은 화면이 대신 정리를 재촉하게 한다.

## 5. 스택 트레이스에서 우리 코드 찾기

대부분의 프레임은 라이브러리 내부라 볼 필요가 없다. 이렇게 읽는다.

1. Sentry가 강조 표시한 **In App** 프레임을 먼저 본다
2. 경로가 `app:///_next/...`면 우리 앱 코드다. 소스맵이 올라가 있으면 원본 파일명(`src/features/...`)까지 보인다
3. `node:internal/...`이나 `node_modules/...`는 건너뛴다

## 6. 이 프로젝트 특유의 함정

**(1) 서버의 `console.error`가 전부 이슈가 된다**

`sentry.server.config.ts`의 `captureConsoleIntegration({ levels: ['error'] })` 때문이다. 크래시가 아닌 로그도 이슈로 접수되므로, 목록에서 ⚪ 로그성이 많이 보이는 건 정상이다.

**(2) 영향 사용자 수를 믿을 수 없다**

`dataCollection.userInfo: false`로 개인정보를 수집하지 않는다. 그래서 `userCount`가 대부분 0이다. **의도된 설정이므로 바꾸지 않는다.** 우선순위는 발생 횟수와 지속 일수로 판단한다.

**(3) 로컬 개발 에러가 섞여 들어온다**

`npm run dev` 중 난 에러도 Sentry로 간다. 2026-07-25 기준 전체 9건 중 6건이 이것이었다. 환경 필터로 걸러 보면 되지만, 전송 자체를 막는 것이 근본 해결이다(후속 작업).

## 7. 주간 5분 점검

```
1. /admin/errors 접속
2. 🔴 지금 고치세요 → 있으면 그 주에 처리
3. 🟡 잠잠해짐 → Sentry에서 Resolve 눌러 정리
4. ⚪ / 🚫 → 평소엔 펼치지 않는다
```
````

- [ ] **Step 2: 전체 테스트를 돌려 회귀가 없는지 확인한다**

Run:
```bash
cd apps/page0127 && npm test
```
Expected: 모든 테스트 PASS (기존 테스트 포함)

- [ ] **Step 3: 커밋한다**

```bash
git add apps/page0127/docs/sentry-guide.md
git commit -m "docs(sentry): 운영 가이드

환경 필터가 vercel-production이라는 점과 한글 판정 규칙의 근거를 남긴다."
```

---

## Self-Review

**1. 스펙 커버리지**

| 스펙 항목 | 담당 Task |
|---|---|
| 판정 규칙 2~6번 | Task 1 |
| 1번 규칙(environment 필터) | Task 2 — 조회 URL 파라미터 |
| API 제약(statsPeriod, 환경명) | Task 2 |
| 토큰·환경변수 | Task 2, Task 4 |
| 5분 캐시 | Task 2 |
| 실패 처리 4종 | Task 2(분류) + Task 3(문구) |
| 테스트 항목 전체 | Task 1, Task 2 |
| 파일 구조 | Task 1~4 |
| 운영 가이드 목차 7절 | Task 5 |

누락 없음. 스펙의 "후속 작업" 3건은 의도적으로 범위 밖이다.

**2. 플레이스홀더 스캔**

TBD·TODO·"적절히 처리" 없음. 모든 코드 단계에 실제 코드가 들어 있다.

**3. 타입 일관성**

- `SentryIssue`, `Grade`, `TriagedIssue` — Task 1에서 정의, Task 2·3에서 동일 이름으로 사용
- `triage(issue, now)` — Task 1 정의, Task 2에서 동일 시그니처로 호출
- `classifyFailure(status)` — Task 2에서 정의·테스트
- `ErrorCard`/`ErrorList`는 둘 다 `now: Date`를 받는다. Task 4의 페이지가 하나의 `now`를 만들어 양쪽에 넘기므로 일치한다
- `count`는 전 구간 `string`으로 다룬다. Task 3에서 `{issue.count}회`로 그대로 출력하므로 변환이 필요 없다
