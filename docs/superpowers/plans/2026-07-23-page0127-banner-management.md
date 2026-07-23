# page0127 메인 배너 관리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하드코딩된 히어로 배너 슬라이드를 `hero_slides` DB 테이블로 옮기고, admin(`/admin/banners`)에서 추가·수정·삭제·드래그 순서변경·켜기끄기 할 수 있게 한다.

**Architecture:** 공개 랜딩은 `entities/banner`의 `getActiveHeroSlides()`로 켜진 슬라이드를 순서대로 읽되 DB가 비면 코드 상수(`HERO_SLIDES`)로 폴백. admin CRUD는 `features/admin-banners`의 서버액션(assertAdmin + createAdminClient)으로 처리하고 UI는 dnd-kit 드래그 정렬 카드 목록. `HeroSlide` 타입은 FSD 규칙에 맞춰 `entities/banner`로 내린다(widget·feature 양쪽이 import 가능하도록).

**Tech Stack:** Next.js 16 App Router, FSD, Supabase, Tailwind v4, vitest(순수 매퍼), dnd-kit(드래그 정렬).

## Global Constraints

- 패키지 매니저 **npm**(workspaces). 설치는 `--workspace=apps/page0127`.
- 작업은 **격리된 worktree** `/Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/banner`, 브랜치 `feat/banner-management`. 모든 명령·git을 이 경로에서.
- 커밋: 새 파일은 `git add <파일>` 후 `git commit -o <파일들>`. `git add -A`/`.`·amend·bare-commit 금지.
- **eslint는 반드시 앱 폴더에서**: `cd apps/page0127 && npx eslint <파일> --fix` 후 0에러 확인(루트 실행은 설정 못 읽어 헛통과). 정렬 후 `npx prettier --write` 필요 시.
- 마이그레이션 파일명 `20260723000006_create_hero_slides.sql`(기존 최신 000005 다음). **적용은 사용자 수동 단계** — 구현자는 `supabase db push` 등 실행 금지, 파일만 생성.
- RLS: `hero_slides`는 **공개 읽기(is_active=true)** 정책 + 쓰기 정책 없음(admin은 createAdminClient로 우회).
- 공개 읽기는 결과 0개면 `HERO_SLIDES` 상수로 폴백.
- 디자인: 그림자 없음(1px `border-line`), 이모지 없음(필요 시 lucide 단색), 실제 프로젝트 Tailwind 클래스만(`border-line`·`text-text-subtle`·`bg-accent`·`text-destructive` 등, `var(--…)` 금지), 빈 상태 문구.
- `'use client'`는 상호작용 컴포넌트(SlideCard·BannerManager)만.
- 검증(하이브리드): 순수 매퍼는 vitest, 나머지는 type-check + 앱-폴더 lint + 개발서버 수동.

---

## 파일 구조 (생성/수정)

```
supabase/migrations/20260723000006_create_hero_slides.sql        (생성)

src/entities/banner/
  ├─ types.ts               (생성) HeroSlide(이동) + HeroSlideRow
  ├─ lib/mapSlides.ts       (생성) rowToHeroSlide, slidesOrFallback (순수)
  ├─ lib/mapSlides.test.ts  (생성)
  └─ api/getActiveHeroSlides.ts  (생성) 공개 읽기 + 폴백

src/features/admin-banners/
  ├─ api/getAllSlides.ts    (생성) admin 전체 조회
  ├─ api/slideActions.ts    (생성) create/update/delete/toggle/reorder
  └─ ui/
      ├─ SlideCard.tsx      (생성) 'use client' 카드(편집·토글·삭제)
      └─ BannerManager.tsx  (생성) 'use client' dnd-kit 목록 + 추가

app/(admin)/admin/banners/page.tsx                     (생성)

수정:
src/widgets/landing/model/heroSlides.ts                # HeroSlide를 entities/banner에서 import
src/widgets/landing/ui/HeroBanner.tsx                  # HeroSlide import 경로 변경
src/widgets/landing/ui/HeroBannerSection.tsx           # HERO_SLIDES → getActiveHeroSlides()
src/widgets/admin/ui/AdminNav.tsx                      # '배너' 링크 추가
apps/page0127/package.json                             # dnd-kit deps
```

