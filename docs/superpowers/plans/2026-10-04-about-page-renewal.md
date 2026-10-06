# 소개 페이지(/about) 리뉴얼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글만 있던 `/about`을 "가입 전 설득 → 이용 방법 → 가입 버튼"으로 이어지는 7개 섹션 페이지로 바꾼다.

**Architecture:** 새 FSD 슬라이스 `widgets/about`에 섹션별 컴포넌트를 둔다. 페이지는 서버 컴포넌트이고 쿠키 없는 익명 클라이언트로만 조회해 `revalidate = 3600` 정적 생성을 유지한다. 움직이는 부분(등장·단어 채움·세 걸음 탭·숫자 카운트)만 작은 클라이언트 컴포넌트로 분리하고, 그 판단 로직은 순수 함수로 빼서 vitest로 검증한다.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind v4 · Supabase(PostgREST RPC) · vitest(node 환경) · Playwright

**Spec:** `docs/superpowers/specs/2026-10-04-about-page-renewal-design.md` (시안: `docs/superpowers/specs/assets/2026-10-04-about-mockup-v7.html`)

## Global Constraints

- 작업 위치: worktree `/Users/dreamfulbud/Desktop/stronger/0127-about` (브랜치 `feat/about-page-renewal`). 앱 경로는 이하 `A = apps/page0127`.
- 명령은 앱 폴더에서: `cd /Users/dreamfulbud/Desktop/stronger/0127-about/apps/page0127 && <명령>` (ESLint flat config가 cwd 기준이라 다른 위치에서 돌리면 설정을 못 찾는다).
- 브랜드 표기: 이 페이지의 사용자 노출 문구는 **`page0127.`**(점 포함). 주소 `page0127.com`과 코드 식별자는 그대로.
- 색: 디자인 토큰만. 새 hex 금지. 파랑 무대는 `.stage-blue`(blue-500→600→700, 빛 blue-400). 예외는 카카오 버튼(기존 `OAuthLoginButtons`가 이미 처리).
- 라운드: 큰 면 `rounded-3xl`(24px) · 안쪽 카드 `rounded-2xl`(16px) · 버튼/작은 칸 `rounded-xl`(12px) · 알약 `rounded-full`.
- 글자: 07 스케일 — weight `font-normal/medium/bold`(400/500/700)만, 자간 유틸 금지, `text-[NNpx]` 금지. 큰 제목은 새 `.display-xl`, 큰 숫자는 `text-5xl md:text-6xl`.
- 줄바꿈: 제목·문단에 `text-balance`.
- 기능 없는 호버 효과 금지(확대·기울기·마우스 추적).
- 원격 표지 이미지는 `next/image`에 `unoptimized={isPreOptimizedImageSrc(src)}` — Vercel 이미지 최적화 한도(원격 이미지만 과금) 보호.
- 사람 이름·활동은 데모(혜진·준호·서연). 실제 사용자 데이터는 개수·표지·랭킹만.
- 새 라이브러리 금지. `type`만(interface 금지), Props 타입 필수, `console.log` 금지(`console.error`만), named export 화살표 컴포넌트.
- 커밋 메시지: gitmoji + 타입, **Co-Authored-By 트레일러 금지**. 커밋은 사용자가 "커밋해줘"라고 할 때만 — 각 Task의 Commit 단계는 그때 실행한다.

## Review Focus

1. **로컬·개발 DB처럼 표지가 거의 없을 때** — 히어로 띠는 숨고 페이지는 정상 렌더돼야 한다. (Task 2 `splitCoverRows` 테스트)
2. **책등 이미지가 없는 책** — 세 걸음 책장에 빈 칸·깨진 이미지 대신 색 막대가 서야 한다. (Task 4 `pickSpines` 테스트)
3. **통계 RPC 실패·타임아웃** — 숫자 섹션만 사라지고 페이지는 500이 나면 안 된다. (Task 7 `getAboutStats` 실패 → `shouldShowStats(null)` 테스트)
4. **키보드만 쓰는 사용자 / 움직임 줄이기 설정** — 탭이 화살표로 움직이고 자동 재생이 멈추며, reduced-motion에서는 처음부터 완성된 화면. (Task 9 e2e)
5. **JS가 늦게 붙는 첫 화면** — 히어로 제목이 `Reveal` 때문에 투명하게 시작해 LCP를 늦추면 안 된다. (Task 1 `Reveal`은 마운트 시 이미 화면 안이면 숨기지 않음 — Task 9 e2e에서 h1 즉시 보임 확인)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `packages/design-tokens/tokens/semantic.json` | `font.display-xl` 토큰 추가(원본). `dist/*`는 빌드로만 갱신 |
| `packages/ui/src/styles/index.css` | `.display-xl` 클래스, `--stage-*` 변수, `.stage-blue` 유틸 |
| `A/src/widgets/about/index.ts` | 슬라이스 공개 API |
| `A/src/widgets/about/ui/SectionHead.tsx` | 라벨 → 제목 → 설명 공통 머리 |
| `A/src/widgets/about/ui/Reveal.tsx` | 화면에 들어올 때 등장(클라이언트) |
| `A/src/widgets/about/model/coverRows.ts` (+test) | 표지 목록 → 띠 두 줄 |
| `A/src/widgets/about/api/getRecentBooks.ts` | 최근 등록 도서(표지·책등) 조회 |
| `A/src/widgets/about/ui/AboutHero.tsx` · `CoverMarquee.tsx` · `CoverMarquee.module.css` | 히어로 + 흐르는 표지 띠 |
| `A/src/widgets/about/model/wordFill.ts` (+test) · `ui/Manifesto.tsx` | 선언문 단어 채움 |
| `A/src/widgets/about/model/stepFrame.ts` (+test) | 세 걸음 진행도 → 화면 상태, 책등 고르기 |
| `A/src/widgets/about/ui/steps/*` | 세 걸음 탭·패널·데모 조각 |
| `A/src/widgets/about/ui/Highlights.tsx` · `api/getWeeklyTop.ts` | 보이는 것들 그리드 |
| `supabase/migrations/20261004000000_about_stats_rpc.sql` | `get_about_stats()` RPC |
| `A/src/widgets/about/model/aboutStats.ts` (+test) · `api/getAboutStats.ts` · `ui/StatsRow.tsx` · `ui/CountUp.tsx` | 숫자 섹션 |
| `A/src/widgets/about/ui/UpdatesTimeline.tsx` · `ui/FinalCta.tsx` | 업데이트 · 마무리 |
| `A/app/(public)/about/page.tsx` | 섹션 조립 |
| `A/app/(public)/page.tsx` | 랜딩 진입 링크 |
| `A/e2e/about.spec.ts` | 접근성·첫 화면 e2e |

---

### Task 1: 토큰 · 공통 조각 (display-xl, stage-blue, SectionHead, Reveal)

**Files:**
- Modify: `packages/design-tokens/tokens/semantic.json` (`font` 블록)
- Modify (생성물): `packages/design-tokens/dist/tokens.css`, `dist/tokens-dark.css` — `npm run build`로만
- Modify: `packages/ui/src/styles/index.css` (`.heading-2` 아래, `--band-strong` 옆, `.band-strong` 아래)
- Create: `A/src/widgets/about/ui/SectionHead.tsx`, `A/src/widgets/about/ui/Reveal.tsx`, `A/src/widgets/about/index.ts`

**Interfaces:**
- Produces: CSS 클래스 `display-xl`, `stage-blue` · `SectionHead({ label, title, description?, id? })` · `Reveal({ children, delay?: 0|1|2|3, className? })`

- [ ] **Step 1: 토큰 원본에 display-xl 추가** — `semantic.json`의 `"font": {` 블록에서 `"h2"` 다음에:

```json
    "h2": {
      "desktop": { "$value": "20px", "$type": "dimension" },
      "mobile":  { "$value": "18px", "$type": "dimension" }
    },
    "display-xl": {
      "$description": "마케팅 페이지(소개) 전용 큰 제목. 07 스케일의 display(28) 위 한 단계. 앱 화면에 쓰지 않는다",
      "desktop": { "$value": "48px", "$type": "dimension" },
      "mobile":  { "$value": "32px", "$type": "dimension" }
    }
```

- [ ] **Step 2: 빌드하고 생성물 확인**

Run: `cd /Users/dreamfulbud/Desktop/stronger/0127-about/packages/design-tokens && npm run build && npm test && grep -n "font-display-xl" dist/tokens.css`
Expected: 테스트 통과, `--font-display-xl-desktop: 48px;`·`--font-display-xl-mobile: 32px;` 두 줄.

- [ ] **Step 3: `.display-xl` 클래스** — `index.css`의 `@layer components` 안, `.heading-2` 미디어쿼리 블록 바로 다음에:

```css
  /* 소개 페이지 전용 큰 제목 — 07 스케일 display(28) 위 한 단계.
     앱 화면에는 쓰지 않는다: 위계가 하나 늘면 앱 전체 제목이 상대적으로 작아 보인다. */
  .display-xl {
    font-size: var(--font-display-xl-mobile);
    font-weight: 700;
    line-height: 42px;
    color: var(--text-strong);
  }

  @media (min-width: 768px) {
    .display-xl {
      font-size: var(--font-display-xl-desktop);
      line-height: 60px;
    }
  }
```

- [ ] **Step 4: 파란 무대 변수·유틸** — `:root`의 `--band-strong: var(--navy-900);` 다음 줄에:

```css
  /* 소개 페이지의 파란 무대(히어로 표지 띠·마무리 CTA). 흰 글자를 얹는 면이라
     다크에서도 같은 값을 쓴다 — primary 는 다크에서 blue/300 으로 밝아져 흰 글자가 안 읽힌다. */
  --stage-from: var(--blue-500);
  --stage-mid: var(--blue-600);
  --stage-to: var(--blue-700);
  --stage-glow: var(--blue-400);
```

그리고 `.band-strong { … }` 규칙 바로 다음에(같은 블록 안):

```css
  .stage-blue {
    background:
      radial-gradient(80% 60% at 50% 0%, var(--stage-glow) 0%, transparent 60%),
      linear-gradient(165deg, var(--stage-from) 0%, var(--stage-mid) 40%, var(--stage-to) 100%);
  }
```

- [ ] **Step 5: SectionHead**