---

## Task 1: dnd-kit 설치

**Files:** Modify `apps/page0127/package.json`

- [ ] **Step 1: 설치**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities --workspace=apps/page0127
```

- [ ] **Step 2: 설치 확인**

Run: `npm ls @dnd-kit/core --workspace=apps/page0127`
Expected: 버전 출력, 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/package.json package-lock.json
git commit -o apps/page0127/package.json package-lock.json -m "chore(banner): dnd-kit 설치 — 드래그 순서변경용"
```

---

## Task 2: 마이그레이션 — hero_slides 테이블 + seed + RLS

**Files:** Create `supabase/migrations/20260723000006_create_hero_slides.sql`

**Interfaces:** Produces `hero_slides` 테이블(컬럼은 아래), 공개 읽기 RLS, 현재 4개 슬라이드 seed.

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- 메인 히어로 배너 슬라이드 — admin에서 관리, 랜딩이 공개로 읽음
-- 작성일: 2026-07-23

CREATE TABLE IF NOT EXISTS hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow    text NOT NULL DEFAULT '',
  line1      text NOT NULL,
  line2      text NOT NULL,
  sub        text NOT NULL DEFAULT '',
  href       text NOT NULL,
  cta        text NOT NULL,
  bg         text NOT NULL,
  fg         text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hero_slides_active_order_idx
  ON hero_slides (is_active, sort_order);

-- RLS: 배너는 공개 콘텐츠. 누구나 '켜진' 슬라이드만 읽는다.
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read active slides"
  ON hero_slides FOR SELECT
  USING (is_active = true);
-- 쓰기 정책 없음 → 일반/anon 키로는 불가. admin은 service_role로 관리.

-- 현재 코드의 HERO_SLIDES 4개를 그대로 seed (배포 후에도 랜딩 동일)
INSERT INTO hero_slides (eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order) VALUES
  ('page0127', '책장을 보면,', '그 사람이 보인다',
   '읽은 책을 한 권씩 기록하면, 몰랐던 취향이 보이기 시작합니다.', '/login', '내 책장 만들기', '#14294e', '#f4f8fd', 0),
  ('완독 5권부터', '열 권이면 충분해요', '취향은 이미 쌓였습니다',
   '책장을 찬찬히 읽고, 다음에 읽을 책까지 골라 드립니다.', '/login', '취향 분석 보기', '#1e69cb', '#f4f8fd', 1),
  ('독서 궁합', '두 사람의 책장을', '나란히 놓아볼까요',
   '겹치는 관심사와 서로 다른 결을 찾아, 건네줄 책까지 고릅니다.', '/login', '궁합 분석하기', '#a63d10', '#f4f8fd', 2),
  ('2026년 하반기', '올해 절반이 지났어요', '남은 여섯 달의 목표',
   '연간 목표를 세우고, 달력에 완독의 흔적을 남겨 보세요.', '/login', '목표 세우기', '#31405f', '#f4f8fd', 3);
```

- [ ] **Step 2: 적용 금지 안내** — `supabase db push` 등 실행하지 않는다(사용자 수동 단계). 파일만 생성.

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260723000006_create_hero_slides.sql
git commit -o supabase/migrations/20260723000006_create_hero_slides.sql -m "feat(banner): hero_slides 테이블 + seed + 공개 읽기 RLS"
```

---

## Task 3: entities/banner 타입 + 순수 매퍼 (TDD)

**Files:**
- Create `apps/page0127/src/entities/banner/types.ts`
- Create `apps/page0127/src/entities/banner/lib/mapSlides.ts`
- Create `apps/page0127/src/entities/banner/lib/mapSlides.test.ts`
- Modify `apps/page0127/src/widgets/landing/model/heroSlides.ts`
- Modify `apps/page0127/src/widgets/landing/ui/HeroBanner.tsx`

**Interfaces:**
- Produces: `type HeroSlide`(이동), `type HeroSlideRow`, `rowToHeroSlide(row): HeroSlide`, `slidesOrFallback(rows, fallback): HeroSlide[]`.
- `HeroSlide`는 이제 `@/entities/banner`에서 온다(FSD: widget·feature가 import 가능).

- [ ] **Step 1: 실패 테스트 작성**

`mapSlides.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { rowToHeroSlide, slidesOrFallback } from './mapSlides';
import type { HeroSlideRow } from '../types';
import type { HeroSlide } from '../types';

const row: HeroSlideRow = {
  id: 'uuid-1',
  eyebrow: 'eb',
  line1: 'a',
  line2: 'b',
  sub: 's',
  href: '/x',
  cta: 'go',
  bg: '#000',
  fg: '#fff',
  sort_order: 0,
  is_active: true,
};

describe('rowToHeroSlide', () => {
  it('DB 행을 HeroSlide로 매핑(lines는 [line1,line2])', () => {
    expect(rowToHeroSlide(row)).toEqual({
      id: 'uuid-1',
      eyebrow: 'eb',
      lines: ['a', 'b'],
      sub: 's',
      href: '/x',
      cta: 'go',
      bg: '#000',
      fg: '#fff',
    });
  });
});

describe('slidesOrFallback', () => {
  const fallback: HeroSlide[] = [
    { id: 'f', eyebrow: '', lines: ['f1', 'f2'], sub: '', href: '/', cta: 'c', bg: '#1', fg: '#2' },
  ];
  it('행이 있으면 매핑 결과', () => {
    expect(slidesOrFallback([row], fallback).map((s) => s.id)).toEqual(['uuid-1']);
  });
  it('행이 비면 폴백', () => {
    expect(slidesOrFallback([], fallback)).toBe(fallback);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npm run test --workspace=apps/page0127` → 모듈 없음 FAIL.

- [ ] **Step 3: types.ts 작성** (HeroSlide를 여기로 이동)

`types.ts`:
```ts
/**
 * 히어로 배너 슬라이드 타입 (FSD entity)
 *
 * HeroSlide는 화면 표시용, HeroSlideRow는 DB 행.
 * widget(landing)·feature(admin-banners) 양쪽이 이 entity에서 import한다.
 */
export type HeroSlide = {
  id: string;
  eyebrow: string;
  /** 2줄 메인 카피 */
  lines: [string, string];
  sub: string;
  href: string;
  cta: string;
  /** 배경색 hex (단색) */
  bg: string;
  /** 글자색 hex */
  fg: string;
};

export type HeroSlideRow = {
  id: string;
  eyebrow: string;
  line1: string;
  line2: string;
  sub: string;
  href: string;
  cta: string;
  bg: string;
  fg: string;
  sort_order: number;
  is_active: boolean;
};
```

- [ ] **Step 4: mapSlides.ts 작성**

```ts
import type { HeroSlide, HeroSlideRow } from '../types';

export function rowToHeroSlide(row: HeroSlideRow): HeroSlide {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    lines: [row.line1, row.line2],
    sub: row.sub,
    href: row.href,
    cta: row.cta,
    bg: row.bg,
    fg: row.fg,
  };
}

/** DB 행이 있으면 매핑, 없으면 폴백 상수를 그대로 반환 */
export function slidesOrFallback(
  rows: HeroSlideRow[],
  fallback: HeroSlide[]
): HeroSlide[] {
  if (rows.length === 0) return fallback;
  return rows.map(rowToHeroSlide);
}
```

- [ ] **Step 5: heroSlides.ts 수정 — HeroSlide를 entities/banner에서 import**

`src/widgets/landing/model/heroSlides.ts` 상단의 `export type HeroSlide = {...}` 정의를 삭제하고, 대신 재export:
```ts
import type { HeroSlide } from '@/entities/banner/types';

export type { HeroSlide };

export const HERO_SLIDES: HeroSlide[] = [
  // ... 기존 4개 슬라이드 값 그대로 유지 ...
];
```
(기존 `HERO_SLIDES` 배열 값은 손대지 않는다. 타입 정의만 옮기고 재export.)