```tsx
// A/src/widgets/about/ui/SectionHead.tsx
type SectionHeadProps = {
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** aria-labelledby 로 섹션과 잇는 제목 id */
  id?: string;
};

/**
 * 소개 페이지 섹션 머리 — 파란 라벨 → 큰 제목 → 회색 설명, 모두 가운데.
 * 애플 제품 페이지의 문법을 그대로 따른다(제목은 마침표로 끝낸다).
 */
export const SectionHead = ({ label, title, description, id }: SectionHeadProps) => (
  <div className='text-center'>
    <p className='text-sm font-bold text-primary'>{label}</p>
    <h2 id={id} className='display-xl mt-2 text-balance'>
      {title}
    </h2>
    {description && (
      <p className='mx-auto mt-4 max-w-xl text-balance text-base text-text-subtle'>
        {description}
      </p>
    )}
  </div>
);
```

- [ ] **Step 6: Reveal**

```tsx
// A/src/widgets/about/ui/Reveal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  /** 같은 섹션 안에서 순서대로 나타나게 하는 지연 단계 (0.1초 단위) */
  delay?: 0 | 1 | 2 | 3;
  className?: string;
};

const DELAY = ['', 'delay-100', 'delay-200', 'delay-300'] as const;

/**
 * 화면에 들어올 때 아래에서 올라오며 나타난다.
 *
 * 서버 HTML 은 **보이는 상태**로 그린다. 마운트했을 때 이미 화면 안이면 그대로 두고,
 * 화면 밖일 때만 숨겼다가 들어올 때 꺼낸다 — 첫 화면(히어로 제목)이 JS 를 기다리며
 * 투명하게 시작하면 LCP 가 늦어진다.
 */
export const Reveal = ({ children, delay = 0, className }: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    // 화면 밖에서 시작하는 요소만 숨겼다가 꺼낸다 — 마운트 직후 한 번뿐이다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState('hidden');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState('shown');
        io.disconnect();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition duration-700 ease-out motion-reduce:transition-none',
        DELAY[delay],
        state === 'hidden' && 'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
        className
      )}
    >
      {children}
    </div>
  );
};
```

- [ ] **Step 7: 슬라이스 공개 API**

```ts
// A/src/widgets/about/index.ts
export { Reveal } from './ui/Reveal';
export { SectionHead } from './ui/SectionHead';
```

- [ ] **Step 8: 정적 검사**

Run: `cd /Users/dreamfulbud/Desktop/stronger/0127-about/apps/page0127 && npx eslint --fix src/widgets/about && npx prettier --write src/widgets/about && npx tsc --noEmit`
Expected: 오류 0. (`cn`이 다른 경로면 `grep -rn "export.*\bcn\b" src/shared/lib`로 확인해 import 경로를 맞춘다.)

- [ ] **Step 9: Commit**

```bash
git add packages/design-tokens/tokens/semantic.json packages/design-tokens/dist packages/ui/src/styles/index.css apps/page0127/src/widgets/about
git commit -m "✨ Feat: 소개 페이지용 큰 제목 단계와 파란 무대 토큰을 추가한다"
```

---

### Task 2: 히어로 + 최근 표지 띠

**Files:**
- Create: `A/src/widgets/about/model/coverRows.ts`, `coverRows.test.ts`
- Create: `A/src/widgets/about/api/getRecentBooks.ts`
- Create: `A/src/widgets/about/ui/AboutHero.tsx`, `AboutHero.module.css`, `CoverMarquee.tsx`, `CoverMarquee.module.css`
- Modify: `A/app/(public)/about/page.tsx` (히어로를 맨 위에, 기존 `DocPage` 내용은 아래 유지)
- Modify: `A/src/widgets/about/index.ts`

**Interfaces:**
- Produces: `type ShelfBook = { id: string; title: string; coverImage: string | null; spineImage: string | null }` · `splitCoverRows(books: ShelfBook[]): [ShelfBook[], ShelfBook[]] | null` · `MIN_MARQUEE_COVERS = 8` · `getRecentBooks(limit?: number): Promise<ShelfBook[]>` · `AboutHero({ books }: { books: ShelfBook[] })`

- [ ] **Step 1: 실패하는 테스트**

```ts
// A/src/widgets/about/model/coverRows.test.ts
import { describe, expect, it } from 'vitest';

import { MIN_MARQUEE_COVERS, type ShelfBook, splitCoverRows } from './coverRows';

const book = (i: number, cover: string | null = `https://image.yes24.com/goods/${i}/L`): ShelfBook => ({
  id: `b${i}`,
  title: `책 ${i}`,
  coverImage: cover,
  spineImage: null,
});