- [ ] **Step 6: HeroBanner.tsx import 경로 변경**

`src/widgets/landing/ui/HeroBanner.tsx`에서 `import type { HeroSlide } from '@/widgets/landing/model/heroSlides';` 는 재export 덕에 그대로 동작하지만, 명확히 하려면 `@/entities/banner/types`로 바꿔도 된다. **기존 import가 재export로 여전히 유효하므로 이 파일은 변경 불필요**(재확인만).

- [ ] **Step 7: 테스트·타입체크 통과 확인**

Run: `npm run test --workspace=apps/page0127` → PASS.
Run: `npm run type-check --workspace=apps/page0127` → clean.

- [ ] **Step 8: 앱-폴더 lint**

```bash
cd apps/page0127 && npx eslint src/entities/banner --fix && npx eslint src/entities/banner
```
Expected: 0 errors.

- [ ] **Step 9: 커밋**

```bash
git add apps/page0127/src/entities/banner apps/page0127/src/widgets/landing/model/heroSlides.ts
git commit -o apps/page0127/src/entities/banner/types.ts apps/page0127/src/entities/banner/lib/mapSlides.ts apps/page0127/src/entities/banner/lib/mapSlides.test.ts apps/page0127/src/widgets/landing/model/heroSlides.ts -m "feat(banner): entities/banner 타입·순수 매퍼 + HeroSlide 이동"
```

---

## Task 4: getActiveHeroSlides — 공개 읽기 + 폴백

**Files:** Create `apps/page0127/src/entities/banner/api/getActiveHeroSlides.ts`

**Interfaces:**
- Consumes: `createClient`(`@/shared/config/supabase/server`), `slidesOrFallback`(Task 3), `HERO_SLIDES`(`@/widgets/landing/model/heroSlides`)... **주의: entity가 widget을 import하면 FSD 위반.** 폴백 상수는 매개변수로 주입받는다(호출부인 HeroBannerSection이 HERO_SLIDES를 넘김). 시그니처:
  - `getActiveHeroSlides(fallback: HeroSlide[]): Promise<HeroSlide[]>`

- [ ] **Step 1: 구현 작성**

```ts
import { createClient } from '@/shared/config/supabase/server';

import { slidesOrFallback } from '../lib/mapSlides';
import type { HeroSlide, HeroSlideRow } from '../types';

/**
 * 켜진 배너 슬라이드를 sort_order 순으로 읽는다.
 * 결과가 0개면 호출부가 준 폴백(코드 상수)을 반환해 랜딩이 비지 않게 한다.
 * RLS가 is_active=true만 노출하므로 anon 키로 안전하게 읽는다.
 */
export async function getActiveHeroSlides(
  fallback: HeroSlide[]
): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hero_slides')
    .select(
      'id, eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[banner] 슬라이드 조회 실패:', error.message);
    return fallback;
  }
  return slidesOrFallback((data as HeroSlideRow[]) ?? [], fallback);
}
```

- [ ] **Step 2: 타입체크 + lint**

Run: `npm run type-check --workspace=apps/page0127` → clean.
`cd apps/page0127 && npx eslint src/entities/banner/api/getActiveHeroSlides.ts --fix && npx eslint src/entities/banner/api/getActiveHeroSlides.ts` → 0 errors.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/entities/banner/api/getActiveHeroSlides.ts
git commit -o apps/page0127/src/entities/banner/api/getActiveHeroSlides.ts -m "feat(banner): 공개 읽기 getActiveHeroSlides + 폴백"
```

---

## Task 5: HeroBannerSection을 DB 읽기로 전환

**Files:** Modify `apps/page0127/src/widgets/landing/ui/HeroBannerSection.tsx`

**Interfaces:** Consumes `getActiveHeroSlides`(Task 4), `HERO_SLIDES`(폴백으로 주입).

- [ ] **Step 1: 수정** — `HERO_SLIDES`를 직접 넘기던 것을 `getActiveHeroSlides(HERO_SLIDES)` 결과로 교체

`HeroBannerSection.tsx`:
```tsx
import { getActiveHeroSlides } from '@/entities/banner/api/getActiveHeroSlides';
import { createClient } from '@/shared/config/supabase/server';

import { HERO_SLIDES } from '@/widgets/landing/model/heroSlides';
import { HeroBanner } from '@/widgets/landing/ui/HeroBanner';

type RankingRow = { book_info: { cover_image: string | null } | null };

export const HeroBannerSection = async () => {
  const supabase = await createClient();

  const { data } = await supabase.rpc('get_most_read_books', {
    limit_count: 12,
  });

  const covers = ((data as RankingRow[] | null) ?? [])
    .map((row) => row.book_info?.cover_image)
    .filter((url): url is string => Boolean(url));

  // 켜진 슬라이드를 DB에서, 비면 코드 상수 폴백
  const slides = await getActiveHeroSlides(HERO_SLIDES);

  return <HeroBanner slides={slides} covers={covers} />;
};
```

- [ ] **Step 2: 타입체크 + lint + 빌드 확인**

Run: `npm run type-check --workspace=apps/page0127` → clean.
`cd apps/page0127 && npx eslint src/widgets/landing/ui/HeroBannerSection.tsx --fix && npx eslint src/widgets/landing/ui/HeroBannerSection.tsx` → 0 errors.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/widgets/landing/ui/HeroBannerSection.tsx
git commit -o apps/page0127/src/widgets/landing/ui/HeroBannerSection.tsx -m "feat(banner): 랜딩 배너를 DB 슬라이드로 전환(폴백 유지)"
```

---

## Task 6: admin 전체 조회 getAllSlides

**Files:** Create `apps/page0127/src/features/admin-banners/api/getAllSlides.ts`

**Interfaces:**
- Consumes: `assertAdmin`(`@/shared/lib/admin/assertAdmin`), `createAdminClient`, `HeroSlideRow`(entities/banner).
- Produces: `getAllSlides(): Promise<HeroSlideRow[]>` — 꺼진 것 포함 전체, sort_order 순.

- [ ] **Step 1: 구현**

```ts
import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type { HeroSlideRow } from '@/entities/banner/types';

export async function getAllSlides(): Promise<HeroSlideRow[]> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('hero_slides')
    .select(
      'id, eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order, is_active'
    )
    .order('sort_order', { ascending: true });

  if (error) console.error('[admin] 배너 목록 조회 실패:', error.message);
  return (data as HeroSlideRow[]) ?? [];
}
```

- [ ] **Step 2: 타입체크 + lint** (앱 폴더 기준) → 0 errors.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/features/admin-banners/api/getAllSlides.ts
git commit -o apps/page0127/src/features/admin-banners/api/getAllSlides.ts -m "feat(banner): admin 전체 슬라이드 조회"
```

---

## Task 7: 서버액션 — create/update/delete/toggle/reorder

**Files:** Create `apps/page0127/src/features/admin-banners/api/slideActions.ts`

**Interfaces:** (모두 `'use server'`, 첫 줄 `await assertAdmin()`, `createAdminClient`, 쓰기 에러 시 throw, 후 `revalidatePath('/admin/banners')` + `revalidatePath('/')`)
- `createSlide(): Promise<void>`
- `type SlideFields = { eyebrow: string; line1: string; line2: string; sub: string; href: string; cta: string; bg: string; fg: string }`
- `updateSlide(id: string, fields: SlideFields): Promise<void>`
- `deleteSlide(id: string): Promise<void>`
- `toggleActive(id: string, active: boolean): Promise<void>`
- `reorderSlides(orderedIds: string[]): Promise<void>`

- [ ] **Step 1: 구현**

```ts
'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

export type SlideFields = {
  eyebrow: string;
  line1: string;
  line2: string;
  sub: string;
  href: string;
  cta: string;
  bg: string;
  fg: string;
};

function revalidate() {
  revalidatePath('/admin/banners');
  revalidatePath('/');
}