describe('splitCoverRows', () => {
  it('표지가 기준보다 적으면 띠를 그리지 않는다(null)', () => {
    // 로컬·개발 DB는 표지가 거의 없다 — 두세 권이 반복되며 도는 띠는 깨져 보인다
    const few = Array.from({ length: MIN_MARQUEE_COVERS - 1 }, (_, i) => book(i));
    expect(splitCoverRows(few)).toBeNull();
  });

  it('표지가 없는 책은 세지 않는다', () => {
    const mixed = [...Array.from({ length: 7 }, (_, i) => book(i)), book(99, null), book(100, null)];
    expect(splitCoverRows(mixed)).toBeNull();
  });

  it('두 줄로 나누고 윗줄이 한 권 더 많을 수 있다', () => {
    const rows = splitCoverRows(Array.from({ length: 9 }, (_, i) => book(i)));
    expect(rows?.[0]).toHaveLength(5);
    expect(rows?.[1]).toHaveLength(4);
  });

  it('최근 등록 순서를 지킨다', () => {
    const rows = splitCoverRows(Array.from({ length: 8 }, (_, i) => book(i)));
    expect(rows?.[0].map((b) => b.id)).toEqual(['b0', 'b1', 'b2', 'b3']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd /Users/dreamfulbud/Desktop/stronger/0127-about/apps/page0127 && npx vitest run src/widgets/about/model/coverRows.test.ts`
Expected: FAIL — `Cannot find module './coverRows'`

- [ ] **Step 3: 구현**

```ts
// A/src/widgets/about/model/coverRows.ts
/** 소개 페이지에서 쓰는 책 한 권 — 실제 global_books 에서 표지·책등만 가져온다 */
export type ShelfBook = {
  id: string;
  title: string;
  coverImage: string | null;
  spineImage: string | null;
};

/** 띠를 그릴 최소 권수. 이보다 적으면 같은 표지가 눈에 띄게 반복된다 */
export const MIN_MARQUEE_COVERS = 8;

/** 표지가 있는 책만 최근 순서대로 두 줄로 나눈다. 모자라면 띠를 숨긴다(null) */
export const splitCoverRows = (books: ShelfBook[]): [ShelfBook[], ShelfBook[]] | null => {
  const withCover = books.filter((b) => b.coverImage);
  if (withCover.length < MIN_MARQUEE_COVERS) return null;

  const half = Math.ceil(withCover.length / 2);
  return [withCover.slice(0, half), withCover.slice(half)];
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/widgets/about/model/coverRows.test.ts` → Expected: 4 passed

- [ ] **Step 5: 조회 함수**

```ts
// A/src/widgets/about/api/getRecentBooks.ts
import 'server-only';

import { createAnonClient } from '@/shared/config/supabase/anon';

import type { ShelfBook } from '../model/coverRows';

type Row = { id: string; title: string; cover_image: string | null; spine_image: string | null };

/**
 * 최근 등록된 도서의 표지·책등.
 *
 * 쿠키 없는 익명 클라이언트를 쓴다 — server.ts 의 createClient 는 cookies() 를 읽어
 * 페이지를 동적 렌더로 바꾸므로 revalidate(정적 생성)가 무력해진다.
 * global_books 는 책 정보(공개 데이터)라 사용자 기록이 섞이지 않는다.
 */
export const getRecentBooks = async (limit = 24): Promise<ShelfBook[]> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('global_books')
    .select('id, title, cover_image, spine_image')
    .not('cover_image', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // 표지 띠는 장식이다 — 실패해도 페이지는 그린다
    console.error('[about] 최근 도서 조회 실패:', error.message);
    return [];
  }

  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    coverImage: r.cover_image,
    spineImage: r.spine_image,
  }));
};
```

- [ ] **Step 6: 띠 CSS**

```css
/* A/src/widgets/about/ui/CoverMarquee.module.css */
/* 같은 목록을 두 번 이어 붙이고 -50% 까지 옮기면 이음매 없이 돈다 */
.track {
  display: flex;
  gap: 22px;
  width: max-content;
  animation: slide 80s linear infinite;
}

.reverse {
  animation-direction: reverse;
  animation-duration: 95s;
}

/* 움직이는 콘텐츠는 멈출 수 있어야 한다 (WCAG 2.2.2) */
.rows:hover .track,
.rows:focus-within .track {
  animation-play-state: paused;
}

.rows {
  display: grid;
  gap: 22px;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

@keyframes slide {
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .track {
    animation: none;
  }
}
```

- [ ] **Step 7: 띠 컴포넌트**

```tsx
// A/src/widgets/about/ui/CoverMarquee.tsx
import Image from 'next/image';

import { isPreOptimizedImageSrc } from '@repo/ui';

import type { ShelfBook } from '../model/coverRows';

import styles from './CoverMarquee.module.css';

type CoverMarqueeProps = { rows: [ShelfBook[], ShelfBook[]] };

const Row = ({ books, reverse }: { books: ShelfBook[]; reverse?: boolean }) => (
  // 두 번 이어 붙인 뒷부분은 장식 복제다 — 스크린리더가 같은 책을 두 번 읽지 않게 숨긴다
  <ul className={`${styles.track} ${reverse ? styles.reverse : ''}`}>
    {[...books, ...books].map((book, i) => (
      <li key={`${book.id}-${i}`} aria-hidden={i >= books.length || undefined}>
        <Image
          src={book.coverImage!}
          alt={i < books.length ? book.title : ''}
          width={116}
          height={174}
          unoptimized={isPreOptimizedImageSrc(book.coverImage)}
          className='aspect-[2/3] w-[84px] rounded-sm object-cover shadow-lg md:w-[116px]'
        />
      </li>
    ))}
  </ul>
);

export const CoverMarquee = ({ rows }: CoverMarqueeProps) => (
  <div className={styles.rows}>
    <Row books={rows[0]} />
    <Row books={rows[1]} reverse />
  </div>
);
```

- [ ] **Step 8: 히어로**

```tsx
// A/src/widgets/about/ui/AboutHero.tsx
import Link from 'next/link';

import { Button } from '@repo/ui';

import { splitCoverRows, type ShelfBook } from '../model/coverRows';

import { CoverMarquee } from './CoverMarquee';
import { Reveal } from './Reveal';

import styles from './AboutHero.module.css';

type AboutHeroProps = { books: ShelfBook[] };

const ROLLING_WORDS = ['취향이', '계절이', '마음이'] as const;

export const AboutHero = ({ books }: AboutHeroProps) => {
  const rows = splitCoverRows(books);

  return (
    <section aria-labelledby='about-title' className='pt-24 md:pt-28'>
      <div className='mx-auto max-w-6xl px-4 text-center'>
        <p className='text-sm font-bold text-primary'>독서 기록 서비스, page0127.</p>
        <h1 id='about-title' className='display-xl mt-4 text-balance'>
          책장을 보면
          <br />
          그 사람의{' '}
          {/* 스크린리더·검색엔진은 고정 문장을 읽는다 — 계속 바뀌는 글자를 읽히면 혼란스럽다 */}
          <span className='sr-only'>{ROLLING_WORDS[0]}</span>
          <span aria-hidden='true' className={`${styles.roll} text-primary`}>
            {[...ROLLING_WORDS, ROLLING_WORDS[0]].map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </span>{' '}
          보인다
        </h1>
        <p className='mx-auto mt-5 max-w-md text-balance text-base text-text-subtle'>
          읽은 책을 꽂아 두기만 하세요. 쌓인 책장이 당신을 이야기해 줍니다.
        </p>
        <div className='mt-8 flex flex-wrap justify-center gap-2.5'>
          <Button asChild size='lg'>
            <Link href='/login'>10초 만에 시작하기</Link>
          </Button>
          <Button asChild size='lg' variant='secondary'>
            <Link href='#steps'>어떻게 쓰나요?</Link>
          </Button>
        </div>
      </div>

      {rows && (
        <Reveal delay={2}>
          <div className='stage-blue mx-4 mt-16 overflow-hidden rounded-3xl py-12 shadow-xl md:mx-auto md:max-w-6xl'>
            <p className='mb-9 flex items-center justify-center gap-2.5 text-sm font-bold text-white'>
              <span aria-hidden='true' className='size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none' />
              방금 page0127.에 꽂힌 책
              <span className='font-normal text-white/70'>· 최근 등록 순</span>
            </p>
            <CoverMarquee rows={rows} />
          </div>
        </Reveal>
      )}
    </section>
  );
};
```

굴러가는 단어 CSS:

```css
/* A/src/widgets/about/ui/AboutHero.module.css */
/* 한 줄 높이만 보이게 자르고, 세로로 쌓인 단어를 한 칸씩 올린다.
   마지막 칸은 첫 단어의 복제 — 처음으로 돌아갈 때 튀지 않게 */
.roll {
  display: inline-block;
  height: 1em;
  line-height: 1;
  overflow: hidden;
  vertical-align: -0.12em;
}

.roll > span {
  display: block;
  animation: roll 9s cubic-bezier(0.7, 0, 0.2, 1) infinite;
}

@keyframes roll {
  0%, 28% { transform: translateY(0); }
  33%, 61% { transform: translateY(-100%); }
  66%, 94% { transform: translateY(-200%); }
  100% { transform: translateY(-300%); }
}

@media (prefers-reduced-motion: reduce) {
  .roll > span {
    animation: none;
  }
}
```

Files 목록에 `A/src/widgets/about/ui/AboutHero.module.css`를 더한다. dev 서버에서 단어가 한 줄 높이에 맞게 잘리는지 본다 — 어긋나면 `vertical-align` 값만 조정한다.

- [ ] **Step 9: 페이지에 히어로 연결** — `app/(public)/about/page.tsx` 상단:

```tsx
import { AboutHero } from '@/widgets/about';
import { getRecentBooks } from '@/widgets/about/api/getRecentBooks';
// …기존 import 유지

// 표지·통계는 한 시간에 한 번만 새로 만든다 — 매 요청 조회할 내용이 아니다
export const revalidate = 3600;

const AboutPage = async () => {
  const books = await getRecentBooks();

  return (
    <>
      <AboutHero books={books} />
      {/* 아래 DocPage 는 다음 Task 들에서 섹션으로 하나씩 바뀐다 */}
      <DocPage title='page0127 소개' description='읽은 책이 모여 책장이 됩니다.'>
        {/* 기존 DocSection 들 그대로 */}
      </DocPage>
    </>
  );
};
```

`index.ts`에 `export { AboutHero } from './ui/AboutHero';` 추가. 히어로에 h1이 생겼으므로 `DocPage`의 h1이 두 개가 되지 않게 이 Task에서 `DocPage` 대신 기존 섹션을 `<div className='mx-auto max-w-3xl space-y-10 px-4 py-16'>`로 감싼다(DocSection은 그대로).

- [ ] **Step 10: 확인**

Run: `npx eslint --fix src/widgets/about "app/(public)/about" && npx prettier --write src/widgets/about "app/(public)/about" && npx tsc --noEmit && npx vitest run src/widgets/about`
Expected: 오류 0, 테스트 통과. 그다음 `npx next dev -p 3010`(worktree에 `.env.local` 복사 필요: `cp ../../../0127/apps/page0127/.env.local .`)로 `/about`을 열어 로컬 DB 표지가 8권 미만이면 띠가 없고 페이지가 정상인지 본다.

- [ ] **Step 11: Commit**

```bash
git add apps/page0127/src/widgets/about "apps/page0127/app/(public)/about/page.tsx"
git commit -m "✨ Feat: 소개 페이지 첫 화면에 최근 꽂힌 책 표지 띠를 보여 준다"
```

---

### Task 3: 선언문 (스크롤에 따라 단어가 채워짐)

**Files:**
- Create: `A/src/widgets/about/model/wordFill.ts`, `wordFill.test.ts`, `A/src/widgets/about/ui/Manifesto.tsx`
- Modify: `A/app/(public)/about/page.tsx` ("왜 만들었나요" DocSection 삭제 → `<Manifesto />`), `index.ts`

**Interfaces:**
- Produces: `type Word = { text: string; key: boolean }` · `toWords(segments: { text: string; key?: boolean }[]): Word[]` · `litCount(progress: number, total: number): number` · `Manifesto()`

- [ ] **Step 1: 실패하는 테스트**

```ts
// A/src/widgets/about/model/wordFill.test.ts
import { describe, expect, it } from 'vitest';

import { litCount, toWords } from './wordFill';

describe('toWords', () => {
  it('공백 단위로 쪼개고 강조 구간 표시를 단어마다 남긴다', () => {
    expect(toWords([{ text: '그래서 ' }, { text: '한곳에 꽂아', key: true }])).toEqual([
      { text: '그래서', key: false },
      { text: '한곳에', key: true },
      { text: '꽂아', key: true },
    ]);
  });

  it('빈 조각과 연속 공백은 버린다', () => {
    expect(toWords([{ text: '  다   읽고 ' }, { text: '' }])).toEqual([
      { text: '다', key: false },
      { text: '읽고', key: false },
    ]);
  });
});

describe('litCount', () => {
  it('진행도만큼 단어를 켠다', () => {
    expect(litCount(0.5, 10)).toBe(5);
  });

  it('범위를 넘는 진행도는 0~전체로 자른다', () => {
    expect(litCount(-0.3, 10)).toBe(0);
    expect(litCount(1.7, 10)).toBe(10);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/widgets/about/model/wordFill.test.ts` → FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
// A/src/widgets/about/model/wordFill.ts
export type Word = { text: string; key: boolean };

/** 문장 조각을 단어로 쪼갠다. key 가 붙은 조각의 단어는 강조색으로 켜진다 */
export const toWords = (segments: { text: string; key?: boolean }[]): Word[] =>
  segments.flatMap(({ text, key = false }) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({ text: w, key }))
  );

/** 스크롤 진행도(0~1)에 맞춰 켤 단어 수 */
export const litCount = (progress: number, total: number): number =>
  Math.round(Math.min(1, Math.max(0, progress)) * total);
```

- [ ] **Step 4: 통과 확인** — 4 passed

- [ ] **Step 5: 컴포넌트**

```tsx
// A/src/widgets/about/ui/Manifesto.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

import { litCount, toWords } from '../model/wordFill';

const WORDS = toWords([
  { text: '다 읽고 나면 기억은 흐려지고, 기록은 메모 앱에, SNS에, 사진첩에 흩어집니다. 그래서 ' },
  { text: '한곳에 꽂아 두기로', key: true },
  { text: ' 했어요.' },
]);

/**
 * 스크롤하는 만큼 단어가 회색에서 진한 색으로 채워진다.
 * 문장 전체는 처음부터 DOM 에 있으므로 스크린리더·검색엔진은 그대로 읽는다 — 색만 바뀐다.
 * reduced-motion 이면 처음부터 다 켠다.
 */
export const Manifesto = () => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lit, setLit] = useState(WORDS.length);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const update = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const progress = (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.3);
      setLit(litCount(progress, WORDS.length));
    };
    update();
    addEventListener('scroll', update, { passive: true });
    return () => removeEventListener('scroll', update);
  }, []);

  return (
    <section aria-label='왜 page0127.인가요' className='px-4 py-40 text-center md:py-48'>
      <p className='text-sm font-bold text-primary'>왜 page0127.인가요</p>
      <p ref={ref} className='display-xl mx-auto mt-6 max-w-4xl text-balance'>
        {WORDS.map((w, i) => (
          <span
            key={i}
            className={
              i >= lit
                ? 'text-line transition-colors duration-300'
                : w.key
                  ? 'text-primary transition-colors duration-300'
                  : 'text-text-strong transition-colors duration-300'
            }
          >
            {w.text}{' '}
          </span>
        ))}
      </p>
    </section>
  );
};
```

> 초기값을 `WORDS.length`(전부 켜짐)로 두는 이유: 서버 HTML·JS 실패 시 회색 문장이 남지 않게. 마운트 직후 `update()`가 실제 진행도로 내린다. 꺼진 단어 색은 대비 3:1 미만의 장식 상태이므로 `text-line`(회색)을 쓰고, 문장 의미는 DOM 텍스트로 전달된다.

- [ ] **Step 6: 페이지 교체** — `page.tsx`에서 `<DocSection title='왜 만들었나요'>…</DocSection>` 블록을 지우고 `<AboutHero …/>` 바로 아래에 `<Manifesto />`. `index.ts`에 export 추가.

- [ ] **Step 7: 확인** — eslint·prettier·tsc·vitest(Task 2 Step 10과 같은 명령), dev 서버에서 스크롤 시 단어가 채워지는지.

- [ ] **Step 8: Commit**

```bash
git add apps/page0127/src/widgets/about "apps/page0127/app/(public)/about/page.tsx"
git commit -m "✨ Feat: 소개 페이지에 스크롤로 채워지는 선언문을 둔다"
```

---

### Task 4: 세 걸음 — 진행도 계산 (순수 함수)

**Files:**
- Create: `A/src/widgets/about/model/stepFrame.ts`, `stepFrame.test.ts`

**Interfaces:**
- Consumes: `ShelfBook` (Task 2)
- Produces:
  - `STEPS = ['record', 'goal', 'taste'] as const` · `type StepIndex = 0 | 1 | 2`
  - `BOOKS_AT: readonly [1, 7, 12]` · `STEP_DURATION_MS = 5200`
  - `type StepFrame = { books: number; stars: number; memoRatio: number; goalRatio: number }`
  - `stepFrame(step: StepIndex, local: number): StepFrame` — local 은 0~1
  - `type Spine = { id: string; src: string | null; title: string }`
  - `pickSpines(books: ShelfBook[], count: number): Spine[]`
  - `nextStep(step: StepIndex): StepIndex`

- [ ] **Step 1: 실패하는 테스트**

```ts
// A/src/widgets/about/model/stepFrame.test.ts
import { describe, expect, it } from 'vitest';

import type { ShelfBook } from './coverRows';
import { BOOKS_AT, nextStep, pickSpines, stepFrame } from './stepFrame';

describe('stepFrame', () => {
  it('1단계 시작: 책 1권, 별 0, 메모 0', () => {
    expect(stepFrame(0, 0)).toEqual({ books: 1, stars: 0, memoRatio: 0, goalRatio: 0 });
  });

  it('1단계 끝: 별 4개, 메모 전부', () => {
    const f = stepFrame(0, 1);
    expect(f.stars).toBe(4);
    expect(f.memoRatio).toBe(1);
  });

  it('2단계: 책이 1권에서 7권으로 자라고 목표가 찬다', () => {
    expect(stepFrame(1, 0).books).toBe(BOOKS_AT[0]);
    expect(stepFrame(1, 1)).toMatchObject({ books: BOOKS_AT[1], goalRatio: 1 });
  });

  it('3단계: 12권, 앞 단계 결과는 완성 상태로 유지', () => {
    expect(stepFrame(2, 1)).toEqual({ books: 12, stars: 4, memoRatio: 1, goalRatio: 1 });
  });

  it('진행도 범위를 벗어나도 깨지지 않는다', () => {
    expect(stepFrame(0, -1).books).toBe(1);
    expect(stepFrame(2, 5).books).toBe(12);
  });

  it('단계 연출은 진행도 절반 안에 끝난다 — 완성된 모습이 머물 시간을 남긴다', () => {
    expect(stepFrame(1, 0.5).goalRatio).toBe(1);
  });
});

describe('nextStep', () => {
  it('3단계 다음은 1단계', () => {
    expect(nextStep(2)).toBe(0);
  });
});

describe('pickSpines', () => {
  const b = (i: number, spine: string | null): ShelfBook => ({ id: `b${i}`, title: `책${i}`, coverImage: null, spineImage: spine });

  it('책등 이미지가 있는 책을 먼저 고른다', () => {
    const spines = pickSpines([b(1, null), b(2, 's2'), b(3, 's3')], 2);
    expect(spines.map((s) => s.src)).toEqual(['s2', 's3']);
  });

  it('모자라면 이미지 없는 칸(src null)으로 채운다 — 빈 자리를 남기지 않는다', () => {
    const spines = pickSpines([b(1, 's1')], 3);
    expect(spines).toHaveLength(3);
    expect(spines.map((s) => s.src)).toEqual(['s1', null, null]);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/widgets/about/model/stepFrame.test.ts` → FAIL

- [ ] **Step 3: 구현**

```ts
// A/src/widgets/about/model/stepFrame.ts
import type { ShelfBook } from './coverRows';

/**
 * 세 걸음 연출 — 진행도(0~1) 하나로 화면 상태를 정한다.
 * 화면이 아니라 이 함수가 규칙을 갖게 해서, 브라우저 없이 vitest 로 확인한다.
 */
export const STEPS = ['record', 'goal', 'taste'] as const;
export type StepIndex = 0 | 1 | 2;

/** 단계마다 책장에 꽂혀 있는 권수 — 같은 책장이 자라는 이야기 */
export const BOOKS_AT = [1, 7, 12] as const;

/** 한 단계가 머무는 시간. 연출은 앞 절반에 끝내고 나머지는 완성된 모습을 보여 준다 */
export const STEP_DURATION_MS = 5200;

const MAX_STARS = 4;

export type StepFrame = {
  books: number;
  stars: number;
  memoRatio: number;
  goalRatio: number;
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export const stepFrame = (step: StepIndex, local: number): StepFrame => {
  const t = clamp(local);
  const from = step === 0 ? BOOKS_AT[0] : BOOKS_AT[step - 1];
  const books = Math.round(from + (BOOKS_AT[step] - from) * clamp(t * 2));

  return {
    books,
    stars: step > 0 ? MAX_STARS : Math.min(MAX_STARS, Math.floor(clamp(t * 3) * (MAX_STARS + 0.99))),
    memoRatio: step > 0 ? 1 : clamp((t - 0.2) / 0.3),
    goalRatio: step > 1 ? 1 : step === 1 ? clamp(t * 2) : 0,
  };
};

export const nextStep = (step: StepIndex): StepIndex => ((step + 1) % 3) as StepIndex;

export type Spine = { id: string; src: string | null; title: string };

/** 책장에 세울 책등 — 이미지가 있는 책을 먼저, 모자라면 이미지 없는 칸으로 채운다 */
export const pickSpines = (books: ShelfBook[], count: number): Spine[] => {
  const withSpine = books.filter((b) => b.spineImage);
  const spines: Spine[] = withSpine.slice(0, count).map((b) => ({ id: b.id, src: b.spineImage, title: b.title }));
  for (let i = spines.length; i < count; i++) spines.push({ id: `empty-${i}`, src: null, title: '' });
  return spines;
};
```

- [ ] **Step 4: 통과 확인** — 9 passed

- [ ] **Step 5: Commit**

```bash
git add apps/page0127/src/widgets/about/model/stepFrame.ts apps/page0127/src/widgets/about/model/stepFrame.test.ts
git commit -m "✨ Feat: 세 걸음 연출의 단계별 화면 상태를 순수 함수로 정한다"
```

---

### Task 5: 세 걸음 — 탭 · 패널 UI와 접근성

**Files:**
- Create: `A/src/widgets/about/ui/steps/useStepPlayer.ts`
- Create: `A/src/widgets/about/ui/steps/GrowingShelf.tsx`, `RecordDemo.tsx`, `GoalDemo.tsx`, `StepsShowcase.tsx`
- Modify: `A/app/(public)/about/page.tsx` ("무엇을 할 수 있나요" DocSection → `<StepsShowcase …/>`), `index.ts`

**Interfaces:**
- Consumes: `stepFrame`, `nextStep`, `pickSpines`, `STEP_DURATION_MS`, `BOOKS_AT`, `type StepIndex`, `type StepFrame`, `type Spine` (Task 4) · `ShelfBook` (Task 2)
- Produces: `StepsShowcase({ books, tasteSlot }: { books: ShelfBook[]; tasteSlot: React.ReactNode })` — `tasteSlot`에 서버 컴포넌트 `<TasteExampleCard />`를 넘긴다.

- [ ] **Step 1: 재생 훅** — 규칙(스펙 §4): 40% 이상 보일 때만, 처음 보일 때 1단계부터, 사용자가 고르면 자동 재생 끔, 키보드 포커스 안에선 잠시 멈춤, **마우스 오버로는 멈추지 않음**, reduced-motion 이면 재생 안 함·완성 상태.

```ts
// A/src/widgets/about/ui/steps/useStepPlayer.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { nextStep, STEP_DURATION_MS, type StepIndex } from '../../model/stepFrame';

/**
 * 세 걸음 자동 재생.
 *
 * WCAG 2.2.2 — 5초 넘게 스스로 바뀌는 콘텐츠는 멈출 수 있어야 한다:
 * 버튼으로 멈추고, 사용자가 단계를 직접 고르면 다시는 저절로 넘기지 않는다.
 * 마우스 오버로는 멈추지 않는다 — 보는 동안 마우스는 대개 그 위에 있어서
 * '보고 있을 때 재생이 안 되는' 상태가 된다(시안에서 실제로 겪음).
 */
export const useStepPlayer = (panelRef: React.RefObject<HTMLElement | null>) => {
  const [step, setStep] = useState<StepIndex>(0);
  const [local, setLocal] = useState(1);
  const [playing, setPlaying] = useState(false);
  const hold = useRef(false);
  const visible = useRef(false);
  const t0 = useRef(0);
  const elapsed = useRef(0);

  // 움직임 줄이기면 시작조차 하지 않는다 — 처음부터 완성 화면
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaying(true);
  }, []);

  // 처음 화면에 들어올 때 1단계부터 — 안 보이는 동안 혼자 진행되지 않게
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let seen = false;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
        if (e.isIntersecting && !seen) {
          seen = true;
          setStep(0);
          setLocal(0);
          elapsed.current = 0;
          t0.current = performance.now();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [panelRef]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    t0.current = performance.now();
    const tick = (now: number) => {
      if (!visible.current || hold.current) {
        t0.current = now - elapsed.current;
      } else {
        elapsed.current = now - t0.current;
        const t = Math.min(1, elapsed.current / STEP_DURATION_MS);
        setLocal(t);
        if (t >= 1) {
          setStep((s) => nextStep(s));
          elapsed.current = 0;
          t0.current = now;
          setLocal(0);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  /** 사용자가 직접 고른다 — 자동 재생을 끄고 완성된 화면을 보여 준다 */
  const choose = useCallback((n: StepIndex) => {
    setPlaying(false);
    setStep(n);
    setLocal(1);
  }, []);

  // 상태 업데이트 함수 안에서 다른 상태를 바꾸지 않는다 — StrictMode 가 두 번 부른다
  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      setLocal(1); // 멈출 땐 빈 별·빈 메모가 남지 않게 완성 상태로
    } else {
      elapsed.current = 0;
      setLocal(0);
      setPlaying(true);
    }
  }, [playing]);

  const setHold = useCallback((v: boolean) => {
    hold.current = v;
  }, []);

  return { step, local, playing, choose, togglePlay, setHold };
};
```

- [ ] **Step 2: 데모 조각 3개**

```tsx
// A/src/widgets/about/ui/steps/GrowingShelf.tsx
import Image from 'next/image';

import { isPreOptimizedImageSrc } from '@repo/ui';

import type { Spine } from '../../model/stepFrame';

type GrowingShelfProps = { spines: Spine[]; count: number };

/** 실제 책등 이미지로 서는 데모 책장 — 링크 없음(존재하지 않는 서재로 가지 않게) */
export const GrowingShelf = ({ spines, count }: GrowingShelfProps) => (
  <ul aria-hidden='true' className='mt-4 flex h-24 items-end gap-1 border-b-8 border-accent px-1'>
    {spines.map((s, i) => (
      <li
        key={s.id}
        className={`h-full origin-bottom transition duration-500 motion-reduce:transition-none ${
          i < count ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
        } ${i === count - 1 ? 'ring-2 ring-primary/50' : ''}`}
      >
        {s.src ? (
          <Image src={s.src} alt='' width={26} height={96} unoptimized={isPreOptimizedImageSrc(s.src)} className='h-full w-auto rounded-sm object-contain' />
        ) : (
          <span className='block h-full w-6 rounded-sm bg-text-subtle/40' />
        )}
      </li>
    ))}
  </ul>
);
```

```tsx
// A/src/widgets/about/ui/steps/RecordDemo.tsx
type RecordDemoProps = { stars: number; memoRatio: number; cover: string | null; title: string };

const MEMO = '흔들릴 때마다 한 장씩 펼쳐 보게 되는 책.';

/** ① 기록 — 별점이 차고 메모가 써진다 (앱의 기록 카드를 같은 토큰으로 줄인 데모) */
export const RecordDemo = ({ stars, memoRatio, cover, title }: RecordDemoProps) => (
  <div className='rounded-2xl bg-sunken p-5'>
    <div className='flex gap-4'>
      {/* eslint-disable-next-line @next/next/no-img-element -- 데모 표지 한 장, 크기 고정 */}
      {cover && <img src={cover} alt='' className='h-24 w-16 rounded-sm object-cover shadow' />}
      <div>
        <span className='rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary'>완독</span>
        <p className='mt-2 text-base font-bold text-text-strong'>{title}</p>
        <p role='img' aria-label={`별점 ${stars}점`} className='mt-1 flex gap-1 text-lg text-primary'>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} aria-hidden='true'>{i < stars ? '★' : '☆'}</span>
          ))}
        </p>
      </div>
    </div>
    <p className='mt-3 min-h-16 rounded-xl bg-card p-3 text-sm text-text-body'>
      {MEMO.slice(0, Math.round(MEMO.length * memoRatio))}
    </p>
  </div>
);
```

> 별 간격은 자간 유틸이 아니라 `gap-1`로 준다(07 규칙: 자간 조정 금지). 별 하나하나는 장식이고 점수는 `role='img'`의 이름으로 읽힌다.

```tsx
// A/src/widgets/about/ui/steps/GoalDemo.tsx
type GoalDemoProps = { goalRatio: number };

const TARGET = 12;
const DONE = 7;
const MONTHS = [0.3, 0.55, 0, 0.7, 0.45, 0.15, 0.9, 0.4, 0.6] as const;

/** ② 목표 — 링이 7/12권까지 차고 달별 막대가 솟는다 */
export const GoalDemo = ({ goalRatio }: GoalDemoProps) => {
  const done = Math.round(DONE * goalRatio);

  return (
    <div className='grid grid-cols-1 items-center gap-6 rounded-2xl bg-sunken p-5 md:grid-cols-[140px_1fr]'>
      <div
        className='mx-auto hidden size-36 place-items-center rounded-full md:grid'
        style={{ background: `conic-gradient(var(--primary) ${(done / TARGET) * 360}deg, var(--card) 0)` }}
      >
        <div className='grid size-28 place-items-center rounded-full bg-sunken text-center'>
          <p className='text-3xl font-bold text-text-strong'>
            {done}
            <span className='block text-xs font-normal text-text-subtle'>/ {TARGET}권</span>
          </p>
        </div>
      </div>
      <div>
        <p className='text-base font-bold text-text-strong'>올해 독서 목표</p>
        <div className='mt-3 flex h-24 items-end gap-1.5'>
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t-sm transition-[height] duration-300 ${i < MONTHS.length ? 'bg-primary' : 'bg-card'}`}
              style={{ height: `${(MONTHS[i] ?? 0.06) * 100 * Math.min(1, Math.max(0, goalRatio * 1.6 - i * 0.07))}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

> 인라인 `style`은 값이 진행도에 따라 매 프레임 바뀌는 두 곳(conic 각도·막대 높이)에만 쓴다 — 클래스로 표현할 수 없는 연속값이다.

- [ ] **Step 3: 쇼케이스 (탭 → 패널 → 설명)**

```tsx
// A/src/widgets/about/ui/steps/StepsShowcase.tsx
'use client';

import { useRef } from 'react';

import { SectionHead } from '../SectionHead';
import type { ShelfBook } from '../../model/coverRows';
import { BOOKS_AT, pickSpines, type StepIndex, stepFrame } from '../../model/stepFrame';

import { GoalDemo } from './GoalDemo';
import { GrowingShelf } from './GrowingShelf';
import { RecordDemo } from './RecordDemo';
import { useStepPlayer } from './useStepPlayer';

type StepsShowcaseProps = {
  books: ShelfBook[];
  /** 3단계에 그대로 넣을 실제 취향 카드(서버 컴포넌트) */
  tasteSlot: React.ReactNode;
};

const TABS = [
  { label: '기록하기', lead: '읽은 책을 기록해요.', rest: '책을 검색해 담고, 별점과 한 줄 메모를 남기면 책장에 한 권이 꽂혀요.' },
  { label: '목표 정하기', lead: '올해 목표를 정해요.', rest: '몇 권 읽을지 정하면 진행률과 달마다의 기록이 차곡차곡 쌓여요.' },
  { label: '취향 분석', lead: '취향 분석을 받아요.', rest: '평가한 완독 책이 다섯 권 모이면, AI가 독서 취향을 노트로 써 드려요.' },
] as const;

export const StepsShowcase = ({ books, tasteSlot }: StepsShowcaseProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { step, local, playing, choose, togglePlay, setHold } = useStepPlayer(panelRef);
  const frame = stepFrame(step, local);
  const spines = pickSpines(books, BOOKS_AT[2]);
  const recordBook = books.find((b) => b.coverImage);

  // ARIA 탭 패턴: 좌우 화살표·Home·End, 선택된 탭만 Tab 순서에 들어간다
  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, StepIndex> = {
      ArrowRight: ((step + 1) % 3) as StepIndex,
      ArrowLeft: ((step + 2) % 3) as StepIndex,
      Home: 0,
      End: 2,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    choose(map[e.key]);
    tabRefs.current[map[e.key]]?.focus();
  };

  return (
    <section
      id='steps'
      aria-labelledby='steps-title'
      className='scroll-mt-16 bg-sunken px-4 py-32'
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <SectionHead id='steps-title' label='이용 방법' title={<>책장 하나가 자라는<br /><span className='text-primary'>세 걸음.</span></>} />

      <div className='mt-10 flex flex-wrap items-center justify-center gap-2.5'>
        <div role='tablist' aria-label='이용 방법 단계' onKeyDown={onKeyDown} className='inline-flex gap-1 rounded-full bg-card p-1.5 shadow-sm ring-1 ring-line'>
          {TABS.map((t, i) => {
            const selected = step === i;
            return (
              <button
                key={t.label}
                ref={(el) => { tabRefs.current[i] = el; }}
                role='tab'
                id={`step-tab-${i}`}
                aria-selected={selected}
                aria-controls='step-panel'
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(i as StepIndex)}
                className={`relative overflow-hidden rounded-full px-5 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'text-primary' : 'text-text-subtle'}`}
              >
                {/* 자동 재생 진행 막대 — 장식 */}
                <span aria-hidden='true' className='absolute inset-y-0 left-0 bg-accent' style={{ width: `${i < step ? 100 : selected ? local * 100 : 0}%` }} />
                <span className='relative'>{i + 1}. {t.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type='button'
          onClick={togglePlay}
          aria-label={playing ? '자동 재생 일시정지' : '자동 재생 시작'}
          className='grid size-11 place-items-center rounded-full bg-card text-text-strong shadow-sm ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
        >
          <span aria-hidden='true'>{playing ? '❚❚' : '▶'}</span>
        </button>
      </div>

      <div role='tabpanel' id='step-panel' aria-labelledby={`step-tab-${step}`} ref={panelRef} className='mx-auto mt-6 max-w-4xl'>
        <div className='rounded-3xl bg-card p-4 ring-1 ring-line md:p-12'>
          <div className='overflow-hidden rounded-2xl border border-line bg-card shadow-xl'>
            <div aria-hidden='true' className='flex h-10 items-center gap-1.5 border-b border-line bg-sunken px-3.5'>
              <i className='size-2.5 rounded-full bg-line' /><i className='size-2.5 rounded-full bg-line' /><i className='size-2.5 rounded-full bg-line' />
              <span className='ml-3 rounded-md bg-card px-2.5 py-1 text-xs text-text-subtle'>page0127.com/hyejin</span>
            </div>
            <div className='p-4 md:p-6'>
              <div className='flex items-center gap-2.5'>
                <span className='grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-primary'>혜</span>
                <b className='text-sm text-text-strong'>혜진님의 서재</b>
                <span className='ml-auto rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary'>{frame.books}권</span>
              </div>
              <GrowingShelf spines={spines} count={frame.books} />
              <div className='mt-4 min-h-56'>
                {step === 0 && <RecordDemo stars={frame.stars} memoRatio={frame.memoRatio} cover={recordBook?.coverImage ?? null} title={recordBook?.title ?? '첫 번째 책'} />}
                {step === 1 && <GoalDemo goalRatio={frame.goalRatio} />}
                {step === 2 && tasteSlot}
              </div>
            </div>
          </div>
        </div>
        <p className='mx-auto mt-7 max-w-xl text-balance text-center text-base text-text-subtle'>
          <b className='font-bold text-text-strong'>{TABS[step].lead}</b> {TABS[step].rest}
        </p>
      </div>
    </section>
  );
};
```

- [ ] **Step 4: 페이지 연결** — `page.tsx`에서 "무엇을 할 수 있나요" DocSection을 지우고 `<Manifesto />` 다음에:

```tsx
<StepsShowcase books={books} tasteSlot={<TasteExampleCard />} />
```

(`import { TasteExampleCard } from '@/widgets/landing/ui/TasteExampleCard';` · `index.ts`에 `StepsShowcase` export)

- [ ] **Step 5: 확인** — eslint·prettier·tsc·vitest. dev 서버에서: 섹션이 보이면 1→2→3 자동 진행, 탭 클릭 시 멈추고 완성 화면, 마우스를 패널 위에 둬도 진행, 일시정지 버튼 동작.

- [ ] **Step 6: Commit**

```bash
git add apps/page0127/src/widgets/about "apps/page0127/app/(public)/about/page.tsx"
git commit -m "✨ Feat: 소개 페이지에 탭으로 넘겨 보는 이용 방법 세 걸음을 둔다"
```

---

### Task 6: 보이는 것들 — 3열 그리드

**Files:**
- Create: `A/src/widgets/about/api/getWeeklyTop.ts`, `A/src/widgets/about/ui/Highlights.tsx`
- Modify: `page.tsx`, `index.ts`

**Interfaces:**
- Consumes: `ShelfBook` (Task 2), `SectionHead`, `Reveal` (Task 1)
- Produces: `type TopBook = { isbn: string; title: string; cover: string | null; count: number }` · `getWeeklyTop(limit?: number): Promise<TopBook[]>` · `Highlights({ books, top }: { books: ShelfBook[]; top: TopBook[] })`

- [ ] **Step 1: 랭킹 조회** — 기존 공개 RPC `get_most_read_books(limit_count)`(anon 실행 허용, `is_public = true`만 집계)를 그대로 쓴다.

```ts
// A/src/widgets/about/api/getWeeklyTop.ts
import 'server-only';

import { createAnonClient } from '@/shared/config/supabase/anon';

export type TopBook = { isbn: string; title: string; cover: string | null; count: number };

type Row = { isbn: string; count: number; book_info: { title?: string; cover_image?: string | null } | null };

/** 많이 읽힌 책 상위 n권 — 랜딩 랭킹과 같은 공개 RPC */
export const getWeeklyTop = async (limit = 3): Promise<TopBook[]> => {
  const { data, error } = await createAnonClient().rpc('get_most_read_books', { limit_count: limit });
  if (error) {
    console.error('[about] 랭킹 조회 실패:', error.message);
    return [];
  }
  return ((data as Row[] | null) ?? []).map((r) => ({
    isbn: r.isbn,
    title: r.book_info?.title ?? '',
    cover: r.book_info?.cover_image ?? null,
    count: Number(r.count),
  }));
};
```

- [ ] **Step 2: 그리드** — 카드 하나에 메시지 하나, 굵은 리드 문장. 순서: 독서 궁합(파란 카드) · 인생책 · 공개 서재 · 많이 읽힌 책 · 피드 · 주간 회상. 실제 데이터는 표지와 랭킹뿐, 사람은 데모.

```tsx
// A/src/widgets/about/ui/Highlights.tsx
import Image from 'next/image';

import { isPreOptimizedImageSrc } from '@repo/ui';

import type { TopBook } from '../api/getWeeklyTop';
import type { ShelfBook } from '../model/coverRows';

import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';

type HighlightsProps = { books: ShelfBook[]; top: TopBook[] };

const Cover = ({ src, className }: { src: string | null; className: string }) =>
  src ? (
    <Image src={src} alt='' width={120} height={180} unoptimized={isPreOptimizedImageSrc(src)} className={`aspect-[2/3] rounded-sm object-cover shadow-lg ${className}`} />
  ) : (
    <span className={`aspect-[2/3] rounded-sm bg-line ${className}`} />
  );

const Card = ({ lead, rest, blue, children }: { lead: string; rest: string; blue?: boolean; children: React.ReactNode }) => (
  <article className={`flex min-h-[440px] flex-col rounded-3xl p-7 md:h-[480px] md:p-8 ${blue ? 'stage-blue text-white' : 'bg-sunken'}`}>
    <p className={`text-balance text-lg font-medium ${blue ? 'text-white/80' : 'text-text-subtle'}`}>
      <b className={`font-bold ${blue ? 'text-white' : 'text-text-strong'}`}>{lead}</b> {rest}
    </p>
    <div className='mt-4 flex flex-1 items-center justify-center'>{children}</div>
  </article>
);

const FEED = [
  { who: '혜진', avatar: '혜', verb: '완독했어요', when: '방금' },
  { who: '준호', avatar: '준', verb: '읽기 시작했어요', when: '12분 전' },
  { who: '서연', avatar: '서', verb: '별점 ★5를 남겼어요', when: '1시간 전' },
] as const;

export const Highlights = ({ books, top }: HighlightsProps) => {
  const covers = books.filter((b) => b.coverImage).map((b) => b.coverImage);
  const pick = (i: number) => covers[i % Math.max(1, covers.length)] ?? null;

  return (
    <section aria-labelledby='highlights-title' className='mx-auto max-w-6xl px-4 py-32'>
      <SectionHead id='highlights-title' label='더 둘러보기' title={<>책장이 쌓이면<br />보이는 것들.</>} />
      <div className='mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
        <Reveal>
          <Card blue lead='독서 궁합.' rest='다른 사람의 책장과 나란히 놓고, 겹치는 책과 취향을 확인해요.'>
            <div className='text-center'>
              <p className='text-sm'>나 × 혜진</p>
              <p className='text-6xl font-bold'>78%</p>
              <div className='mt-5 flex justify-center gap-2'>
                {[0, 1, 2, 3].map((i) => <Cover key={i} src={pick(i + 3)} className='w-12' />)}
              </div>
              <p className='mt-3 text-xs text-white/75'>함께 읽은 책 4권 · 둘 다 &lsquo;관계&rsquo;를 좋아해요</p>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={1}>
          <Card lead='인생책.' rest='다시 꺼내 볼 한 권은 책등 대신 표지로 세워 둬요.'>
            <div className='relative h-56 w-64'>
              <Cover src={pick(7)} className='absolute left-0 top-4 w-28 -rotate-12' />
              <Cover src={pick(8)} className='absolute left-16 top-0 z-10 w-28' />
              <Cover src={pick(9)} className='absolute left-32 top-4 w-28 rotate-12' />
              <span className='absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-3.5 py-2 text-sm font-bold text-primary shadow-lg'>★ 인생책 3권</span>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={2}>
          <Card lead='공개 서재.' rest='주소 하나로 내 책장을 보여 줘요. 링크로 공유하면 이렇게 보여요.'>
            <div className='w-full overflow-hidden rounded-2xl bg-card shadow-lg'>
              <div className='stage-blue flex h-36 items-end gap-1.5 px-4'>
                {[0, 1, 2, 3, 4].map((i) => <Cover key={i} src={pick(i + 10)} className='-mb-1.5 w-11' />)}
              </div>
              <div className='p-4'>
                <p className='text-base font-bold text-text-strong'>혜진님의 서재</p>
                <p className='text-sm text-text-subtle'>올해 23권 · 인생책 3권</p>
                <p className='text-xs font-bold text-primary'>page0127.com/hyejin</p>
              </div>
            </div>
          </Card>
        </Reveal>
        <Reveal>
          <Card lead='이번 주 많이 읽힌 책.' rest='리더들이 지금 무엇을 읽는지 매일 집계해요.'>
            <ol className='w-full space-y-3'>
              {top.map((b, i) => (
                <li key={b.isbn} className='flex items-center gap-3.5 rounded-xl bg-card px-3.5 py-2.5'>
                  <b className='w-4 text-lg text-primary'>{i + 1}</b>
                  <Cover src={b.cover} className='w-10 shadow-none' />
                  <span className='line-clamp-1 flex-1 text-sm font-bold text-text-strong'>{b.title}</span>
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>
        <Reveal delay={1}>
          <Card lead='피드.' rest='팔로우한 리더가 책을 꽂으면 바로 알 수 있어요.'>
            <ul className='w-full space-y-2.5'>
              {FEED.map((f, i) => (
                <li key={f.who} className='flex items-center gap-3 rounded-xl bg-card px-3.5 py-3 text-sm'>
                  <span className='grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>{f.avatar}</span>
                  <span className='flex-1'>
                    <b className='text-text-strong'>{f.who}</b>님이 {f.verb}
                    <span className='block text-xs text-text-subtle'>{f.when}</span>
                  </span>
                  <Cover src={pick(i + 15)} className='w-7 shadow-none' />
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
        <Reveal delay={2}>
          <Card lead='주간 회상.' rest='이번 주의 나를 한 장으로 돌아봐요.'>
            <div className='w-full rounded-2xl bg-card p-5 shadow-lg'>
              <p className='text-xs text-text-subtle'>이번 주</p>
              <p className='text-4xl font-bold text-text-strong'>2권 <span className='text-base font-normal text-text-subtle'>완독 · 312쪽</span></p>
              <div className='mt-3 flex h-16 items-end gap-1.5'>
                {[0.3, 0.7, 0.2, 0.9, 0.45, 0.6, 0.15].map((h, i) => (
                  <span key={i} className={`flex-1 rounded-sm ${i % 2 ? 'bg-primary' : 'bg-accent'}`} style={{ height: `${h * 100}%` }} />
                ))}
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
};
```

> `min-h-[440px]`·`md:h-[480px]`는 글자 크기가 아니라 레이아웃 치수라 07 규칙 대상이 아니다. 랭킹이 비면(`top.length === 0`) 그 카드의 `ol`이 비어 보이므로 `top.length > 0 ? <ol…> : <p className='text-sm text-text-subtle'>집계 중이에요</p>`로 분기한다.

- [ ] **Step 3: 페이지 연결** — 세 걸음 아래에 `<Highlights books={books} top={top} />`, 데이터는 `const [books, top] = await Promise.all([getRecentBooks(), getWeeklyTop()]);`

- [ ] **Step 4: 확인** — 정적 검사 + dev에서 3열(데스크톱)·2열(태블릿)·1열(모바일), 가로 스크롤 없음.

- [ ] **Step 5: Commit**

```bash
git add apps/page0127/src/widgets/about "apps/page0127/app/(public)/about/page.tsx"
git commit -m "✨ Feat: 소개 페이지에 기능 여섯 가지를 카드 그리드로 보여 준다"
```

---

### Task 7: 숫자 — 집계 RPC · 노출 기준

**Files:**
- Create: `supabase/migrations/20261004000000_about_stats_rpc.sql`
- Create: `A/src/widgets/about/model/aboutStats.ts`, `aboutStats.test.ts`, `A/src/widgets/about/api/getAboutStats.ts`, `A/src/widgets/about/ui/StatsRow.tsx`, `A/src/widgets/about/ui/CountUp.tsx`
- Modify: `Highlights.tsx`(그리드 아래에 숫자 줄) 또는 `page.tsx`

**Interfaces:**
- Produces: `type AboutStats = { books: number; readers: number; matches: number }` · `STATS_MIN = { books: 1000, readers: 100 }` · `shouldShowStats(s: AboutStats | null): boolean` · `getAboutStats(): Promise<AboutStats | null>` · `StatsRow({ stats })`

- [ ] **Step 1: 마이그레이션 번호 확인**

Run: `git -C /Users/dreamfulbud/Desktop/stronger/0127-about fetch -q origin && git -C /Users/dreamfulbud/Desktop/stronger/0127-about ls-tree --name-only origin/main supabase/migrations/ | tail -3`
Expected: `20261004…`로 시작하는 파일이 없어야 한다. 있으면 번호를 하루 뒤로 미룬다.

- [ ] **Step 2: 마이그레이션**

```sql
-- supabase/migrations/20261004000000_about_stats_rpc.sql
-- 소개 페이지 숫자 섹션: 개수 세 개만 돌려준다.
--
-- 왜 SECURITY DEFINER 인가: books·profiles·ai_usage_logs 는 RLS 로 본인 행만 보인다.
-- 익명 방문자가 전체 개수를 보려면 소유자 권한으로 세야 한다.
-- 행 내용은 나가지 않고 숫자 셋만 나간다 — 공개 여부와 무관하게 전체를 센다.
CREATE OR REPLACE FUNCTION public.get_about_stats()
RETURNS TABLE (books BIGINT, readers BIGINT, matches BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.books),
    (SELECT COUNT(DISTINCT user_id) FROM public.books),
    (SELECT COUNT(*) FROM public.ai_usage_logs WHERE feature = 'compatibility');
$$;

-- 20260725000001_lock_down_function_privileges.sql 이후 새 함수는 기본 비공개다.
REVOKE EXECUTE ON FUNCTION public.get_about_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_about_stats() TO anon, authenticated;
```

> "리더 = 책을 1권 이상 기록한 사람"을 `profiles` 대신 `books.user_id` DISTINCT로 센다 — 같은 정의를 조인 없이 표현한다.

- [ ] **Step 3: 로컬 DB에 적용·확인**

Run: `cd /Users/dreamfulbud/Desktop/stronger/0127-about && npx supabase migration up --local && npx supabase db query --local "select * from get_about_stats();"`
Expected: 한 행(`books, readers, matches`). 명령이 없으면 `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select * from get_about_stats();"`.

- [ ] **Step 4: 실패하는 테스트**

```ts
// A/src/widgets/about/model/aboutStats.test.ts
import { describe, expect, it } from 'vitest';

import { shouldShowStats, STATS_MIN } from './aboutStats';

describe('shouldShowStats', () => {
  it('조회 실패(null)면 숨긴다 — 숫자 섹션 하나 때문에 페이지가 깨지면 안 된다', () => {
    expect(shouldShowStats(null)).toBe(false);
  });

  it('책과 리더가 둘 다 기준 이상일 때만 보인다', () => {
    expect(shouldShowStats({ books: STATS_MIN.books, readers: STATS_MIN.readers, matches: 0 })).toBe(true);
    expect(shouldShowStats({ books: STATS_MIN.books - 1, readers: 500, matches: 9 })).toBe(false);
    expect(shouldShowStats({ books: 9999, readers: STATS_MIN.readers - 1, matches: 9 })).toBe(false);
  });
});
```

- [ ] **Step 5: 실패 확인** → FAIL (모듈 없음)

- [ ] **Step 6: 구현**

```ts
// A/src/widgets/about/model/aboutStats.ts
export type AboutStats = { books: number; readers: number; matches: number };

/** 작은 숫자는 오히려 역효과다 — 둘 다 넘을 때만 섹션을 보인다 */
export const STATS_MIN = { books: 1000, readers: 100 } as const;

export const shouldShowStats = (s: AboutStats | null): boolean =>
  s !== null && s.books >= STATS_MIN.books && s.readers >= STATS_MIN.readers;
```

```ts
// A/src/widgets/about/api/getAboutStats.ts
import 'server-only';

import { createAnonClient } from '@/shared/config/supabase/anon';

import type { AboutStats } from '../model/aboutStats';

type Row = { books: number; readers: number; matches: number };

export const getAboutStats = async (): Promise<AboutStats | null> => {
  const { data, error } = await createAnonClient().rpc('get_about_stats');
  const row = (data as Row[] | null)?.[0];
  if (error || !row) {
    console.error('[about] 통계 조회 실패:', error?.message ?? '빈 결과');
    return null;
  }
  return { books: Number(row.books), readers: Number(row.readers), matches: Number(row.matches) };
};
```

- [ ] **Step 7: 통과 확인** — 2 passed

- [ ] **Step 8: 숫자 UI**

```tsx
// A/src/widgets/about/ui/CountUp.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type CountUpProps = { to: number; unit: string };

/** 화면에 들어오면 0부터 센다. 서버 HTML 과 reduced-motion 은 최종 값 그대로 */
export const CountUp = ({ to, unit }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const f = (t: number) => {
        const k = Math.min(1, (t - start) / 1400);
        setN(Math.round(to * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(f);
      };
      raf = requestAnimationFrame(f);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);

  return <span ref={ref}>{n.toLocaleString('ko-KR')}{unit}</span>;
};
```

```tsx
// A/src/widgets/about/ui/StatsRow.tsx
import type { AboutStats } from '../model/aboutStats';

import { CountUp } from './CountUp';

type StatsRowProps = { stats: AboutStats };

export const StatsRow = ({ stats }: StatsRowProps) => (
  <dl className='mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-32 text-center md:grid-cols-3'>
    {[
      { value: stats.books, unit: '권', label: '지금까지 기록된 책' },
      { value: stats.readers, unit: '명', label: '함께 읽는 리더' },
      { value: stats.matches, unit: '번', label: '맞춰 본 독서 궁합' },
    ].map((s) => (
      <div key={s.label} className='flex flex-col-reverse'>
        <dt className='mt-1 text-base text-text-body'>{s.label}</dt>
        <dd className='text-5xl font-bold text-primary md:text-6xl'>
          <CountUp to={s.value} unit={s.unit} />
        </dd>
      </div>
    ))}
  </dl>
);
```

- [ ] **Step 9: 페이지 연결** — `Promise.all`에 `getAboutStats()` 추가, `<Highlights …/>` 바로 아래 `{stats && shouldShowStats(stats) && <StatsRow stats={stats} />}`.

- [ ] **Step 10: 확인** — 정적 검사·vitest. 로컬 DB는 기준 미달이라 숫자 섹션이 **안 보이는 것이 정상**. 임시로 `STATS_MIN`을 0으로 바꿔 보이는지 확인한 뒤 되돌린다.

- [ ] **Step 11: 개발 DB 적용 (PR 전 필수)** — 사용자 확인 후 `npx supabase db push`(개발 프로젝트 연결 상태 확인: `npx supabase projects list`에서 page0127-dev ACTIVE). 적용 전엔 CI E2E가 실패한다.

- [ ] **Step 12: Commit**

```bash
git add supabase/migrations/20261004000000_about_stats_rpc.sql apps/page0127/src/widgets/about "apps/page0127/app/(public)/about/page.tsx"
git commit -m "✨ Feat: 소개 페이지 숫자를 기준을 넘을 때만 보여 준다"
```

---

### Task 8: 업데이트 타임라인 · 마무리 CTA · 페이지 정리

**Files:**
- Create: `A/src/widgets/about/ui/UpdatesTimeline.tsx`, `A/src/widgets/about/ui/FinalCta.tsx`, `A/src/widgets/about/ui/FinalCta.module.css`
- Modify: `A/app/(public)/about/page.tsx` (남은 DocSection·`DocPage` import 전부 제거, 메타데이터 문구), `index.ts`

**Interfaces:**
- Consumes: `CHANGELOG: ChangelogEntry[]` (`@/widgets/landing/model/siteInfo`, 최신순) · `OAuthLoginButtons({ next?: string | null })` · `SectionHead`, `Reveal`
- Produces: `UpdatesTimeline({ limit?: number })` · `FinalCta({ covers }: { covers: (string | null)[] })`

- [ ] **Step 1: 타임라인** — 날짜는 지어내지 않는다. `CHANGELOG` 앞에서 5개.

```tsx
// A/src/widgets/about/ui/UpdatesTimeline.tsx
import { CHANGELOG } from '@/widgets/landing/model/siteInfo';

import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';

type UpdatesTimelineProps = { limit?: number };

/** CHANGELOG 는 최신순으로 쌓인다 — 순서를 바꾸지 않고 앞에서 자른다 */
export const UpdatesTimeline = ({ limit = 5 }: UpdatesTimelineProps) => (
  <section aria-labelledby='updates-title' className='bg-sunken px-4 py-32'>
    <SectionHead id='updates-title' label='업데이트' title='계속 자라는 중.' />
    <ol className='relative mx-auto mt-14 max-w-3xl before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-line'>
      {CHANGELOG.slice(0, limit).map((entry, i) => (
        <li key={entry.date} className='relative pb-9 pl-12'>
          <span aria-hidden='true' className={`absolute left-1 top-1.5 size-4 rounded-full border-[3px] ${i === 0 ? 'border-primary bg-primary ring-4 ring-accent' : 'border-line bg-card'}`} />
          <Reveal>
            <time className='text-sm font-bold text-primary'>{entry.date}</time>
            <p className='mt-1 text-xl font-bold text-text-strong'>{entry.title}</p>
            {entry.description && <p className='mt-1.5 text-balance text-base text-text-subtle'>{entry.description}</p>}
          </Reveal>
        </li>
      ))}
    </ol>
  </section>
);
```

> `text-xl`(20px)은 07의 `heading` 단계 크기다. 항목 제목을 h3 로 올리지 않는 이유: 섹션 안 목록 항목이라 제목 계층에 넣으면 목차가 길어진다.

- [ ] **Step 2: 마무리 CTA** — 실제 로그인 버튼을 그대로 쓴다(프로바이더 문구·색은 `providers`가 관리).

```tsx
// A/src/widgets/about/ui/FinalCta.tsx
import Image from 'next/image';

import { isPreOptimizedImageSrc } from '@repo/ui';

import { OAuthLoginButtons } from '@/features/auth/ui/OAuthLoginButtons';

import { Reveal } from './Reveal';

import styles from './FinalCta.module.css';

type FinalCtaProps = {
  /** 미리보기 책장에 세울 표지 4장 — 마지막 한 권이 떨어져 꽂힌다 */
  covers: (string | null)[];
};

export const FinalCta = ({ covers }: FinalCtaProps) => (
  <section aria-labelledby='final-title' className='px-4 py-28'>
    <Reveal>
      <div className='stage-blue mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-3xl px-6 py-12 text-white shadow-xl md:grid-cols-2 md:px-16 md:py-16'>
        <div>
          <h2 id='final-title' className='display-xl text-balance text-white'>
            오늘 읽은 한 권부터 꽂아 보세요.
          </h2>
          <p className='mt-4 text-base text-white/80'>가입하면 서재에서 다음 할 일을 하나씩 알려 드려요.</p>
          <div className='mt-8 max-w-sm'>
            <OAuthLoginButtons next='/dashboard' />
          </div>
          <p className='mt-5 flex flex-wrap gap-4 text-sm text-white/80'>
            <span>✓ 무료</span>
            <span>✓ 10초 가입</span>
            <span>✓ 언제든 탈퇴</span>
          </p>
        </div>

        {/* 장식 — 가입하면 이렇게 한 권이 꽂힌다는 장면 */}
        <div aria-hidden='true' className='relative hidden h-80 md:block'>
          <div className={`absolute right-0 top-2 rounded-2xl bg-card px-4 py-3 text-sm text-text-strong shadow-xl ${styles.toast}`}>
            <b>+1 방금 꽂았어요</b>
            <span className='block text-xs text-text-subtle'>혜진님의 서재 · 13번째 책</span>
          </div>
          <ul className='absolute inset-x-0 bottom-10 flex items-end justify-center gap-2.5 border-b-[10px] border-white/25'>
            {covers.slice(0, 4).map((src, i) => (
              <li key={i} className={i === 3 ? styles.drop : undefined}>
                {src ? (
                  <Image src={src} alt='' width={78} height={117} unoptimized={isPreOptimizedImageSrc(src)} className='aspect-[2/3] w-20 rounded-sm object-cover shadow-xl' />
                ) : (
                  <span className='block aspect-[2/3] w-20 rounded-sm bg-white/20' />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  </section>
);
```

```css
/* A/src/widgets/about/ui/FinalCta.module.css */
/* 마지막 한 권이 위에서 떨어져 꽂힌다 — 꽂힌 채로 머물다 사라지고 다시 떨어진다 */
.drop {
  animation: drop 3.2s cubic-bezier(0.2, 1.2, 0.4, 1) infinite;
}

.toast {
  animation: bob 3.2s ease-in-out infinite;
}

@keyframes drop {
  0% { transform: translateY(-160px) rotate(-8deg); opacity: 0; }
  25%, 85% { transform: none; opacity: 1; }
  100% { transform: none; opacity: 0; }
}

@keyframes bob {
  50% { transform: translateY(-6px); }
}

@media (prefers-reduced-motion: reduce) {
  .drop,
  .toast {
    animation: none;
  }
}
```

> `next='/dashboard'`: `/dashboard`는 로그인 후 `/{username}`(내 서재)으로 보내는 기존 리다이렉트다 — 코치 팁이 거기서 시작한다.
> Files 목록에 `A/src/widgets/about/ui/FinalCta.module.css`를 더한다. `border-b-[10px]`·`h-80`은 레이아웃 치수라 07 글자 규칙 대상이 아니다.

- [ ] **Step 3: 페이지 최종 조립** — `page.tsx` 전체:

```tsx
import { TasteExampleCard } from '@/widgets/landing/ui/TasteExampleCard';
import { AboutHero, FinalCta, Highlights, Manifesto, StatsRow, StepsShowcase, UpdatesTimeline } from '@/widgets/about';
import { getAboutStats } from '@/widgets/about/api/getAboutStats';
import { getRecentBooks } from '@/widgets/about/api/getRecentBooks';
import { getWeeklyTop } from '@/widgets/about/api/getWeeklyTop';
import { shouldShowStats } from '@/widgets/about/model/aboutStats';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '소개 | page0127.',
  description: '읽은 책을 꽂아 두면 책장이 쌓이고, 그 책장이 독서 취향을 말해 줍니다. 기록 → 목표 → 취향 분석, 세 걸음으로 시작하세요.',
};

// 표지·랭킹·통계는 한 시간에 한 번만 새로 만든다
export const revalidate = 3600;

const AboutPage = async () => {
  const [books, top, stats] = await Promise.all([getRecentBooks(), getWeeklyTop(), getAboutStats()]);

  return (
    <div className='bg-background'>
      <AboutHero books={books} />
      <Manifesto />
      <StepsShowcase books={books} tasteSlot={<TasteExampleCard />} />
      <Highlights books={books} top={top} />
      {stats && shouldShowStats(stats) && <StatsRow stats={stats} />}
      <UpdatesTimeline />
      <FinalCta covers={books.map((b) => b.coverImage).slice(-4)} />
    </div>
  );
};

export default AboutPage;
```

`index.ts`에 `FinalCta`, `Highlights`, `Manifesto`, `StatsRow`, `StepsShowcase`, `UpdatesTimeline` export를 모두 둔다. 기존 "누가 만들었나요"·"무엇이 바뀌었나요" DocSection과 `DocPage`·`DocSection`·`SITE_INFO` import는 삭제(스펙 §3 삭제 항목).

- [ ] **Step 4: 확인** — 정적 검사 전부 + `npx vitest run` 전체, dev에서 h1이 하나인지(`document.querySelectorAll('h1').length === 1`), 다크 모드(시스템 설정 전환)에서 회색 면·파란 무대 대비 확인.

- [ ] **Step 5: Commit**

```bash
git add apps/page0127/src/widgets/about "apps/page0127/app/(public)/about/page.tsx"
git commit -m "✨ Feat: 소개 페이지를 업데이트 타임라인과 가입 버튼으로 마무리한다"
```

---

### Task 9: 랜딩 진입 링크 · e2e

**Files:**
- Modify: `A/app/(public)/page.tsx` (하단 비로그인 밴드)
- Create: `A/e2e/about.spec.ts`

**Interfaces:**
- Consumes: `/about#steps` 앵커, 탭 id `step-tab-0..2`, 패널 id `step-panel`, 재생 버튼 이름 "자동 재생 일시정지/시작"

- [ ] **Step 1: 랜딩 링크** — `page.tsx`의 `{!user && ( <section className='band-strong …'> … <StartCtaButton …/> …` 안, `StartCtaButton`을 감싼 `div` 다음에:

```tsx
<Link href='/about#steps' className='text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline'>
  처음이세요? 어떻게 쓰는지 보기
</Link>
```

(`import Link from 'next/link';` 추가 — import 순서 규칙: React → Next → 외부 → 내부)

- [ ] **Step 2: e2e 작성**

```ts
// A/e2e/about.spec.ts
import { expect, test } from '@playwright/test';

/**
 * 소개 페이지 — 첫 화면과 세 걸음 탭의 접근성.
 * 자동 재생 규칙은 WCAG 2.2.2 (스펙 §4).
 */

test('첫 화면 제목이 JS 를 기다리지 않고 보인다', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
});

test('세 걸음 탭: 화살표로 이동하고 직접 고르면 자동 재생이 멈춘다', async ({ page }) => {
  await page.goto('/about#steps');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(3);

  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'step-tab-1');
  await expect(page.getByRole('button', { name: '자동 재생 시작' })).toBeVisible();

  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');

  // 직접 골랐으니 6초 뒤에도 그대로여야 한다
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.waitForTimeout(6000);
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
});

test('움직임 줄이기: 자동 재생하지 않고 완성된 화면을 보여 준다', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/about#steps');
  await expect(page.getByRole('button', { name: '자동 재생 시작' })).toBeVisible();
  await expect(page.getByLabel('별점 4점')).toBeVisible();
  await page.waitForTimeout(6000);
  await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
  await context.close();
});
```

- [ ] **Step 3: 실행**

Run: `cd /Users/dreamfulbud/Desktop/stronger/0127-about/apps/page0127 && npx playwright test e2e/about.spec.ts`
Expected: 3 passed. (3000 포트에 다른 worktree의 dev 서버가 떠 있으면 그 서버를 재사용하므로 먼저 내린다.)

- [ ] **Step 4: 전체 회귀**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src/widgets/about "app/(public)" e2e/about.spec.ts && npx playwright test e2e/public-pages.spec.ts e2e/about.spec.ts`
Expected: 모두 통과.

- [ ] **Step 5: Commit**

```bash
git add "apps/page0127/app/(public)/page.tsx" apps/page0127/e2e/about.spec.ts
git commit -m "✅ Test: 소개 페이지 세 걸음 탭의 키보드·자동 재생 규칙을 e2e로 지킨다"
```