export async function createSlide(): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();

  // 새 슬라이드는 맨 끝 순서로
  const { data: last } = await supabase
    .from('hero_slides')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('hero_slides').insert({
    eyebrow: '',
    line1: '새 배너',
    line2: '문구를 입력하세요',
    sub: '',
    href: '/login',
    cta: '자세히',
    bg: '#14294e',
    fg: '#f4f8fd',
    sort_order: nextOrder,
    is_active: false, // 기본은 꺼둔 채 생성(편집 후 켜기)
  });
  if (error) throw new Error(`슬라이드 생성 실패: ${error.message}`);
  revalidate();
}

export async function updateSlide(
  id: string,
  fields: SlideFields
): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('hero_slides')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`슬라이드 저장 실패: ${error.message}`);
  revalidate();
}

export async function deleteSlide(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from('hero_slides').delete().eq('id', id);
  if (error) throw new Error(`슬라이드 삭제 실패: ${error.message}`);
  revalidate();
}

export async function toggleActive(
  id: string,
  active: boolean
): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('hero_slides')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`상태 변경 실패: ${error.message}`);
  revalidate();
}

// 배열 인덱스를 각 행의 sort_order로 저장한다.
export async function reorderSlides(orderedIds: string[]): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('hero_slides')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', orderedIds[i]);
    if (error) throw new Error(`순서 저장 실패: ${error.message}`);
  }
  revalidate();
}
```

- [ ] **Step 2: 타입체크 + lint** (앱 폴더) → 0 errors.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/features/admin-banners/api/slideActions.ts
git commit -o apps/page0127/src/features/admin-banners/api/slideActions.ts -m "feat(banner): 슬라이드 CRUD·토글·순서 서버액션"
```

---

## Task 8: SlideCard (client) — 카드 편집·토글·삭제

**Files:** Create `apps/page0127/src/features/admin-banners/ui/SlideCard.tsx`

**Interfaces:**
- Consumes: `updateSlide`·`deleteSlide`·`toggleActive`·`SlideFields`(Task 7), `HeroSlideRow`(entities/banner), `useSortable`(`@dnd-kit/sortable`), `CSS`(`@dnd-kit/utilities`), `GripVertical`(lucide-react).
- Produces: `SlideCard` — 드래그 핸들 + 폼 필드(로컬 상태) + 저장/삭제/토글.

- [ ] **Step 1: 구현**

```tsx
'use client';

import { useState, useTransition } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import {
  deleteSlide,
  toggleActive,
  updateSlide,
  type SlideFields,
} from '@/features/admin-banners/api/slideActions';
import type { HeroSlideRow } from '@/entities/banner/types';

const FIELD_LABELS: { key: keyof SlideFields; label: string }[] = [
  { key: 'eyebrow', label: '라벨' },
  { key: 'line1', label: '1줄' },
  { key: 'line2', label: '2줄' },
  { key: 'sub', label: '서브' },
  { key: 'cta', label: '버튼' },
  { key: 'href', label: '링크' },
];

export const SlideCard = ({ slide }: { slide: HeroSlideRow }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: slide.id });
  const [fields, setFields] = useState<SlideFields>({
    eyebrow: slide.eyebrow,
    line1: slide.line1,
    line2: slide.line2,
    sub: slide.sub,
    href: slide.href,
    cta: slide.cta,
    bg: slide.bg,
    fg: slide.fg,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (k: keyof SlideFields, v: string) =>
    setFields((f) => ({ ...f, [k]: v }));

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
      }
    });
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: fields.bg,
    color: fields.fg,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='rounded border border-line p-4'
    >
      <div className='mb-2 flex items-center justify-between'>
        <button
          {...attributes}
          {...listeners}
          className='cursor-grab'
          aria-label='순서 이동 핸들'
          type='button'
        >
          <GripVertical className='h-4 w-4' aria-hidden />
        </button>
        <label className='flex items-center gap-1 text-xs'>
          <input
            type='checkbox'
            checked={slide.is_active}
            onChange={(e) => run(() => toggleActive(slide.id, e.target.checked))}
            disabled={isPending}
          />
          노출
        </label>
      </div>

      <div className='grid gap-2 sm:grid-cols-2'>
        {FIELD_LABELS.map(({ key, label }) => (
          <label key={key} className='text-xs'>
            {label}
            <input
              value={fields[key]}
              onChange={(e) => set(key, e.target.value)}
              className='mt-0.5 w-full rounded border border-line bg-white px-2 py-1 text-sm text-text-strong'
            />
          </label>
        ))}
        <label className='text-xs'>
          배경색
          <input
            type='color'
            value={fields.bg}
            onChange={(e) => set('bg', e.target.value)}
            className='mt-0.5 block h-8 w-16'
          />
        </label>
        <label className='text-xs'>
          글자색
          <input
            type='color'
            value={fields.fg}
            onChange={(e) => set('fg', e.target.value)}
            className='mt-0.5 block h-8 w-16'
          />
        </label>
      </div>

      <div className='mt-3 flex gap-2'>
        <button
          type='button'
          onClick={() => run(() => updateSlide(slide.id, fields))}
          disabled={isPending}
          className='rounded border border-line bg-white px-3 py-1.5 text-sm text-text-strong hover:bg-accent disabled:opacity-50'
        >
          저장
        </button>
        <button
          type='button'
          onClick={() => {
            if (confirm('이 슬라이드를 삭제할까요?'))
              run(() => deleteSlide(slide.id));
          }}
          disabled={isPending}
          className='rounded border border-line bg-white px-3 py-1.5 text-sm text-destructive hover:bg-accent disabled:opacity-50'
        >
          삭제
        </button>
      </div>
      {error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
    </div>
  );
};
```

> 참고: 카드 배경/글자색을 슬라이드 색으로 칠해 **미니 미리보기** 역할. 입력 필드·버튼은 가독성을 위해 `bg-white text-text-strong`로 둔다.

- [ ] **Step 2: 타입체크 + lint** (앱 폴더) → 0 errors. (dnd-kit·lucide import 정렬 주의)

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/features/admin-banners/ui/SlideCard.tsx
git commit -o apps/page0127/src/features/admin-banners/ui/SlideCard.tsx -m "feat(banner): SlideCard — 카드 편집·색·토글·삭제"
```

---

## Task 9: BannerManager (client) — dnd-kit 목록 + 추가

**Files:** Create `apps/page0127/src/features/admin-banners/ui/BannerManager.tsx`

**Interfaces:**
- Consumes: `SlideCard`(Task 8), `createSlide`·`reorderSlides`(Task 7), `HeroSlideRow`, dnd-kit(`DndContext`,`closestCenter`,`PointerSensor`,`useSensor`,`useSensors` / `SortableContext`,`verticalListSortingStrategy`,`arrayMove`).

- [ ] **Step 1: 구현**

```tsx
'use client';

import { useState, useTransition } from 'react';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { createSlide, reorderSlides } from '@/features/admin-banners/api/slideActions';
import { SlideCard } from '@/features/admin-banners/ui/SlideCard';
import type { HeroSlideRow } from '@/entities/banner/types';

export const BannerManager = ({ initial }: { initial: HeroSlideRow[] }) => {
  const [slides, setSlides] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const next = arrayMove(slides, oldIndex, newIndex);
    setSlides(next); // 낙관적 갱신
    startTransition(() => reorderSlides(next.map((s) => s.id)));
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <button
          type='button'
          onClick={() => startTransition(() => createSlide())}
          disabled={isPending}
          className='rounded border border-line px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50'
        >
          새 슬라이드 추가
        </button>
      </div>

      {slides.length === 0 ? (
        <p className='text-sm text-text-subtle'>
          슬라이드가 없습니다. 없으면 랜딩은 코드 기본 배너로 표시됩니다.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={slides.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className='flex flex-col gap-3'>
              {slides.map((s) => (
                <SlideCard key={s.id} slide={s} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
```

> `createSlide`/삭제 후 서버가 `revalidatePath`로 페이지를 갱신하므로 `initial`이 새로고침된다. 드래그는 낙관적 갱신 + `reorderSlides`로 영속화.

- [ ] **Step 2: 타입체크 + lint** (앱 폴더) → 0 errors.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/features/admin-banners/ui/BannerManager.tsx
git commit -o apps/page0127/src/features/admin-banners/ui/BannerManager.tsx -m "feat(banner): BannerManager — dnd-kit 순서변경 + 추가"
```

---

## Task 10: /admin/banners 페이지 + admin nav 링크

**Files:**
- Create `apps/page0127/app/(admin)/admin/banners/page.tsx`
- Modify `apps/page0127/src/widgets/admin/ui/AdminNav.tsx`

**Interfaces:** Consumes `getAllSlides`(Task 6), `BannerManager`(Task 9).

- [ ] **Step 1: 페이지 작성**

`app/(admin)/admin/banners/page.tsx`:
```tsx
import { getAllSlides } from '@/features/admin-banners/api/getAllSlides';
import { BannerManager } from '@/features/admin-banners/ui/BannerManager';

export default async function AdminBannersPage() {
  const slides = await getAllSlides();
  return (
    <section>
      <h1 className='mb-4 text-base font-semibold'>메인 배너</h1>
      <BannerManager initial={slides} />
    </section>
  );
}
```

- [ ] **Step 2: AdminNav에 배너 링크 추가**

`src/widgets/admin/ui/AdminNav.tsx`의 `NAV` 배열에 항목 추가(lucide 아이콘, 예: `Image` 또는 `LayoutTemplate`):
```tsx
import { Image, LayoutDashboard, Receipt, Users } from 'lucide-react';
// ...
const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/costs', label: 'AI 비용', icon: Receipt },
  { href: '/admin/members', label: '회원 관리', icon: Users },
  { href: '/admin/banners', label: '메인 배너', icon: Image },
];
```
(기존 항목·아이콘 배열 형태를 그대로 따르고, 실제 컴포넌트의 현재 구조에 맞춰 항목만 추가.)

- [ ] **Step 3: 타입체크 + lint + 빌드 확인**

Run: `npm run type-check --workspace=apps/page0127` → clean.
`cd apps/page0127 && npx eslint "app/(admin)/admin/banners/page.tsx" src/widgets/admin/ui/AdminNav.tsx --fix` 후 재검사 → 0 errors.

- [ ] **Step 4: 커밋**

```bash
git add "apps/page0127/app/(admin)/admin/banners/page.tsx" apps/page0127/src/widgets/admin/ui/AdminNav.tsx
git commit -o "apps/page0127/app/(admin)/admin/banners/page.tsx" apps/page0127/src/widgets/admin/ui/AdminNav.tsx -m "feat(banner): /admin/banners 페이지 + nav 링크"
```

---

## Self-Review 결과

- **Spec 커버리지**: 테이블·seed·RLS(Task 2), 공개 읽기+폴백(Task 3~5), admin 조회(6)·서버액션(7)·카드(8)·드래그목록(9)·페이지+nav(10), dnd-kit(1) — 스펙 3~7장 전부 매핑.
- **Placeholder 스캔**: 실제 코드/SQL 포함, "TBD" 없음. AdminNav 수정은 "현재 구조에 맞춰 항목 추가"로 실제 파일 형태를 따르게 명시.
- **타입 일관성**: `HeroSlide`/`HeroSlideRow`(entities/banner) → 매퍼·쿼리·UI 동일. `SlideFields`(Task7) → SlideCard(8) 동일. `HeroSlideRow` → getAllSlides·BannerManager·SlideCard 동일.
- **FSD**: HeroSlide를 entities/banner로 내려 widget·feature 양쪽 import 허용. entity가 widget을 import하지 않도록 폴백 상수는 매개변수 주입(Task 4).
- **주의**: 색 토큰은 실제 클래스 사용. 카드 색칠은 인라인 style(사용자 지정 hex라 Tailwind 토큰 아님 — 의도됨).
