# 서재(프로필) 페이지 재구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/[username]` 연도 뷰를 "누구 · 성향 · 올해 몇 권 → 책장 → 균형 → 달력" 순서로 재구성하고, 월 이동 시 항상 0권이던 캘린더를 이미 받은 책 목록으로 다시 그린다.

**Architecture:** 페이지가 이미 내려받는 `books` 로 달력·속도·균형을 **순수 함수**(`entities/book/model`)에서 계산하고, UI 는 그 결과만 그린다. 새 네트워크 조회는 취향 이력 RPC(`get_public_taste_history`) 하나. 옛 캘린더 위젯과 `/api/books/calendar` 는 삭제한다.

**Tech Stack:** Next.js 16 App Router · React 19 (React Compiler) · TypeScript strict · Tailwind + `@repo/ui` · Supabase(Postgres RLS, RPC) · vitest(node, `renderToStaticMarkup`) · Playwright · recharts(기존 레이더만)

**Spec:** `docs/superpowers/specs/2026-10-13-profile-library-redesign-design.md`

## Global Constraints

- 커밋·푸시는 **사용자 전용**. 각 Task 의 "Commit" 단계는 `git add` 까지 하고 **사용자에게 커밋 여부를 묻는다.** 커밋 메시지에 `Co-Authored-By` 트레일러 금지.
- 커밋 메시지 형식: `{gitmoji} {타입}: {제목}` (예: `✨ Feat: …`, `🐛 Fix: …`, `🔥 Remove: …`, `♻️ Refactor: …`, `🗃️` 대신 DB 는 `✨ Feat`).
- `type` 만 쓰고 `interface` 금지 · `any` 금지 · `console.log` 금지 · Props 타입은 컴포넌트 바로 위 `type XxxProps`.
- import 순서: React → Next → 외부 → `@repo/*` → `@/shared` → `@/entities` → `@/features` → `@/widgets` → 상대 → 타입 → 스타일. 그룹 사이 빈 줄.
- 화살표 함수 + named export (주변 코드 관례).
- 색은 디자인 토큰만: 시맨틱 클래스(`bg-card`, `bg-sunken`, `bg-accent`, `text-text-strong|body|subtle`, `border-line-soft`, `text-primary`) + 차트 `var(--chart-1)`~`var(--chart-7)`. 새 색 상수·새 라이브러리 금지.
- 한국어 주석은 학습 포인트·이유가 있는 곳에만.
- 문구는 **진행형**. 판단형("기울었어요") 금지 (2026-10-08 반려 기록).
- 예상 독서 시간 규칙은 기존과 같은 **1분/쪽**.
- 날짜는 `YYYY-MM-DD` 문자열로 비교. "오늘"은 서버(`page.tsx`)에서 `Asia/Seoul` 기준으로 한 번 만들어 props 로 내린다(SSR/CSR 불일치 방지).
- 터미널 명령: `cd` 금지(절대 경로), `;` 대신 `&&`, `$( )`·heredoc·인라인 스크립트 금지.
- ESLint autofix 는 바꾼 파일에만: `npx eslint <경로> --fix`.
- 앱 디렉터리 = `/Users/dreamfulbud/Desktop/stronger/0127/apps/page0127` (아래 `APP`). 명령은 `npm --prefix APP run …`.

## Review Focus

1. **연초(1월 첫 주)·연말(12/31)·윤년** — 경과율이 0에 가깝거나 남은 일수가 0이면 예상 권수·주당 권수가 튀거나 0으로 나뉜다 → Task 2 테스트로 고정.
2. **시작일 > 완독일(입력 실수), 시작일만 있고 상태가 want_to_read** — 막대를 그리지 않아야 한다 → Task 5 테스트.
3. **한 달 안에 기간 4권 이상 겹침 / 같은 날 3권 완독** — 3줄 + `+N`, 표지 겹침 + `+N` → Task 5 테스트.
4. **방문자 화면에 비공개 책이 새는 경로** — 달력(방문자 입력은 공개만), 비공개 펼치기(주인만), 취향 RPC(설명·싫어하는 패턴 미노출) → Task 1·6·7 테스트와 Task 10 e2e.
5. **책이 0권·1~2권인 새 사용자** — 균형 점수 null, 요약은 "목표 없음" 문구, 달력은 빈 칸만, 취향 카드는 주인 자리표시/방문자 숨김 → Task 2·4·8 테스트.

---

## File Structure

| 파일 | 책임 | Task |
| --- | --- | --- |
| `src/entities/book/model/createTestBook.ts` (신규) | 테스트용 `Book` 픽스처 | 1 |
| `src/entities/book/model/libraryPeriod.ts` | `resolveDefaultLibraryYear`, `getSeoulToday` 추가 | 1 |
| `src/widgets/library/PrivateBooksDisclosure.tsx` (신규) | 🔒 비공개 책 펼치기 | 1 |
| `src/entities/book/model/readingPace.ts` (신규) | 목표 대비 속도 | 2 |
| `src/entities/book/model/readingBalance.ts` (신규) | 분야 균형 | 2 |
| `src/features/stats/model/paceMessage.ts` (신규) | 속도 → 한마디 문구 | 3 |
| `src/features/stats/ui/YearSummary.tsx` (신규) | ② 올해 요약 | 3 |
| `src/features/stats/model/balanceCopy.ts` (신규) | 균형 → 문구 | 4 |
| `src/features/stats/ui/ReadingBalanceCard.tsx` (신규) | ⑤ 독서 균형 | 4 |
| `src/entities/book/model/calendarMonth.ts` (신규) | 달력 한 달 계산 | 5 |
| `src/widgets/library/ReadingCalendar.tsx` (신규) | ⑥ 달력 | 6 |
| `src/features/stats/ui/RatingSummaryCard.tsx` (신규) | ⑥ 평점 + 인생책 | 6 |
| `supabase/migrations/20261013000000_public_taste_history_rpc.sql` (신규) | 취향 공개 RPC | 7 |
| `src/entities/taste-analysis/api/getPublicTasteHistory.ts` (신규) | RPC 호출 | 7 |
| `src/entities/taste-analysis/model/groupTasteHistory.ts` (신규) | 연속 성향 묶기 | 7 |
| `src/features/taste-analysis/ui/TasteProfileCard.tsx` (신규) | ① 취향 카드 | 8 |
| `src/widgets/public-library/PublicLibraryHeader.tsx` | 헤더 재배치 | 8 |
| `src/widgets/book/ui/PublicBookShelf.tsx` + `.module.css` | 책장 강화 | 9 |
| `src/features/stats/ui/DashboardBookList.tsx` | 보기 전환 글자 · 월 필터 제거 | 9·10 |
| `src/widgets/library/LibraryView.tsx` | 연도 뷰 배치 | 1·3·4·6·10 |
| `src/widgets/public-library/PublicLibraryContent.tsx` | 기본 연도·데이터 전달 | 1·3·6·8 |
| `app/(public)/[username]/page.tsx` | today·RPC 조회·calendarSlot 제거 | 3·6·7 |

---

### Task 1: 기본 연도 = 올해 + 비공개 책 펼치기

**Files:**
- Create: `APP/src/entities/book/model/createTestBook.ts`
- Modify: `APP/src/entities/book/model/libraryPeriod.ts` (파일 끝에 함수 2개 추가)
- Modify: `APP/src/entities/book/index.ts` (export 추가)
- Create: `APP/src/entities/book/model/defaultLibraryYear.test.ts`
- Create: `APP/src/widgets/library/PrivateBooksDisclosure.tsx`
- Create: `APP/src/widgets/library/PrivateBooksDisclosure.test.tsx`
- Modify: `APP/src/widgets/public-library/PublicLibraryContent.tsx:76-83, 88, 197-226`
- Modify: `APP/src/widgets/library/LibraryView.tsx` (props `privateBooks`, `bookShelf` 안에 렌더)

**Interfaces:**
- Produces: `createTestBook(overrides?: Partial<Book>): Book`
- Produces: `resolveDefaultLibraryYear(books: Book[], currentYear: number): number`
- Produces: `getSeoulToday(date?: Date): string` — `'YYYY-MM-DD'`
- Produces: `PrivateBooksDisclosure({ books, username }: { books: Book[]; username: string })`
- Produces: `LibraryView` 새 prop `privateBooks?: Book[]`

- [ ] **Step 1: 테스트 픽스처 만들기**

`APP/src/entities/book/model/createTestBook.ts`:

```ts
import type { Book } from '../types';

/**
 * 테스트 전용 Book 픽스처.
 * isbn 을 매번 새로 만든다 — 통계는 같은 ISBN 을 한 책의 회독으로 합치므로
 * 고정값이면 서로 다른 책이 한 권으로 뭉친다. 재독을 테스트하려면 isbn 을 같게 준다.
 */
export const createTestBook = (overrides: Partial<Book> = {}): Book => ({
  id: crypto.randomUUID(),
  user_id: 'user-id',
  isbn: crypto.randomUUID(),
  title: '테스트 책',
  sub_title: null,
  source: null,
  provider_item_id: null,
  thickness_mm: null,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  description: null,
  pub_date: null,
  category: '소설',
  page_count: 100,
  toc: null,
  status: 'completed',
  read_count: 1,
  start_date: null,
  completed_date: null,
  rating: null,
  is_life_book: false,
  one_line_review: null,
  personal_memo: null,
  tags: null,
  is_public: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});
```

- [ ] **Step 2: 실패하는 테스트 작성**

`APP/src/entities/book/model/defaultLibraryYear.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createTestBook } from './createTestBook';
import { getSeoulToday, resolveDefaultLibraryYear } from './libraryPeriod';

describe('resolveDefaultLibraryYear', () => {
  it('올해 서재에 책이 있으면 올해', () => {
    const books = [
      createTestBook({ completed_date: '2026-03-01' }),
      createTestBook({ completed_date: '2025-03-01' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2026);
  });

  it('올해가 비어 있으면 책이 있는 가장 최근 해', () => {
    const books = [
      createTestBook({ completed_date: '2024-03-01' }),
      createTestBook({ completed_date: '2025-12-31' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2025);
  });

  it('읽고 싶어요만 있는 해는 비어 있는 것으로 본다 — 날짜 없는 위시리스트는 항상 올해로 잡히기 때문', () => {
    const books = [
      createTestBook({ status: 'want_to_read' }),
      createTestBook({ completed_date: '2025-05-01' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2025);
  });

  it('날짜 없이 읽는 중인 책은 올해 서재에 있다', () => {
    const books = [
      createTestBook({ status: 'reading' }),
      createTestBook({ completed_date: '2025-05-01' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2026);
  });

  it('책이 하나도 없으면 올해', () => {
    expect(resolveDefaultLibraryYear([], 2026)).toBe(2026);
  });
});

describe('getSeoulToday', () => {
  it('한국 시간 기준 날짜 문자열을 돌려준다', () => {
    // UTC 15:00 = KST 다음 날 00:00
    expect(getSeoulToday(new Date('2026-12-31T15:00:00.000Z'))).toBe(
      '2027-01-01'
    );
    expect(getSeoulToday(new Date('2026-10-13T03:00:00.000Z'))).toBe(
      '2026-10-13'
    );
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/book/model/defaultLibraryYear.test.ts`
Expected: FAIL — `resolveDefaultLibraryYear is not a function` (또는 export 없음)

- [ ] **Step 4: 구현** — `libraryPeriod.ts` 끝에 추가

```ts
/**
 * 서재 첫 화면에 보일 연도.
 *
 * 올해 책장이 비어 있으면(1월 초처럼) 올해를 보여 주는 대신 기록이 있는 가장 최근 해를 연다.
 * 읽고 싶어요는 세지 않는다 — 날짜가 없으면 getBookLibraryYear 가 항상 올해로 넣어서,
 * 위시리스트만 있어도 "올해 책장"이 차 있다고 착각하게 된다.
 */
export const resolveDefaultLibraryYear = (
  books: Book[],
  currentYear: number
): number => {
  const shelfYears = books
    .filter((book) => book.status !== 'want_to_read')
    .map((book) => getBookLibraryYear(book, currentYear));

  if (shelfYears.length === 0 || shelfYears.includes(currentYear)) {
    return currentYear;
  }
  return Math.max(...shelfYears);
};

/** 한국 시간 기준 오늘 — 'YYYY-MM-DD' (en-CA 로케일이 이 형식을 준다) */
export const getSeoulToday = (date: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
```

`APP/src/entities/book/index.ts` 의 libraryPeriod export 블록을 교체:

```ts
export {
  calculateBookStats,
  filterBooksByLibraryYear,
  getBookLibraryYear,
  getCurrentLibraryYear,
  getLibraryYears,
  getSeoulToday,
  resolveDefaultLibraryYear,
} from './model/libraryPeriod';
```

- [ ] **Step 5: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/book/model/defaultLibraryYear.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: PrivateBooksDisclosure 실패 테스트**

`APP/src/widgets/library/PrivateBooksDisclosure.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { PrivateBooksDisclosure } from './PrivateBooksDisclosure';

describe('PrivateBooksDisclosure', () => {
  it('비공개 책이 없으면 아무것도 그리지 않는다', () => {
    expect(
      renderToStaticMarkup(<PrivateBooksDisclosure books={[]} username='me' />)
    ).toBe('');
  });

  it('권수와 "방문자에게는 안 보여요"를 보여 주고, 처음엔 접혀 있다', () => {
    const books = [
      createTestBook({ is_public: false, title: '비밀 책 A' }),
      createTestBook({ is_public: false, title: '비밀 책 B' }),
    ];
    const html = renderToStaticMarkup(
      <PrivateBooksDisclosure books={books} username='me' />
    );
    expect(html).toContain('나만 보는 비공개 책');
    expect(html).toContain('2권');
    expect(html).toContain('방문자에게는 안 보여요');
    expect(html).toContain('aria-expanded="false"');
    // 접힌 상태에서는 책장을 그리지 않는다
    expect(html).not.toContain('비밀 책 A');
  });
});
```

- [ ] **Step 7: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/widgets/library/PrivateBooksDisclosure.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 8: 구현**

`APP/src/widgets/library/PrivateBooksDisclosure.tsx`:

```tsx
'use client';

import { useState } from 'react';

import { ChevronDown, Lock } from 'lucide-react';

import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';

import type { Book } from '@/entities/book';

type PrivateBooksDisclosureProps = {
  /** 비공개(is_public=false) 책 — 주인 화면에서만 넘어온다 */
  books: Book[];
  username: string;
};

/**
 * 책장 카드 맨 아래 "🔒 비공개 책 N권 펼치기".
 *
 * 예전에는 책장 밖에 '책장 / 보관' 버튼 두 개가 떠 있었는데, '보관'이 무엇인지 알 수 없었고
 * '책장' 버튼은 눌러도 바뀌는 게 없었다. 비공개 책은 책장의 일부이므로 책장 안으로 넣는다.
 */
export const PrivateBooksDisclosure = ({
  books,
  username,
}: PrivateBooksDisclosureProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (books.length === 0) return null;

  return (
    <div className='border-t border-line-soft pt-3'>
      <button
        type='button'
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className='flex items-center gap-1.5 text-sm text-text-body hover:text-text-strong'
      >
        <Lock className='size-3.5' aria-hidden />
        나만 보는 비공개 책 <strong>{books.length}권</strong>
        <ChevronDown
          className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
        <span className='ml-1 text-xs text-text-subtle'>
          방문자에게는 안 보여요
        </span>
      </button>

      {isOpen && (
        <PublicBookShelf
          books={books}
          username={username}
          bookHref={(book) => `/${username}/${book.id}`}
          compact
        />
      )}
    </div>
  );
};
```

- [ ] **Step 9: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/widgets/library/PrivateBooksDisclosure.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 10: PublicLibraryContent — 기본 연도 + 보관 버튼 제거**

`PublicLibraryContent.tsx` 에서:

1. import 정리 — `Button`, `Archive`, `Library` 제거. `@/entities/book` import 에 `resolveDefaultLibraryYear` 추가.
2. 76~83행(연도 파싱)을 교체:

```tsx
  const yearParam = searchParams.get('year');
  // 위시리스트는 내 서재에서만, 연도와 무관한 별도 탭이다
  const isWishlistView = isOwnProfile && yearParam === 'wishlist';
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  // 기본은 올해(비었으면 가장 최근 해) — '전체'는 ?year=all 로만 들어간다
  const isAllView = yearParam === 'all' || isWishlistView;
  const defaultYear = useMemo(
    () => resolveDefaultLibraryYear(books, currentYear),
    [books, currentYear]
  );
  const selectedYear =
    !isAllView && Number.isInteger(parsedYear) ? parsedYear : defaultYear;
  const selectedPeriod = isAllView ? null : selectedYear;
```

3. `const [showArchived, setShowArchived] = useState(false);` 삭제.
4. `<LibraryView … />` 에 prop 추가: `privateBooks={isOwnProfile ? archivedBooks : []}`
5. 197~226행 `{!isWishlistView && isOwnProfile && archivedBooks.length > 0 && ( … )}` 블록 전체 삭제.
6. 더 이상 안 쓰는 `PublicBookShelf` import 삭제.

- [ ] **Step 11: LibraryView — 책장 안에 펼치기**

`LibraryView.tsx`:

1. import 추가: `import { PrivateBooksDisclosure } from './PrivateBooksDisclosure';`
2. `LibraryViewProps` 에 추가:

```ts
  /** 주인에게만 보이는 비공개 책 — 책장 맨 아래 펼치기로 노출 (방문자는 빈 배열) */
  privateBooks?: Book[];
```

3. 구조 분해에 `privateBooks = [],` 추가.
4. `bookShelf` 의 `</section>` 바로 뒤(=`DashboardBookList` 를 감싼 section 다음)에:

```tsx
      {username && (
        <PrivateBooksDisclosure books={privateBooks} username={username} />
      )}
```

- [ ] **Step 12: 타입·린트·전체 테스트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets/library /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets/public-library /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/entities/book && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test`
Expected: 에러 0, 테스트 전부 PASS

- [ ] **Step 13: 스테이징 후 사용자에게 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src/entities/book apps/page0127/src/widgets/library/PrivateBooksDisclosure.tsx apps/page0127/src/widgets/library/PrivateBooksDisclosure.test.tsx apps/page0127/src/widgets/library/LibraryView.tsx apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx
```

제안 메시지: `✨ Feat: 서재 기본 탭을 올해로 열고 비공개 책을 책장 안에서 펼친다`

---

### Task 2: 순수 함수 — 목표 속도 · 분야 균형

**Files:**
- Create: `APP/src/entities/book/model/readingPace.ts`, `readingPace.test.ts`
- Create: `APP/src/entities/book/model/readingBalance.ts`, `readingBalance.test.ts`
- Modify: `APP/src/entities/book/index.ts`

**Interfaces:**
- Produces:

```ts
export type ReadingPaceState =
  | 'met' | 'ahead' | 'on_track' | 'behind' | 'far_behind'
  | 'early' | 'no_goal' | 'past_met' | 'past_missed';
export type ReadingPace = {
  state: ReadingPaceState;
  elapsed: number;          // 0~1, 올해 경과율
  expected: number;         // 소수 1자리, 목표 × 경과율
  gap: number;              // 정수, completed − expected 반올림
  projected: number | null; // 정수, 지금 속도로 12/31 예상 — early·과거·목표 없음은 null
  weeksLeft: number;        // 소수 1자리
  perWeek: number;          // 소수 1자리, 목표까지 주당 필요 권수 (달성 시 0)
  perMonth: number;         // 소수 1자리, 월 평균 완독
  surplus: number;          // 목표 초과 권수 (달성 시), 아니면 0
};
export const getReadingPace: (input: {
  completed: number; target: number; year: number; today: string;
}) => ReadingPace;

export const BALANCE_CATEGORIES: readonly BalanceCategory[]; // 기타 제외 9개
export type BalanceCategory = Exclude<MainCategory, '기타'>;
export type ReadingBalance = {
  categories: { category: BalanceCategory; count: number }[]; // 9개, 고정 순서
  ranked: { category: BalanceCategory; count: number; share: number }[]; // 1권 이상, 많은 순
  total: number;            // 기타 제외 완독 권수
  readCount: number;        // 1권 이상 분야 수
  topShare: number;         // 상위 2개 비율 0~100 정수
  score: number | null;     // 0~100, total < 3 이면 null
  zero: BalanceCategory[];
  prev: { readCountDelta: number; newCategories: BalanceCategory[] } | null;
};
export const calculateReadingBalance: (books: Book[], prevYearBooks?: Book[]) => ReadingBalance;
```

- [ ] **Step 1: readingPace 실패 테스트**

`APP/src/entities/book/model/readingPace.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { getReadingPace } from './readingPace';

// 2026-10-13 = 286번째 날 / 365, 남은 79일
const OCT13 = { year: 2026, today: '2026-10-13' };

describe('getReadingPace', () => {
  it('조금 뒤처짐 — 지금 속도 예상과 주당 필요 권수', () => {
    const pace = getReadingPace({ completed: 14, target: 40, ...OCT13 });
    expect(pace.state).toBe('behind');
    expect(pace.projected).toBe(18);
    expect(pace.weeksLeft).toBe(11.3);
    expect(pace.perWeek).toBe(2.3);
    expect(pace.expected).toBe(31.3);
    expect(pace.gap).toBe(-17);
  });

  it('주당 3권 넘게 필요하면 많이 뒤처짐', () => {
    expect(getReadingPace({ completed: 5, target: 40, ...OCT13 }).state).toBe(
      'far_behind'
    );
  });

  it('1권 이상 앞서면 앞섬', () => {
    const pace = getReadingPace({ completed: 35, target: 40, ...OCT13 });
    expect(pace.state).toBe('ahead');
    expect(pace.gap).toBe(4);
    expect(pace.projected).toBe(45);
  });

  it('예상 위치와 1권 미만 차이면 딱 맞음', () => {
    expect(getReadingPace({ completed: 31, target: 40, ...OCT13 }).state).toBe(
      'on_track'
    );
  });

  it('목표 이상이면 달성 + 초과 권수', () => {
    const pace = getReadingPace({ completed: 42, target: 40, ...OCT13 });
    expect(pace.state).toBe('met');
    expect(pace.surplus).toBe(2);
    expect(pace.perWeek).toBe(0);
  });

  it('연초(경과율 4% 미만)에는 예상 권수를 만들지 않는다', () => {
    const pace = getReadingPace({
      completed: 1,
      target: 40,
      year: 2026,
      today: '2026-01-07',
    });
    expect(pace.state).toBe('early');
    expect(pace.projected).toBeNull();
    expect(pace.perWeek).toBe(0.8);
  });

  it('12월 31일에도 0으로 나누지 않는다 (남은 일수 최소 1일)', () => {
    // 2권 남았는데 하루 남음 → 주당 14권 → '빠듯해요'가 맞는 말
    const pace = getReadingPace({
      completed: 38,
      target: 40,
      year: 2026,
      today: '2026-12-31',
    });
    expect(pace.weeksLeft).toBe(0.1);
    expect(pace.perWeek).toBe(14);
    expect(pace.state).toBe('far_behind');
  });

  it('윤년 12월 31일은 366번째 날', () => {
    const pace = getReadingPace({
      completed: 10,
      target: 0,
      year: 2028,
      today: '2028-12-31',
    });
    expect(pace.elapsed).toBe(1);
    expect(pace.perMonth).toBe(0.8);
  });

  it('목표가 없으면 월 평균만', () => {
    const pace = getReadingPace({ completed: 14, target: 0, ...OCT13 });
    expect(pace.state).toBe('no_goal');
    expect(pace.perMonth).toBe(1.5);
    expect(pace.projected).toBeNull();
  });

  it('지난해는 결과로 확정한다', () => {
    const base = { year: 2025, today: '2026-10-13' };
    expect(getReadingPace({ completed: 36, target: 40, ...base }).state).toBe(
      'past_missed'
    );
    expect(getReadingPace({ completed: 41, target: 40, ...base }).state).toBe(
      'past_met'
    );
    expect(getReadingPace({ completed: 12, target: 0, ...base }).perMonth).toBe(
      1
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/book/model/readingPace.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`APP/src/entities/book/model/readingPace.ts`:

```ts
/**
 * 올해 목표 대비 독서 속도.
 *
 * 학습 포인트:
 * - 날짜는 'YYYY-MM-DD' 문자열을 Date.UTC 로만 읽는다 → 실행 환경의 타임존과 무관하다.
 *   (new Date('2026-10-13') 를 로컬 시간으로 다루면 서버/브라우저에서 하루가 어긋날 수 있다)
 * - 문구는 여기서 만들지 않는다. 상태와 숫자만 내고, 말투는 UI(features/stats/model/paceMessage)가 정한다.
 */
export type ReadingPaceState =
  | 'met'
  | 'ahead'
  | 'on_track'
  | 'behind'
  | 'far_behind'
  | 'early'
  | 'no_goal'
  | 'past_met'
  | 'past_missed';

export type ReadingPace = {
  state: ReadingPaceState;
  elapsed: number;
  expected: number;
  gap: number;
  projected: number | null;
  weeksLeft: number;
  perWeek: number;
  perMonth: number;
  surplus: number;
};

type ReadingPaceInput = {
  completed: number;
  target: number;
  year: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' */
  today: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** 이보다 이른 시점(1월 첫 2주 남짓)의 예상 권수는 한두 권에 크게 흔들린다 */
const EARLY_ELAPSED = 0.04;
/** 주당 이만큼 넘게 필요하면 '많이 뒤처짐' */
const FAR_BEHIND_PER_WEEK = 3;

const round1 = (value: number) => Math.round(value * 10) / 10;

const daysInYear = (year: number) =>
  (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS;

const dayOfYear = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY_MS + 1;
};

export const getReadingPace = ({
  completed,
  target,
  year,
  today,
}: ReadingPaceInput): ReadingPace => {
  const todayYear = Number(today.slice(0, 4));
  const total = daysInYear(year);
  const isPast = year < todayYear;
  const passed = isPast ? total : year > todayYear ? 0 : dayOfYear(today);
  const elapsed = passed / total;

  // 남은 일수는 최소 1일 — 12/31 에도 "오늘 하루"는 남아 있다(0 으로 나누지 않기)
  const daysLeft = isPast ? 0 : Math.max(total - passed, 1);
  const weeksLeft = round1(daysLeft / 7);
  const remaining = Math.max(target - completed, 0);
  const perWeek = daysLeft > 0 ? round1(remaining / (daysLeft / 7)) : 0;
  const perMonth = elapsed > 0 ? round1(completed / (elapsed * 12)) : 0;
  const expected = round1(target * elapsed);
  const gap = Math.round(completed - target * elapsed);
  const surplus = target > 0 ? Math.max(completed - target, 0) : 0;

  const base = {
    elapsed,
    expected,
    gap,
    weeksLeft,
    perWeek,
    perMonth,
    surplus,
  };

  if (target <= 0) return { ...base, state: 'no_goal', projected: null };
  if (isPast) {
    return {
      ...base,
      state: completed >= target ? 'past_met' : 'past_missed',
      projected: null,
    };
  }
  if (completed >= target) return { ...base, state: 'met', projected: null };
  if (elapsed < EARLY_ELAPSED) {
    return { ...base, state: 'early', projected: null };
  }

  const projected = Math.round(completed / elapsed);
  const diff = completed - target * elapsed;

  if (diff >= 1) return { ...base, state: 'ahead', projected };
  if (Math.abs(diff) < 1) return { ...base, state: 'on_track', projected };
  if (perWeek > FAR_BEHIND_PER_WEEK) {
    return { ...base, state: 'far_behind', projected };
  }
  return { ...base, state: 'behind', projected };
};
```

> 기대값 검산(10/13 = 286일째/365, 남은 79일): elapsed 0.7836 · expected 31.3 · projected round(14 ÷ 0.7836) = 18 ·
> weeksLeft 79/7 = 11.3 · perWeek 26 ÷ 11.286 = 2.3. 12/31 은 남은 일수 최소 1일 → weeksLeft 0.1 · perWeek 2 ÷ (1/7) = 14.

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/book/model/readingPace.test.ts`
Expected: PASS (10 tests). 숫자가 다르면 구현을 고치기 전에 위 검산처럼 **손계산**으로 어느 쪽이 맞는지 먼저 판단한다.

- [ ] **Step 5: readingBalance 실패 테스트**

`APP/src/entities/book/model/readingBalance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createTestBook } from './createTestBook';
import { BALANCE_CATEGORIES, calculateReadingBalance } from './readingBalance';

const books = (category: string, count: number) =>
  Array.from({ length: count }, () =>
    createTestBook({ category, completed_date: '2026-05-01' })
  );

// 소설5 · 자기계발4 · 에세이2 · 경제2 · 컴퓨터1 = 14권
const SAMPLE = [
  ...books('국내도서>소설/시/희곡>한국소설', 5),
  ...books('국내도서>자기계발>성공', 4),
  ...books('국내도서>에세이', 2),
  ...books('국내도서>경제경영>마케팅', 2),
  ...books('국내도서>컴퓨터/모바일>프로그래밍', 1),
];

describe('calculateReadingBalance', () => {
  it('기타를 뺀 9개 분야를 고정 순서로 센다 (레이더 축)', () => {
    const balance = calculateReadingBalance(SAMPLE);
    expect(BALANCE_CATEGORIES).toHaveLength(9);
    expect(balance.categories.map((c) => c.category)).toEqual([
      ...BALANCE_CATEGORIES,
    ]);
    expect(balance.total).toBe(14);
    expect(balance.readCount).toBe(5);
  });

  it('많이 읽은 순 · 상위 2개 비율 · 0권 분야', () => {
    const balance = calculateReadingBalance(SAMPLE);
    expect(balance.ranked.map((r) => [r.category, r.count])).toEqual([
      ['소설/시/희곡', 5],
      ['자기계발', 4],
      ['에세이', 2],
      ['경제/경영', 2],
      ['컴퓨터/모바일', 1],
    ]);
    expect(balance.ranked[0].share).toBe(36);
    expect(balance.topShare).toBe(64);
    expect(balance.zero).toEqual(['인문학', '과학', '예술/대중문화', '역사']);
  });

  it('고른 정도 = 정규화 엔트로피 × 100', () => {
    expect(calculateReadingBalance(SAMPLE).score).toBe(67);
  });

  it('9개 분야를 한 권씩이면 100, 한 분야만이면 0', () => {
    const even = BALANCE_CATEGORIES.map((category) =>
      createTestBook({ category })
    );
    expect(calculateReadingBalance(even).score).toBe(100);
    expect(calculateReadingBalance(books('소설', 5)).score).toBe(0);
  });

  it('3권 미만이면 점수를 내지 않는다', () => {
    expect(calculateReadingBalance(books('소설', 2)).score).toBeNull();
  });

  it('기타(분류 불명)와 완독이 아닌 책은 세지 않는다', () => {
    const balance = calculateReadingBalance([
      createTestBook({ category: null }),
      createTestBook({ category: '국내도서>여행' }),
      createTestBook({ category: '소설', status: 'reading' }),
      ...books('소설', 3),
    ]);
    expect(balance.total).toBe(3);
  });

  it('작년 대비 — 분야 수 증감과 새로 읽은 분야', () => {
    const prev = [
      ...books('소설', 3),
      ...books('자기계발', 1),
      ...books('경제경영', 1),
      ...books('컴퓨터/모바일', 1),
    ];
    expect(calculateReadingBalance(SAMPLE, prev).prev).toEqual({
      readCountDelta: 1,
      newCategories: ['에세이'],
    });
  });

  it('작년 기록이 없으면 비교하지 않는다', () => {
    expect(calculateReadingBalance(SAMPLE, []).prev).toBeNull();
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/book/model/readingBalance.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 7: 구현**

`APP/src/entities/book/model/readingBalance.ts`:

```ts
import {
  MAIN_CATEGORIES,
  type MainCategory,
  mapToMainCategory,
} from '../../../shared/lib/categoryMapper';

import type { Book } from '../types';

/**
 * 분야 균형 — "고르게 읽고 있나".
 *
 * 학습 포인트: 고른 정도 = 정규화 섀넌 엔트로피.
 *   H = −Σ p·ln p (p = 그 분야 비율), 최댓값은 ln 9(9개 분야가 똑같을 때)
 *   score = H / ln 9 × 100 → 한 분야만 읽으면 0, 9개를 고르게 읽으면 100.
 * '기타'는 분류 불명이라 "새 분야를 읽었다"고 볼 수 없어 계산에서 뺀다.
 */
export type BalanceCategory = Exclude<MainCategory, '기타'>;

export const BALANCE_CATEGORIES = MAIN_CATEGORIES.filter(
  (category): category is BalanceCategory => category !== '기타'
);

export type ReadingBalance = {
  categories: { category: BalanceCategory; count: number }[];
  ranked: { category: BalanceCategory; count: number; share: number }[];
  total: number;
  readCount: number;
  topShare: number;
  score: number | null;
  zero: BalanceCategory[];
  prev: { readCountDelta: number; newCategories: BalanceCategory[] } | null;
};

/** 이보다 적으면 점수가 한 권에 크게 흔들려 의미가 없다 */
const MIN_BOOKS_FOR_SCORE = 3;

const countByCategory = (books: Book[]) => {
  const counts = new Map<BalanceCategory, number>(
    BALANCE_CATEGORIES.map((category) => [category, 0])
  );
  books
    .filter((book) => book.status === 'completed')
    .forEach((book) => {
      const category = mapToMainCategory(book.category);
      if (category === '기타') return;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
  return counts;
};

export const calculateReadingBalance = (
  books: Book[],
  prevYearBooks: Book[] = []
): ReadingBalance => {
  const counts = countByCategory(books);
  const categories = BALANCE_CATEGORIES.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
  const total = categories.reduce((sum, { count }) => sum + count, 0);

  // sort 는 안정 정렬 → 동률이면 BALANCE_CATEGORIES 순서가 유지된다
  const ranked = categories
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .map(({ category, count }) => ({
      category,
      count,
      share: Math.round((count / total) * 100),
    }));

  const readCount = ranked.length;
  const topShare =
    total > 0
      ? Math.round(
          (ranked.slice(0, 2).reduce((sum, { count }) => sum + count, 0) /
            total) *
            100
        )
      : 0;

  const entropy = ranked.reduce((sum, { count }) => {
    const p = count / total;
    return sum - p * Math.log(p);
  }, 0);
  const score =
    total < MIN_BOOKS_FOR_SCORE
      ? null
      : Math.round((entropy / Math.log(BALANCE_CATEGORIES.length)) * 100);

  const prevCounts = countByCategory(prevYearBooks);
  const prevRead = BALANCE_CATEGORIES.filter(
    (category) => (prevCounts.get(category) ?? 0) > 0
  );
  const prev =
    prevRead.length === 0
      ? null
      : {
          readCountDelta: readCount - prevRead.length,
          newCategories: ranked
            .map(({ category }) => category)
            .filter((category) => !prevRead.includes(category)),
        };

  return {
    categories,
    ranked,
    total,
    readCount,
    topShare,
    score,
    zero: categories
      .filter(({ count }) => count === 0)
      .map(({ category }) => category),
    prev,
  };
};
```

> 주의: `MAIN_CATEGORIES` 순서는 `컴퓨터/모바일, 소설/시/희곡, 인문학, 에세이, 경제/경영, 자기계발, 과학, 예술/대중문화, 역사` 다. Step 5 테스트의 `zero` 기대값은 이 순서를 따라 `['인문학', '과학', '예술/대중문화', '역사']`, 동률(에세이 2 · 경제/경영 2)은 에세이가 먼저다 — 둘 다 이 순서와 맞다.

`APP/src/entities/book/index.ts` 끝에 추가:

```ts
// 목표 대비 속도 · 분야 균형 (서재 연도 뷰)
export type { ReadingPace, ReadingPaceState } from './model/readingPace';
export { getReadingPace } from './model/readingPace';
export type { BalanceCategory, ReadingBalance } from './model/readingBalance';
export {
  BALANCE_CATEGORIES,
  calculateReadingBalance,
} from './model/readingBalance';
```

- [ ] **Step 8: 통과 확인 + 전체 테스트·타입**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check`
Expected: PASS, 타입 에러 0

- [ ] **Step 9: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src/entities/book
```

제안 메시지: `✨ Feat: 목표 대비 독서 속도와 분야 균형을 계산하는 순수 함수를 둔다`

---

### Task 3: ② 올해 요약 (`YearSummary`)

**Files:**
- Create: `APP/src/features/stats/model/paceMessage.ts`, `paceMessage.test.ts`
- Create: `APP/src/features/stats/ui/YearSummary.tsx`
- Modify: `APP/src/widgets/library/LibraryView.tsx` (ReadingProgressOverview → YearSummary, props `today`)
- Modify: `APP/src/widgets/public-library/PublicLibraryContent.tsx` (prop `today` 전달)
- Modify: `APP/app/(public)/[username]/page.tsx` (`today` 생성·전달)

**Interfaces:**
- Consumes: `getReadingPace`, `ReadingPace` (Task 2), `getSeoulToday` (Task 1)
- Produces: `getPaceMessage(input: { pace: ReadingPace; completed: number; target: number; year: number; isOwner: boolean }): { headline: string; detail: string | null; suggestGoalEdit: boolean }`
- Produces: `YearSummary` props:

```ts
type YearSummaryProps = {
  year: number;
  today: string;
  completed: number;
  target: number;
  totalPages: number;
  averageRating: number;
  lifeBookCount: number;
  monthlyReading: MonthlyReadingData[];
  isOwner: boolean;
  onSetGoal?: () => void;
};
```
- Produces: `PublicLibraryContent` / `LibraryView` 새 prop `today: string`

- [ ] **Step 1: 문구 실패 테스트**

`APP/src/features/stats/model/paceMessage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { getReadingPace } from '@/entities/book';

import { getPaceMessage } from './paceMessage';

const msg = (completed: number, target: number, isOwner = true, today = '2026-10-13', year = 2026) =>
  getPaceMessage({
    pace: getReadingPace({ completed, target, year, today }),
    completed,
    target,
    year,
    isOwner,
  });

describe('getPaceMessage', () => {
  it('조금 뒤처짐 — 예상 권수와 주당 권수', () => {
    const m = msg(14, 40);
    expect(m.headline).toBe('지금 속도면 올해 약 18권 📚');
    expect(m.detail).toBe(
      '목표 40권까지 26권 — 남은 11.3주 동안 일주일에 2.3권이면 닿아요.'
    );
    expect(m.suggestGoalEdit).toBe(false);
  });

  it('많이 뒤처짐 — 주인에게만 목표 다시 정하기를 권한다', () => {
    expect(msg(5, 40).suggestGoalEdit).toBe(true);
    expect(msg(5, 40).detail).toContain('목표를 다시 정해 볼까요?');
    expect(msg(5, 40, false).suggestGoalEdit).toBe(false);
    expect(msg(5, 40, false).detail).not.toContain('볼까요');
  });

  it('앞섬 · 딱 맞음 · 달성', () => {
    expect(msg(35, 40).headline).toBe('목표보다 4권 앞서 있어요 🏃');
    expect(msg(31, 40).headline).toBe('지금 페이스 그대로면 12월에 딱 40권이에요 👌');
    expect(msg(42, 40).headline).toBe('목표 달성! 지금부터는 보너스 책이에요 🎉');
    expect(msg(42, 40).detail).toBe('목표보다 2권 더 읽었어요.');
  });

  it('목표 없음 — 월 평균', () => {
    expect(msg(14, 0).headline).toBe('한 달에 1.5권씩 읽고 있어요');
  });

  it('지난해는 결과 문장', () => {
    expect(msg(36, 40, true, '2026-10-13', 2025).headline).toBe(
      '2025년 목표 40권 중 36권, 4권이 모자랐어요'
    );
    expect(msg(41, 40, true, '2026-10-13', 2025).headline).toBe(
      '2025년 목표를 달성했어요 🎉'
    );
  });

  it('연초 — 예상 대신 시작 문구', () => {
    expect(msg(1, 40, true, '2026-01-07').headline).toBe(
      '올해 목표 40권, 이제 시작이에요'
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/model/paceMessage.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`APP/src/features/stats/model/paceMessage.ts`:

```ts
import type { ReadingPace } from '@/entities/book';

type PaceMessageInput = {
  pace: ReadingPace;
  completed: number;
  target: number;
  year: number;
  /** 주인에게만 조언(목표 다시 정하기)을 붙인다 — 방문자에게는 사실만 */
  isOwner: boolean;
};

export type PaceMessage = {
  headline: string;
  detail: string | null;
  /** '목표 수정' 버튼을 한마디 옆에 띄울지 */
  suggestGoalEdit: boolean;
};

/** 문구는 진행형으로 — 판단("늦었다", "기울었다")은 쓰지 않는다 */
export const getPaceMessage = ({
  pace,
  completed,
  target,
  year,
  isOwner,
}: PaceMessageInput): PaceMessage => {
  const remaining = Math.max(target - completed, 0);
  const toGoal = `목표 ${target}권까지 ${remaining}권`;

  switch (pace.state) {
    case 'met':
      return {
        headline: '목표 달성! 지금부터는 보너스 책이에요 🎉',
        detail: pace.surplus > 0 ? `목표보다 ${pace.surplus}권 더 읽었어요.` : null,
        suggestGoalEdit: false,
      };
    case 'ahead':
      return {
        headline: `목표보다 ${pace.gap}권 앞서 있어요 🏃`,
        detail: `이 속도면 12월엔 ${pace.projected}권까지 갈 수 있어요.`,
        suggestGoalEdit: false,
      };
    case 'on_track':
      return {
        headline: `지금 페이스 그대로면 12월에 딱 ${target}권이에요 👌`,
        detail: `${toGoal} — 일주일에 ${pace.perWeek}권씩이면 돼요.`,
        suggestGoalEdit: false,
      };
    case 'behind':
      return {
        headline: `지금 속도면 올해 약 ${pace.projected}권 📚`,
        detail: `${toGoal} — 남은 ${pace.weeksLeft}주 동안 일주일에 ${pace.perWeek}권이면 닿아요.`,
        suggestGoalEdit: false,
      };
    case 'far_behind':
      return {
        headline: `지금 속도면 올해 약 ${pace.projected}권 📚`,
        detail: isOwner
          ? `${toGoal} — 남은 기간엔 빠듯한 속도예요. 목표를 다시 정해 볼까요?`
          : `${toGoal}, 남은 ${pace.weeksLeft}주`,
        suggestGoalEdit: isOwner,
      };
    case 'early':
      return {
        headline: `올해 목표 ${target}권, 이제 시작이에요`,
        detail: `일주일에 ${pace.perWeek}권씩이면 닿아요.`,
        suggestGoalEdit: false,
      };
    case 'past_met':
      return {
        headline: `${year}년 목표를 달성했어요 🎉`,
        detail: `목표 ${target}권 중 ${completed}권을 읽었어요.`,
        suggestGoalEdit: false,
      };
    case 'past_missed':
      return {
        headline: `${year}년 목표 ${target}권 중 ${completed}권, ${remaining}권이 모자랐어요`,
        detail: null,
        suggestGoalEdit: false,
      };
    case 'no_goal':
      return {
        headline: `한 달에 ${pace.perMonth}권씩 읽고 있어요`,
        detail: null,
        suggestGoalEdit: false,
      };
  }
};
```

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/model/paceMessage.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: YearSummary 렌더 테스트 작성**

`APP/src/features/stats/ui/YearSummary.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { YearSummary } from './YearSummary';

const monthly = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  count: i === 4 ? 3 : 1,
}));

const render = (overrides: Partial<Parameters<typeof YearSummary>[0]> = {}) =>
  renderToStaticMarkup(
    <YearSummary
      year={2026}
      today='2026-10-13'
      completed={14}
      target={40}
      totalPages={4352}
      averageRating={3.2}
      lifeBookCount={1}
      monthlyReading={monthly}
      isOwner
      {...overrides}
    />
  );

describe('YearSummary', () => {
  it('완독 권수가 가장 큰 숫자, 한마디와 환산 카드', () => {
    const html = render();
    expect(html).toContain('2026년에 완독한 책');
    expect(html).toContain('>14<');
    expect(html).toContain('지금 속도면 올해 약 18권');
    expect(html).toContain('약 22cm'); // 4352 ÷ 200
    expect(html).toContain('약 73시간'); // 4352 ÷ 60, 1분/쪽
    expect(html).toContain('영화 36편');
    expect(html).toContain('5월'); // 가장 많이 읽은 달
    expect(html).toContain('3.2점');
  });

  it('목표가 있으면 진행률과 오늘 기준 눈금', () => {
    const html = render();
    expect(html).toContain('목표 40권 · 35%');
    expect(html).toContain('data-pace-marker');
  });

  it('목표가 없으면 막대 대신 주인에게 목표 정하기', () => {
    const html = render({ target: 0, onSetGoal: () => {} });
    expect(html).not.toContain('data-pace-marker');
    expect(html).toContain('목표 정하기');
  });

  it('방문자에게는 목표 버튼이 없다', () => {
    const html = render({ isOwner: false, onSetGoal: undefined });
    expect(html).not.toContain('목표 수정');
    expect(html).not.toContain('목표 정하기');
  });

  it('완독 0권이면 가장 많이 읽은 달을 보여 주지 않는다', () => {
    const html = render({
      completed: 0,
      totalPages: 0,
      monthlyReading: monthly.map((m) => ({ ...m, count: 0 })),
    });
    expect(html).not.toContain('가장 많이 읽은 달');
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/ui/YearSummary.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 7: 구현**

`APP/src/features/stats/ui/YearSummary.tsx`:

```tsx
import { Button } from '@repo/ui';
import { Pencil } from 'lucide-react';

import { getReadingPace } from '@/entities/book';

import { getPaceMessage } from '../model/paceMessage';

import type { MonthlyReadingData } from '@/entities/book';

type YearSummaryProps = {
  year: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' — 서버에서 한 번 만들어 내려온다 */
  today: string;
  completed: number;
  target: number;
  totalPages: number;
  averageRating: number;
  lifeBookCount: number;
  monthlyReading: MonthlyReadingData[];
  isOwner: boolean;
  /** 주인 + 올해일 때만 넘어온다 */
  onSetGoal?: () => void;
};

type FactProps = { value: string; label: string };

const Fact = ({ value, label }: FactProps) => (
  <div className='rounded-xl bg-sunken px-3 py-2'>
    <p className='text-base font-bold text-text-strong'>{value}</p>
    <p className='text-xs text-text-subtle'>{label}</p>
  </div>
);

/**
 * ② 올해 요약 — 이 섹션의 주인공은 "읽은 권수"다.
 * 목표는 보조 정보(작은 막대)로 내리고, 대신 지금 속도를 한 문장으로 말해 준다.
 */
export const YearSummary = ({
  year,
  today,
  completed,
  target,
  totalPages,
  averageRating,
  lifeBookCount,
  monthlyReading,
  isOwner,
  onSetGoal,
}: YearSummaryProps) => {
  const pace = getReadingPace({ completed, target, year, today });
  const message = getPaceMessage({ pace, completed, target, year, isOwner });
  const hasGoal = target > 0;
  const progress = hasGoal ? Math.min(Math.round((completed / target) * 100), 100) : 0;

  // 환산은 계산할 수 있는 것만 — 종이 한 장(2쪽) 0.1mm, 1분/쪽(기존 독서 시간 규칙)
  const stackCm = Math.round(totalPages / 200);
  const hours = Math.round(totalPages / 60);
  const best = monthlyReading.reduce(
    (top, m) => (m.count > top.count ? m : top),
    { month: 0, count: 0 }
  );

  return (
    <section className='grid gap-6 rounded-[28px] border border-line-soft bg-card p-6 sm:p-8 md:grid-cols-[200px_1fr] md:items-center'>
      <div>
        <p className='text-sm text-text-subtle'>{year}년에 완독한 책</p>
        <p className='mt-1 text-6xl font-bold tracking-[-0.04em] text-text-strong'>
          {completed}
          <span className='ml-1 text-xl font-medium text-text-subtle'>권</span>
        </p>
      </div>

      <div className='min-w-0'>
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='break-keep text-base font-bold text-text-strong'>
              {message.headline}
            </p>
            {message.detail && (
              <p className='mt-1 break-keep text-sm text-text-body'>
                {message.detail}
              </p>
            )}
          </div>
          {onSetGoal && (
            <Button
              variant={message.suggestGoalEdit ? 'outline' : 'ghost'}
              size='sm'
              className='shrink-0 text-text-subtle'
              onClick={onSetGoal}
            >
              <Pencil className='size-3.5' />
              {hasGoal ? '목표 수정' : '목표 정하기'}
            </Button>
          )}
        </div>

        {hasGoal && (
          <div className='mt-4'>
            <div className='mb-1.5 flex justify-between text-xs text-text-subtle'>
              <span>
                목표 {target}권 · {progress}%
              </span>
              {pace.state !== 'past_met' && pace.state !== 'past_missed' && (
                <span>오늘 기준 예상 위치 ▍</span>
              )}
            </div>
            <div
              role='progressbar'
              aria-label={`${year}년 독서 목표 진행률`}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className='relative h-1.5 rounded-full bg-sunken'
            >
              <div
                className='h-full rounded-full bg-primary'
                style={{ width: `${progress}%` }}
              />
              {pace.elapsed < 1 && (
                // 오늘까지 와 있어야 할 위치 — 장식이라 스크린리더에서 숨긴다
                <span
                  data-pace-marker
                  aria-hidden
                  className='absolute -top-1 h-3.5 w-0.5 bg-[var(--chart-4)]'
                  style={{ left: `${Math.round(pace.elapsed * 100)}%` }}
                />
              )}
            </div>
          </div>
        )}

        <div className='mt-4 flex flex-wrap gap-2'>
          <Fact
            value={`${totalPages.toLocaleString()}쪽`}
            label={`쌓으면 약 ${stackCm}cm`}
          />
          <Fact
            value={`약 ${hours}시간`}
            label={`영화 ${Math.floor(hours / 2)}편 볼 시간`}
          />
          {best.count > 0 && (
            <Fact value={`${best.month}월`} label={`가장 많이 읽은 달 (${best.count}권)`} />
          )}
          <Fact
            value={averageRating > 0 ? `${averageRating.toFixed(1)}점` : '—'}
            label={`평균 평점 · 인생책 ${lifeBookCount}권`}
          />
        </div>
      </div>
    </section>
  );
};
```

> `bg-[var(--chart-4)]` 는 토큰 참조라 새 색이 아니다. 린트가 임의값을 막으면 `style={{ backgroundColor: 'var(--chart-4)' }}` 로 바꾼다.

- [ ] **Step 8: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/ui/YearSummary.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 9: 연결 — today 를 서버에서 내리고 LibraryView 교체**

1. `page.tsx` `LibraryContent` 안, `const currentYear = getCurrentLibraryYear();` 아래:

```tsx
  // 속도 계산의 "오늘" — 서버에서 한 번 정해 내려야 SSR/CSR 결과가 같다
  const today = getSeoulToday();
```

`@/entities/book` import 에 `getSeoulToday` 추가, `<PublicLibraryContent … today={today} />` 전달.

2. `PublicLibraryContent.tsx`: props 타입에 `today: string;` 추가, 구조 분해, `<LibraryView today={today} … />` 전달.

3. `LibraryView.tsx`:
   - props 에 `/** 한국 시간 기준 오늘 'YYYY-MM-DD' */ today: string;` 추가·구조 분해.
   - import `ReadingProgressOverview` → `import { YearSummary } from '@/features/stats/ui/YearSummary';`
   - 연도 뷰의 `<ReadingProgressOverview … />` 를 교체하고, **`{bookShelf}` 보다 위로** 옮긴다(배치: 요약 → 책장):

```tsx
            <YearSummary
              year={selectedYear}
              today={today}
              completed={stats.totalCompletedBooks}
              target={goalTarget}
              totalPages={stats.totalPages}
              averageRating={stats.averageRating}
              lifeBookCount={stats.lifeBookCount}
              monthlyReading={stats.monthlyReading}
              isOwner={isOwner}
              onSetGoal={
                onSetGoal && selectedYear === currentYear ? onSetGoal : undefined
              }
            />

            {bookShelf}
```

- [ ] **Step 10: 타입·린트·테스트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/features/stats /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets "/Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/app/(public)/[username]/page.tsx" && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test`
Expected: 에러 0, PASS

- [ ] **Step 11: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src/features/stats apps/page0127/src/widgets/library/LibraryView.tsx apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx "apps/page0127/app/(public)/[username]/page.tsx"
```

제안 메시지: `🎨 UI/UX: 올해 요약을 읽은 권수 중심으로 바꾸고 속도 한마디를 붙인다`

---

### Task 4: ⑤ 독서 균형 카드

**Files:**
- Create: `APP/src/features/stats/model/balanceCopy.ts`, `balanceCopy.test.ts`
- Create: `APP/src/features/stats/ui/ReadingBalanceCard.tsx`, `ReadingBalanceCard.test.tsx`
- Modify: `APP/src/shared/lib/categoryMapper.ts` — 없음 (변경 금지). 대신 `libraryPeriod.ts` 의 더미 목록 오타 `'경제경영'` → `'경제/경영'`
- Modify: `APP/src/widgets/library/LibraryView.tsx` (DashboardCharts 아래 → 균형 카드로)

**Interfaces:**
- Consumes: `calculateReadingBalance`, `ReadingBalance`, `BALANCE_CATEGORIES` (Task 2)
- Produces: `getBalanceLabel(score: number | null): string`, `getBalanceSummary(balance: ReadingBalance): string`, `getBalanceDelta(balance: ReadingBalance): string | null`
- Produces: `ReadingBalanceCard({ year, balance }: { year: number; balance: ReadingBalance })`
- Produces: `CATEGORY_COLORS` 함수 `categoryColor(rank: number): string`

- [ ] **Step 1: 문구 실패 테스트**

`APP/src/features/stats/model/balanceCopy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { calculateReadingBalance } from '@/entities/book';
import { createTestBook } from '@/entities/book/model/createTestBook';

import {
  categoryColor,
  getBalanceDelta,
  getBalanceLabel,
  getBalanceSummary,
} from './balanceCopy';

const books = (category: string, count: number) =>
  Array.from({ length: count }, () => createTestBook({ category }));

describe('balanceCopy', () => {
  it('점수 구간 문구는 진행형', () => {
    expect(getBalanceLabel(null)).toBe('책이 더 쌓이면 보여요');
    expect(getBalanceLabel(20)).toBe('한 우물을 깊이 파는 중');
    expect(getBalanceLabel(48)).toBe('조금씩 넓혀 가는 중');
    expect(getBalanceLabel(70)).toBe('고르게 읽는 중');
  });

  it('요약 — 읽은 분야 수와 상위 두 분야', () => {
    const balance = calculateReadingBalance([
      ...books('소설', 5),
      ...books('자기계발', 4),
      ...books('에세이', 2),
    ]);
    expect(getBalanceSummary(balance)).toBe(
      '9개 분야 중 3개를 읽었어요. 소설/시/희곡·자기계발이 82%'
    );
  });

  it('한 분야만이면 그 분야 이름만', () => {
    expect(getBalanceSummary(calculateReadingBalance(books('소설', 3)))).toBe(
      '9개 분야 중 1개를 읽었어요. 소설/시/희곡이 100%'
    );
  });

  it('0권이면 시작 문구', () => {
    expect(getBalanceSummary(calculateReadingBalance([]))).toBe(
      '완독한 책이 쌓이면 분야가 채워져요'
    );
  });

  it('작년 대비 — 넓어짐 · 같음 · 좁아짐 · 비교 없음', () => {
    const now = calculateReadingBalance(
      [...books('소설', 2), ...books('에세이', 1)],
      books('소설', 2)
    );
    expect(getBalanceDelta(now)).toBe('작년보다 1개 분야 넓어졌어요 (+에세이)');
    const same = calculateReadingBalance(books('소설', 3), books('소설', 1));
    expect(getBalanceDelta(same)).toBe('작년과 같은 1개 분야를 읽고 있어요');
    const fewer = calculateReadingBalance(
      books('소설', 3),
      [...books('소설', 1), ...books('에세이', 1)]
    );
    expect(getBalanceDelta(fewer)).toBe('작년엔 2개 분야를 읽었어요');
    expect(getBalanceDelta(calculateReadingBalance(books('소설', 3)))).toBeNull();
  });

  it('분야 색은 순위대로 chart-1~7, 8위부터 chart-5', () => {
    expect(categoryColor(0)).toBe('var(--chart-1)');
    expect(categoryColor(6)).toBe('var(--chart-7)');
    expect(categoryColor(7)).toBe('var(--chart-5)');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/model/balanceCopy.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`APP/src/features/stats/model/balanceCopy.ts`:

```ts
import { BALANCE_CATEGORIES, type ReadingBalance } from '@/entities/book';

/** 문구는 진행형 — "기울었다" 같은 판단은 쓰지 않는다(2026-10-08 반려 기록) */
export const getBalanceLabel = (score: number | null): string => {
  if (score === null) return '책이 더 쌓이면 보여요';
  if (score < 40) return '한 우물을 깊이 파는 중';
  if (score < 70) return '조금씩 넓혀 가는 중';
  return '고르게 읽는 중';
};

export const getBalanceSummary = (balance: ReadingBalance): string => {
  if (balance.total === 0) return '완독한 책이 쌓이면 분야가 채워져요';
  const top = balance.ranked
    .slice(0, 2)
    .map(({ category }) => category)
    .join('·');
  return `${BALANCE_CATEGORIES.length}개 분야 중 ${balance.readCount}개를 읽었어요. ${top}이 ${balance.topShare}%`;
};

export const getBalanceDelta = (balance: ReadingBalance): string | null => {
  if (!balance.prev) return null;
  const { readCountDelta, newCategories } = balance.prev;
  if (readCountDelta > 0) {
    const added = newCategories.length > 0 ? ` (+${newCategories.join(', ')})` : '';
    return `작년보다 ${readCountDelta}개 분야 넓어졌어요${added}`;
  }
  if (readCountDelta === 0) {
    return `작년과 같은 ${balance.readCount}개 분야를 읽고 있어요`;
  }
  return `작년엔 ${balance.readCount - readCountDelta}개 분야를 읽었어요`;
};

const CHART_COLORS = [1, 2, 3, 4, 5, 6, 7].map((n) => `var(--chart-${n})`);

/** 순위 → 분야 색. 토큰이 7개라 8·9위는 슬레이트(chart-5)를 함께 쓴다 */
export const categoryColor = (rank: number): string =>
  rank < CHART_COLORS.length ? CHART_COLORS[rank] : 'var(--chart-5)';
```

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/model/balanceCopy.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 카드 렌더 테스트**

`APP/src/features/stats/ui/ReadingBalanceCard.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { calculateReadingBalance } from '@/entities/book';
import { createTestBook } from '@/entities/book/model/createTestBook';

import { ReadingBalanceCard } from './ReadingBalanceCard';

// 레이더는 recharts(브라우저 측정 필요)라 dynamic 으로 불린다 — 서버 렌더에서는 자리만 확인
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid='radar' />,
}));

const books = (category: string, count: number) =>
  Array.from({ length: count }, () => createTestBook({ category }));

describe('ReadingBalanceCard', () => {
  it('점수 · 띠 · 순위 · 0권 분야', () => {
    const balance = calculateReadingBalance([
      ...books('소설', 5),
      ...books('자기계발', 4),
      ...books('에세이', 2),
    ]);
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={balance} />
    );
    expect(html).toContain('2026 독서 균형');
    expect(html).toContain('data-testid="radar"');
    expect(html).toContain(`>${balance.score}<`);
    expect(html).toContain('조금씩 넓혀 가는 중');
    expect(html).toContain('아직 0권');
    expect(html).toContain('인문학');
    expect(html).not.toContain('기울');
  });

  it('완독 0권이면 점수·띠 없이 안내만', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={calculateReadingBalance([])} />
    );
    expect(html).toContain('완독한 책이 쌓이면 분야가 채워져요');
    expect(html).not.toContain('아직 0권');
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/ui/ReadingBalanceCard.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 7: 구현**

`APP/src/features/stats/ui/ReadingBalanceCard.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';

import {
  categoryColor,
  getBalanceDelta,
  getBalanceLabel,
  getBalanceSummary,
} from '../model/balanceCopy';

import type { ReadingBalance } from '@/entities/book';

// 레이더는 recharts — 브라우저 측정이 필요해 초기 번들·SSR 에서 뺀다(DashboardCharts 와 같은 이유)
const CategoryRadarChart = dynamic(
  () => import('./CategoryRadarChart').then((m) => m.CategoryRadarChart),
  {
    ssr: false,
    loading: () => <div className='h-[300px] animate-pulse rounded-lg bg-muted' />,
  }
);

type ReadingBalanceCardProps = {
  year: number;
  balance: ReadingBalance;
};

/**
 * ⑤ 독서 균형 — "고르게 읽고 있나".
 * 왼쪽 레이더(9축 고정)는 모양으로, 오른쪽 띠·순위는 정확한 비율로 같은 것을 보여 준다.
 */
export const ReadingBalanceCard = ({ year, balance }: ReadingBalanceCardProps) => {
  const delta = getBalanceDelta(balance);
  const hasBooks = balance.total > 0;

  return (
    <section className='grid gap-6 rounded-2xl border border-line-soft bg-card p-6 md:grid-cols-[260px_1fr] md:items-center'>
      <CategoryRadarChart data={balance.categories} />

      <div className='min-w-0'>
        <div className='flex items-baseline justify-between gap-2'>
          <h3 className='text-base font-bold text-text-strong'>{year} 독서 균형</h3>
          <span className='text-xs text-text-subtle'>
            9개 분야 · 완독 {balance.total}권
          </span>
        </div>
        <p className='mt-2 break-keep text-base font-bold text-text-strong'>
          {getBalanceSummary(balance)}
        </p>
        {delta && <p className='mt-1 text-sm text-text-body'>{delta}</p>}

        {hasBooks && (
          <>
            <div className='mt-4 flex items-baseline gap-2'>
              {balance.score !== null && (
                <strong className='text-3xl font-bold text-text-strong'>
                  {balance.score}
                </strong>
              )}
              <span className='text-xs text-text-subtle'>
                {balance.score !== null && '/100 고른 정도 · '}
                <b className='text-text-body'>{getBalanceLabel(balance.score)}</b>
              </span>
            </div>

            {/* 식단 띠 — 100% 가로 막대. 색은 순위 순서대로 차트 토큰 */}
            <div className='mt-3 flex h-7 overflow-hidden rounded-lg' aria-hidden>
              {balance.ranked.map(({ category, share }, rank) => (
                <div
                  key={category}
                  className='flex items-center justify-center truncate px-1 text-xs text-white'
                  style={{ width: `${share}%`, backgroundColor: categoryColor(rank) }}
                >
                  {share >= 12 ? category.split('/')[0] : ''}
                </div>
              ))}
            </div>

            <ul className='mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2'>
              {balance.ranked.map(({ category, count, share }, rank) => (
                <li
                  key={category}
                  className='grid grid-cols-[88px_1fr_20px] items-center gap-2'
                >
                  <span className='truncate text-text-body'>{category}</span>
                  <span className='h-2 overflow-hidden rounded-full bg-sunken'>
                    <span
                      className='block h-full rounded-full'
                      style={{
                        width: `${(count / balance.ranked[0].count) * 100}%`,
                        backgroundColor: categoryColor(rank),
                      }}
                    />
                  </span>
                  <span className='text-right text-text-strong' aria-label={`${share}%`}>
                    {count}
                  </span>
                </li>
              ))}
            </ul>

            {balance.zero.length > 0 && (
              <p className='mt-3 flex flex-wrap items-center gap-1 text-xs text-text-subtle'>
                아직 0권
                {balance.zero.map((category) => (
                  <span
                    key={category}
                    className='rounded-full border border-dashed border-line-soft px-2 py-0.5'
                  >
                    {category}
                  </span>
                ))}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
```

- [ ] **Step 8: 더미 목록 오타 수정** — `libraryPeriod.ts` `calculateCategoryReading` 의 `dummyCategories` 에서 `'경제경영',` → `'경제/경영',` ('전체' 화면 레이더의 중복 축 제거).

- [ ] **Step 9: LibraryView 연결**

1. import 추가: `import { calculateReadingBalance } from '@/entities/book';`, `import { ReadingBalanceCard } from '@/features/stats/ui/ReadingBalanceCard';`
2. props 에 `/** 균형 계산용 — 선택 연도와 그 전 해의 공개 완독 책 */ balanceBooks?: { current: Book[]; previous: Book[] };` 추가·구조 분해(기본 `{ current: [], previous: [] }`).
3. 연도 뷰 `{bookShelf}` 바로 아래에:

```tsx
            <ReadingBalanceCard
              year={selectedYear}
              balance={calculateReadingBalance(
                balanceBooks.current,
                balanceBooks.previous
              )}
            />
```

4. `PublicLibraryContent.tsx` 에서 계산해 넘긴다(공개 책 + 재독 합친 뒤 — 통계와 같은 집합):

```tsx
  const balanceBooks = useMemo(
    () => ({
      current: dedupeReadings(
        filterBooksByLibraryYear(publicBooks, selectedYear, currentYear)
      ),
      previous: dedupeReadings(
        filterBooksByLibraryYear(publicBooks, selectedYear - 1, currentYear)
      ),
    }),
    [publicBooks, selectedYear, currentYear]
  );
```

`<LibraryView balanceBooks={balanceBooks} … />`

- [ ] **Step 10: 테스트·타입·린트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/features/stats /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/entities/book`
Expected: PASS · 에러 0. `libraryPeriod.test.ts` 가 `'경제경영'` 을 기대하는 곳이 있으면 `'경제/경영'` 으로 고친다.

- [ ] **Step 11: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src/features/stats apps/page0127/src/entities/book apps/page0127/src/widgets
```

제안 메시지: `✨ Feat: 연도 서재에 독서 균형 카드(레이더 + 식단 띠 + 고른 정도)를 둔다`

---

### Task 5: 순수 함수 — 달력 한 달 (`buildCalendarMonth`)

**Files:**
- Create: `APP/src/entities/book/model/calendarMonth.ts`, `calendarMonth.test.ts`
- Modify: `APP/src/entities/book/index.ts`

**Interfaces:**
- Produces:

```ts
export const MAX_LANES = 3;
export type CalendarCompletion = { book: Book; colorIndex: number | null };
export type CalendarRangeSegment = {
  book: Book;
  lane: number;            // 0..MAX_LANES-1
  colorIndex: number;      // 0..6 (chart-1~7)
  isStart: boolean;        // 실제 시작일인 칸
  isEnd: boolean;          // 실제 끝(완독일·오늘)인 칸
};
export type CalendarDay = {
  date: string;            // 'YYYY-MM-DD'
  day: number;
  completions: CalendarCompletion[];
  ranges: CalendarRangeSegment[];   // 그릴 줄만 (lane < MAX_LANES)
  overflow: number;        // 줄이 모자라 못 그린 기간 수
};
export type CalendarMonth = {
  year: number;
  month: number;           // 1..12
  weeks: (CalendarDay | null)[][];  // 일요일 시작, 7칸씩
  summary: { publicCount: number; publicPages: number; privateCount: number };
  activeMonths: number[];  // 그 해 공개 완독이 있는 달
};
export const buildCalendarMonth: (books: Book[], year: number, month: number, today: string) => CalendarMonth;
export const getInitialCalendarMonth: (books: Book[], year: number, today: string) => number;
```

- [ ] **Step 1: 실패 테스트**

`APP/src/entities/book/model/calendarMonth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  buildCalendarMonth,
  getInitialCalendarMonth,
  MAX_LANES,
} from './calendarMonth';
import { createTestBook } from './createTestBook';

const TODAY = '2026-10-13';
const findDay = (m: ReturnType<typeof buildCalendarMonth>, day: number) =>
  m.weeks.flat().find((d) => d?.day === day)!;

describe('buildCalendarMonth', () => {
  it('일요일 시작 주 배열 — 2026년 9월 1일은 화요일', () => {
    const m = buildCalendarMonth([], 2026, 9, TODAY);
    expect(m.weeks[0].slice(0, 2)).toEqual([null, null]);
    expect(m.weeks[0][2]?.date).toBe('2026-09-01');
    expect(m.weeks.flat().filter(Boolean)).toHaveLength(30);
    m.weeks.forEach((week) => expect(week).toHaveLength(7));
  });

  it('완독일 칸에 책이 놓이고, 요약은 공개만 세고 비공개는 따로', () => {
    const pub = createTestBook({ completed_date: '2026-09-05', page_count: 312 });
    const priv = createTestBook({ completed_date: '2026-09-05', is_public: false, page_count: 200 });
    const m = buildCalendarMonth([pub, priv], 2026, 9, TODAY);
    expect(findDay(m, 5).completions.map((c) => c.book.id)).toEqual([pub.id, priv.id]);
    expect(m.summary).toEqual({ publicCount: 1, publicPages: 312, privateCount: 1 });
  });

  it('완독이 아닌 책·다른 달 책은 완독 칸에 없다', () => {
    const m = buildCalendarMonth(
      [
        createTestBook({ status: 'reading', completed_date: '2026-09-05' }),
        createTestBook({ completed_date: '2026-08-05' }),
      ],
      2026,
      9,
      TODAY
    );
    expect(findDay(m, 5).completions).toHaveLength(0);
  });

  it('기간 막대 — 달을 걸치면 이번 달 1일부터, 시작/끝 표시', () => {
    const book = createTestBook({ start_date: '2026-08-28', completed_date: '2026-09-03' });
    const m = buildCalendarMonth([book], 2026, 9, TODAY);
    expect(findDay(m, 1).ranges[0]).toMatchObject({ lane: 0, isStart: false, isEnd: false });
    expect(findDay(m, 3).ranges[0]).toMatchObject({ isEnd: true });
    expect(findDay(m, 4).ranges).toHaveLength(0);
    // 같은 책의 완독 표지는 막대와 같은 색
    expect(findDay(m, 3).completions[0].colorIndex).toBe(findDay(m, 3).ranges[0].colorIndex);
  });

  it('읽는 중인 책은 오늘까지 이어진다', () => {
    const book = createTestBook({ status: 'reading', start_date: '2026-10-02' });
    const m = buildCalendarMonth([book], 2026, 10, TODAY);
    expect(findDay(m, 2).ranges[0].isStart).toBe(true);
    expect(findDay(m, 13).ranges[0].isEnd).toBe(true);
    expect(findDay(m, 14).ranges).toHaveLength(0);
  });

  it('시작일이 없거나, 시작>완독이거나, 읽고 싶어요면 막대를 그리지 않는다', () => {
    const m = buildCalendarMonth(
      [
        createTestBook({ completed_date: '2026-09-10' }),
        createTestBook({ start_date: '2026-09-20', completed_date: '2026-09-10' }),
        createTestBook({ status: 'want_to_read', start_date: '2026-09-01' }),
      ],
      2026,
      9,
      TODAY
    );
    expect(m.weeks.flat().some((d) => (d?.ranges.length ?? 0) > 0)).toBe(false);
    expect(findDay(m, 10).completions[0].colorIndex).toBeNull();
  });

  it('겹치는 기간은 줄을 나누고, 3줄을 넘으면 overflow', () => {
    const books = [1, 2, 3, 4].map((n) =>
      createTestBook({ start_date: '2026-09-01', completed_date: `2026-09-1${n}` })
    );
    const m = buildCalendarMonth(books, 2026, 9, TODAY);
    const day1 = findDay(m, 1);
    expect(day1.ranges.map((r) => r.lane)).toEqual([0, 1, 2]);
    expect(day1.overflow).toBe(1);
    expect(MAX_LANES).toBe(3);
  });

  it('끝난 줄은 다시 쓴다', () => {
    const a = createTestBook({ start_date: '2026-09-01', completed_date: '2026-09-03' });
    const b = createTestBook({ start_date: '2026-09-05', completed_date: '2026-09-07' });
    const m = buildCalendarMonth([a, b], 2026, 9, TODAY);
    expect(findDay(m, 5).ranges[0].lane).toBe(0);
  });

  it('activeMonths — 그 해 공개 완독이 있는 달', () => {
    const m = buildCalendarMonth(
      [
        createTestBook({ completed_date: '2026-01-07' }),
        createTestBook({ completed_date: '2026-05-08' }),
        createTestBook({ completed_date: '2026-06-01', is_public: false }),
        createTestBook({ completed_date: '2025-12-31' }),
      ],
      2026,
      9,
      TODAY
    );
    expect(m.activeMonths).toEqual([1, 5]);
  });
});

describe('getInitialCalendarMonth', () => {
  it('올해면 이번 달', () => {
    expect(getInitialCalendarMonth([], 2026, TODAY)).toBe(10);
  });
  it('지난해면 그 해 마지막 완독 달, 없으면 12월', () => {
    const books = [
      createTestBook({ completed_date: '2025-07-03' }),
      createTestBook({ completed_date: '2025-11-29' }),
    ];
    expect(getInitialCalendarMonth(books, 2025, TODAY)).toBe(11);
    expect(getInitialCalendarMonth([], 2024, TODAY)).toBe(12);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/book/model/calendarMonth.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`APP/src/entities/book/model/calendarMonth.ts`:

```ts
import type { Book } from '../types';

/**
 * 독서 달력 한 달치 계산 (순수 함수).
 *
 * 학습 포인트:
 * - 날짜는 'YYYY-MM-DD' 문자열 그대로 비교한다. 사전순 비교가 곧 날짜순이라
 *   Date 객체를 만들 필요가 없고, 타임존 때문에 하루가 밀릴 일도 없다.
 * - 기간 막대의 줄(lane) 배정은 "구간 스케줄링" 그리디:
 *   시작일 순으로 보며, 앞 책이 이미 끝난 가장 낮은 줄에 넣는다.
 */
export const MAX_LANES = 3;
const COLOR_COUNT = 7; // --chart-1 ~ --chart-7

export type CalendarCompletion = { book: Book; colorIndex: number | null };

export type CalendarRangeSegment = {
  book: Book;
  lane: number;
  colorIndex: number;
  isStart: boolean;
  isEnd: boolean;
};

export type CalendarDay = {
  date: string;
  day: number;
  completions: CalendarCompletion[];
  ranges: CalendarRangeSegment[];
  overflow: number;
};

export type CalendarMonth = {
  year: number;
  month: number;
  weeks: (CalendarDay | null)[][];
  summary: { publicCount: number; publicPages: number; privateCount: number };
  activeMonths: number[];
};

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

type Range = { book: Book; start: string; end: string; lane: number; colorIndex: number };

/** 이 달에 걸치는 기간(시작일이 있는 책만)과 줄 배정 */
const layoutRanges = (books: Book[], monthStart: string, monthEnd: string, today: string) => {
  const candidates = books
    .flatMap((book) => {
      if (!book.start_date) return [];
      const end =
        book.status === 'completed'
          ? book.completed_date
          : book.status === 'reading'
            ? today
            : null;
      // 읽고 싶어요·끝 날짜 없음·시작>끝(입력 실수)은 그리지 않는다
      if (!end || book.start_date > end) return [];
      if (end < monthStart || book.start_date > monthEnd) return [];
      return [{ book, start: book.start_date, end }];
    })
    .sort((a, b) => a.start.localeCompare(b.start) || a.book.id.localeCompare(b.book.id));

  const laneEnds: string[] = [];
  return candidates.map((range, index): Range => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < range.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = range.end;
    return { ...range, lane, colorIndex: index % COLOR_COUNT };
  });
};

export const buildCalendarMonth = (
  books: Book[],
  year: number,
  month: number,
  today: string
): CalendarMonth => {
  const total = daysInMonth(year, month);
  const monthStart = toDate(year, month, 1);
  const monthEnd = toDate(year, month, total);
  const ranges = layoutRanges(books, monthStart, monthEnd, today);
  const colorOf = new Map(ranges.map((r) => [r.book.id, r.colorIndex]));

  const completed = books.filter(
    (book) => book.status === 'completed' && book.completed_date
  );

  const days: CalendarDay[] = Array.from({ length: total }, (_, i) => {
    const date = toDate(year, month, i + 1);
    const active = ranges.filter((r) => r.start <= date && date <= r.end);
    return {
      date,
      day: i + 1,
      completions: completed
        .filter((book) => book.completed_date === date)
        .map((book) => ({ book, colorIndex: colorOf.get(book.id) ?? null })),
      ranges: active
        .filter((r) => r.lane < MAX_LANES)
        .sort((a, b) => a.lane - b.lane)
        .map((r) => ({
          book: r.book,
          lane: r.lane,
          colorIndex: r.colorIndex,
          isStart: r.start === date,
          isEnd: r.end === date,
        })),
      overflow: active.filter((r) => r.lane >= MAX_LANES).length,
    };
  });

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (CalendarDay | null)[] = [...Array(firstWeekday).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7)
  );

  const inMonth = completed.filter(
    (book) => book.completed_date! >= monthStart && book.completed_date! <= monthEnd
  );
  const publicInMonth = inMonth.filter((book) => book.is_public);

  const activeMonths = Array.from(
    new Set(
      completed
        .filter((book) => book.is_public && book.completed_date!.startsWith(`${year}-`))
        .map((book) => Number(book.completed_date!.slice(5, 7)))
    )
  ).sort((a, b) => a - b);

  return {
    year,
    month,
    weeks,
    summary: {
      publicCount: publicInMonth.length,
      publicPages: publicInMonth.reduce((sum, book) => sum + (book.page_count ?? 0), 0),
      privateCount: inMonth.length - publicInMonth.length,
    },
    activeMonths,
  };
};

/** 처음 열 달 — 올해면 이번 달, 지난해면 그 해 마지막 완독 달(없으면 12월) */
export const getInitialCalendarMonth = (
  books: Book[],
  year: number,
  today: string
): number => {
  if (Number(today.slice(0, 4)) === year) return Number(today.slice(5, 7));
  const months = books
    .filter((book) => book.status === 'completed' && book.completed_date?.startsWith(`${year}-`))
    .map((book) => Number(book.completed_date!.slice(5, 7)));
  return months.length > 0 ? Math.max(...months) : 12;
};
```

`APP/src/entities/book/index.ts` 끝에 추가:

```ts
// 독서 달력 한 달치 (서재 연도 뷰)
export type {
  CalendarCompletion,
  CalendarDay,
  CalendarMonth,
  CalendarRangeSegment,
} from './model/calendarMonth';
export {
  buildCalendarMonth,
  getInitialCalendarMonth,
  MAX_LANES,
} from './model/calendarMonth';
```

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/book/model/calendarMonth.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: 타입·린트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/entities/book`
Expected: 에러 0. `!` 단언이 린트에 걸리면 앞의 `filter` 를 타입 가드(`(book): book is Book & { completed_date: string } => …`)로 바꾼다.

- [ ] **Step 6: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src/entities/book
```

제안 메시지: `✨ Feat: 독서 달력 한 달치(완독 표지·기간 막대 줄 배정)를 계산하는 순수 함수를 둔다`

---

### Task 6: ⑥ 새 달력 + 평점 카드, 옛 캘린더·API 삭제

**Files:**
- Create: `APP/src/widgets/library/ReadingCalendar.tsx`, `ReadingCalendar.test.tsx`
- Create: `APP/src/features/stats/ui/RatingSummaryCard.tsx`, `RatingSummaryCard.test.tsx`
- Modify: `APP/src/widgets/library/LibraryView.tsx` (DashboardCharts·calendarSlot → 두 카드)
- Modify: `APP/src/widgets/public-library/PublicLibraryContent.tsx` (`calendarBooks` 전달, `calendarSlot` 제거)
- Modify: `APP/app/(public)/[username]/page.tsx` (calendarSlot·Calendar import 제거)
- Delete: `APP/src/widgets/dashboard/{CalendarSection,CalendarBlock,CalendarBlockError,CalendarBlockSkeleton,ReadingCalendar}.tsx`, `APP/app/api/books/calendar/route.ts`, `APP/src/shared/api/endpoints.ts` 의 calendar 항목

**Interfaces:**
- Consumes: `buildCalendarMonth`, `getInitialCalendarMonth`, `CalendarDay` (Task 5)
- Produces: `ReadingCalendar` props:

```ts
type ReadingCalendarProps = {
  /** 방문자 = 공개 책만, 주인 = 비공개 포함(반투명) */
  books: Book[];
  year: number;
  today: string;
  isOwner: boolean;
  bookHref: (book: Book) => string;
};
```
- Produces: `RatingSummaryCard` props:

```ts
type RatingSummaryCardProps = {
  year: number;
  ratings: RatingReadingData[];
  averageRating: number;
  total: number;
  lifeBooks: Book[];
  bookHref: (book: Book) => string;
  onRatingClick: (rating: RatingFilter) => void;
};
```

- [ ] **Step 1: 달력 렌더 실패 테스트**

`APP/src/widgets/library/ReadingCalendar.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { ReadingCalendar } from './ReadingCalendar';

const href = (book: { id: string }) => `/me/${book.id}`;

describe('ReadingCalendar', () => {
  it('이번 달 · 월 칩 12개 · 완독 표지 · 요약', () => {
    const book = createTestBook({
      title: '모든 것이 되는 법',
      completed_date: '2026-10-13',
      page_count: 300,
    });
    const html = renderToStaticMarkup(
      <ReadingCalendar books={[book]} year={2026} today='2026-10-13' isOwner={false} bookHref={href} />
    );
    expect(html).toContain('2026년 10월');
    expect((html.match(/data-month-chip/g) ?? []).length).toBe(12);
    expect(html).toContain('aria-label="10월 13일, 1권 완독"');
    // 요약은 "10월 <b>1권</b> 완독 · 300쪽" — 굵은 글씨 태그 때문에 나눠서 본다
    expect(html).toContain('>1권</b> 완독 · 300쪽');
  });

  it('주인 화면의 비공개 책은 반투명이고 요약 뒤에 따로 센다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[createTestBook({ completed_date: '2026-10-05', is_public: false })]}
        year={2026}
        today='2026-10-13'
        isOwner
        bookHref={href}
      />
    );
    expect(html).toContain('opacity-50');
    expect(html).toContain('>0권</b> 완독 · 비공개 1권');
  });

  it('방문자 화면에는 비공개 권수 문구가 없다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[createTestBook({ completed_date: '2026-10-05' })]}
        year={2026}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
      />
    );
    expect(html).not.toContain('비공개');
  });

  it('지난해 탭이면 그 해 마지막 완독 달로 연다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[createTestBook({ completed_date: '2025-11-29' })]}
        year={2025}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
      />
    );
    expect(html).toContain('2025년 11월');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/widgets/library/ReadingCalendar.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`APP/src/widgets/library/ReadingCalendar.tsx`:

```tsx
'use client';

import { useReducer, useState } from 'react';

import Link from 'next/link';

import { BookCover, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  buildCalendarMonth,
  getInitialCalendarMonth,
  isRated,
  toCoverSource,
} from '@/entities/book';

import type { Book, CalendarDay } from '@/entities/book';

type ReadingCalendarProps = {
  /** 방문자 = 공개 책만, 주인 = 비공개 포함(반투명) */
  books: Book[];
  year: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' */
  today: string;
  isOwner: boolean;
  bookHref: (book: Book) => string;
};

type MonthState = { year: number; month: number };
type MonthAction = { type: 'PREV' } | { type: 'NEXT' } | { type: 'GO'; month: number };

// 12월→1월 경계에서 연·월을 한 번에 바꾼다 (예전 CalendarBlock 과 같은 이유)
const monthReducer = (state: MonthState, action: MonthAction): MonthState => {
  switch (action.type) {
    case 'PREV':
      return state.month === 1
        ? { year: state.year - 1, month: 12 }
        : { ...state, month: state.month - 1 };
    case 'NEXT':
      return state.month === 12
        ? { year: state.year + 1, month: 1 }
        : { ...state, month: state.month + 1 };
    case 'GO':
      return { ...state, month: action.month };
  }
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const color = (index: number) => `var(--chart-${index + 1})`;

/**
 * ⑥ 독서 달력 — 이미 받은 책 목록으로 그린다(네트워크 요청 없음).
 *
 * 예전 달력은 월을 넘길 때마다 API 를 불렀는데, 응답에 없는 `success` 필드를 검사해
 * 항상 에러로 떨어졌다 → 첫 달 말고는 늘 0권이었다. 지금은 계산이 전부 buildCalendarMonth 안에 있다.
 * 연도 탭이 바뀌면 부모가 key 를 바꿔 이 컴포넌트를 새로 만든다(초기 달 다시 계산).
 */
export const ReadingCalendar = ({ books, year, today, isOwner, bookHref }: ReadingCalendarProps) => {
  const [view, dispatch] = useReducer(monthReducer, {
    year,
    month: getInitialCalendarMonth(books, year, today),
  });
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const month = buildCalendarMonth(books, view.year, view.month, today);
  const { summary } = month;

  return (
    <section className='rounded-2xl border border-line-soft bg-card p-5'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-bold text-text-strong'>독서 캘린더</h3>
        <div className='flex items-center gap-1'>
          <Button variant='outline' size='icon-sm' className='shadow-none' onClick={() => dispatch({ type: 'PREV' })} aria-label='이전 달'>
            <ChevronLeft className='size-4' />
          </Button>
          <span className='min-w-[86px] text-center text-sm font-medium text-text-body'>
            {view.year}년 {view.month}월
          </span>
          <Button variant='outline' size='icon-sm' className='shadow-none' onClick={() => dispatch({ type: 'NEXT' })} aria-label='다음 달'>
            <ChevronRight className='size-4' />
          </Button>
        </div>
      </div>

      {/* 월 칩 — 월별 추이 차트를 대신한다. 공개 완독이 있는 달에 점 */}
      <div className='mt-3 grid grid-cols-12 gap-0.5'>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const isOn = m === view.month;
          const hasBooks = month.activeMonths.includes(m);
          return (
            <button
              key={m}
              type='button'
              data-month-chip
              onClick={() => dispatch({ type: 'GO', month: m })}
              aria-pressed={isOn}
              aria-label={`${m}월${hasBooks ? ', 완독 있음' : ''}`}
              className={`relative rounded-md py-1 text-xs ${isOn ? 'bg-primary text-primary-foreground' : 'text-text-subtle hover:bg-sunken'}`}
            >
              {m}
              {hasBooks && (
                <span aria-hidden className={`absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${isOn ? 'bg-primary-foreground' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className='mt-3 grid grid-cols-7 text-center text-xs text-text-subtle'>
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={i === 0 ? 'text-rank-up' : i === 6 ? 'text-primary' : ''}>{d}</div>
        ))}
      </div>

      <div className='mt-1 grid grid-cols-7'>
        {month.weeks.flat().map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className='h-14 border-t border-line-soft' />;
          const count = day.completions.length;
          return (
            <button
              key={day.date}
              type='button'
              disabled={count === 0}
              onClick={() => setSelected(day)}
              aria-label={count > 0 ? `${view.month}월 ${day.day}일, ${count}권 완독` : undefined}
              className='relative h-14 border-t border-line-soft px-1 pt-0.5 text-left text-xs text-text-subtle enabled:hover:bg-sunken'
            >
              {day.day}

              {/* 기간 막대 — 시작일을 적은 책만. 줄마다 3px */}
              {day.ranges.map((range) => (
                <span
                  key={range.book.id}
                  aria-hidden
                  className={`absolute h-[3px] ${range.isStart ? 'left-1 rounded-l-full' : 'left-0'} ${range.isEnd ? 'right-1 rounded-r-full' : 'right-0'} ${range.book.is_public ? '' : 'opacity-50'}`}
                  style={{ bottom: `${3 + range.lane * 5}px`, backgroundColor: color(range.colorIndex) }}
                />
              ))}
              {day.overflow > 0 && (
                <span className='absolute left-1 bottom-4 text-[10px] text-text-subtle'>+{day.overflow}</span>
              )}

              {/* 완독 표지 — 같은 날 여러 권이면 겹쳐 쌓고 +N */}
              {count > 0 && (
                <span className='absolute right-1 bottom-1.5 flex'>
                  {day.completions.slice(0, 2).map(({ book, colorIndex }, i) => (
                    <span
                      key={book.id}
                      className={`relative block h-[38px] w-[26px] ${i > 0 ? '-ml-4' : ''} ${book.is_public ? '' : 'opacity-50'}`}
                      style={colorIndex !== null ? { outline: `1.5px solid ${color(colorIndex)}` } : undefined}
                    >
                      <BookCover {...toCoverSource(book)} title={book.title} decorative size='fill' sizes='26px' />
                    </span>
                  ))}
                  {count > 2 && (
                    <span className='ml-0.5 self-end text-[10px] font-medium text-text-body'>+{count - 2}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className='mt-3 text-xs text-text-subtle'>
        {view.month}월 <b className='text-text-strong'>{summary.publicCount}권</b> 완독
        {summary.publicPages > 0 && ` · ${summary.publicPages.toLocaleString()}쪽`}
        {isOwner && summary.privateCount > 0 && ` · 비공개 ${summary.privateCount}권`}
      </p>

      <Dialog open={selected !== null} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected && `${view.month}월 ${selected.day}일 완독한 책`}
            </DialogTitle>
          </DialogHeader>
          <ul className='divide-y divide-line-soft'>
            {selected?.completions.map(({ book }) => (
              <li key={book.id}>
                <Link href={bookHref(book)} className='flex items-center gap-3 py-3 hover:text-primary'>
                  <BookCover {...toCoverSource(book)} title={book.title} decorative size='xs' />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium text-text-strong'>{book.title}</span>
                    <span className='block truncate text-sm text-text-subtle'>{book.author}</span>
                  </span>
                  {!book.is_public && <span className='text-xs text-text-subtle'>비공개</span>}
                  {isRated(book.rating) && (
                    <span className='text-sm font-medium text-text-body'>
                      {book.is_life_book ? '인생책' : `${book.rating}점`}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
};
```

> `text-[10px]`·`h-[3px]` 같은 임의값이 린트(`2017081` 커밋의 07 스케일 규칙)에 걸리면 가장 가까운 스케일 클래스(`text-xs`, `h-0.5`)로 바꾼다.

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/widgets/library/ReadingCalendar.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: 평점 카드 실패 테스트**

`APP/src/features/stats/ui/RatingSummaryCard.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { RatingSummaryCard } from './RatingSummaryCard';

const ratings = [
  { rating: 5, is_life_book: true, count: 1, fill: '' },
  { rating: 5, is_life_book: false, count: 2, fill: '' },
  { rating: 3, is_life_book: false, count: 9, fill: '' },
  { rating: 0, is_life_book: false, count: 4, fill: '' },
];

describe('RatingSummaryCard', () => {
  it('분포(0점 제외)와 올해의 인생책', () => {
    const life = createTestBook({ title: '데이터 삽질 끝에 UX가 보였다', is_life_book: true, completed_date: '2026-05-08' });
    const html = renderToStaticMarkup(
      <RatingSummaryCard year={2026} ratings={ratings} averageRating={3.2} total={14} lifeBooks={[life]} bookHref={(b) => `/me/${b.id}`} onRatingClick={() => {}} />
    );
    expect(html).toContain('평균 3.2 · 14권');
    expect(html).toContain('인생책');
    expect(html).not.toContain('0점');
    expect(html).toContain('2026 인생책');
    expect(html).toContain('데이터 삽질 끝에 UX가 보였다');
  });

  it('인생책이 없으면 그 칸을 그리지 않는다', () => {
    const html = renderToStaticMarkup(
      <RatingSummaryCard year={2026} ratings={ratings} averageRating={3.2} total={14} lifeBooks={[]} bookHref={(b) => `/me/${b.id}`} onRatingClick={() => {}} />
    );
    expect(html).not.toContain('2026 인생책');
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/ui/RatingSummaryCard.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 7: 구현**

`APP/src/features/stats/ui/RatingSummaryCard.tsx`:

```tsx
import Link from 'next/link';

import { BookCover } from '@repo/ui';

import { toCoverSource } from '@/entities/book';

import type { Book, RatingReadingData } from '@/entities/book';
import type { RatingFilter } from '@/features/stats/model/useLibraryFilters';

type RatingSummaryCardProps = {
  year: number;
  ratings: RatingReadingData[];
  averageRating: number;
  total: number;
  /** 그 해 인생책 — 앞 3권만 그린다 */
  lifeBooks: Book[];
  bookHref: (book: Book) => string;
  /** 행 클릭 → 책장 평점 필터 (기존 동작) */
  onRatingClick: (rating: RatingFilter) => void;
};

export const RatingSummaryCard = ({
  year,
  ratings,
  averageRating,
  total,
  lifeBooks,
  bookHref,
  onRatingClick,
}: RatingSummaryCardProps) => {
  // 0점 = "평가 안 함" — 분포에서 뺀다 (model/rating.ts 와 같은 규칙)
  const rows = ratings.filter((r) => r.is_life_book || r.rating > 0);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5'>
      <div className='flex items-baseline justify-between'>
        <h3 className='text-base font-bold text-text-strong'>평점 분포</h3>
        <span className='text-xs text-text-subtle'>
          평균 {averageRating > 0 ? averageRating.toFixed(1) : '—'} · {total}권
        </span>
      </div>

      <ul className='space-y-1.5 text-xs'>
        {rows.map((row) => {
          const label = row.is_life_book ? '인생책' : `${row.rating}점`;
          return (
            <li key={label}>
              <button
                type='button'
                onClick={() => onRatingClick(row.is_life_book ? 'life' : row.rating)}
                className='grid w-full grid-cols-[48px_1fr_20px] items-center gap-2 text-left hover:text-primary'
              >
                <span className='text-text-body'>{label}</span>
                <span className='h-2 overflow-hidden rounded-full bg-sunken'>
                  <span
                    className='block h-full rounded-full'
                    style={{
                      width: `${(row.count / max) * 100}%`,
                      backgroundColor: row.is_life_book ? 'var(--chart-4)' : 'var(--chart-1)',
                    }}
                  />
                </span>
                <span className='text-right text-text-strong'>{row.count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {lifeBooks.length > 0 && (
        <div className='rounded-xl bg-sunken p-3'>
          <p className='mb-2 text-xs text-text-subtle'>{year} 인생책</p>
          <ul className='flex gap-3'>
            {lifeBooks.slice(0, 3).map((book) => (
              <li key={book.id} className='min-w-0 flex-1'>
                <Link href={bookHref(book)} className='flex items-center gap-2 hover:text-primary'>
                  <BookCover {...toCoverSource(book)} title={book.title} decorative size='xs' />
                  <span className='line-clamp-2 text-sm font-medium text-text-strong'>{book.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
```

- [ ] **Step 8: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/stats/ui/RatingSummaryCard.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: 연결**

1. `PublicLibraryContent.tsx`: props 타입·구조 분해에서 `calendarSlot` 삭제. 아래 추가 후 `LibraryView` 에 `calendarBooks={calendarBooks}` 전달, 기존 `calendarSlot=` 줄 삭제:

```tsx
  // 달력: 방문자는 공개만(books 가 이미 공개만 온다), 주인은 비공개까지 — 반투명으로 그린다
  const calendarBooks = isOwnProfile ? books : publicBooks;
```

2. `LibraryView.tsx`:
   - props `calendarSlot` 삭제 → `/** 달력에 그릴 책 (주인 = 비공개 포함) */ calendarBooks?: Book[];` 추가(기본 `[]`).
   - import `ReadingCalendar`(`./ReadingCalendar`), `RatingSummaryCard`. `DashboardCharts` dynamic import 블록과 `handleMonthClick` 삭제.
   - 연도 뷰의 `<div className='grid … lg:grid-cols-3'> … DashboardCharts … calendarSlot … </div>` 전체를 교체:

```tsx
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              <ReadingCalendar
                key={selectedYear}
                books={calendarBooks}
                year={selectedYear}
                today={today}
                isOwner={isOwner}
                bookHref={bookHref}
              />
              <RatingSummaryCard
                year={selectedYear}
                ratings={stats.ratingReading}
                averageRating={stats.averageRating}
                total={stats.totalCompletedBooks}
                lifeBooks={completedBooks.filter((book) => book.is_life_book)}
                bookHref={bookHref}
                onRatingClick={handleRatingClick}
              />
            </div>
```

3. `page.tsx`: `CalendarBlockError`·`CalendarBlockSkeleton`·`CalendarSection`·`ErrorBoundary` import 와 `calendarSlot={…}` prop 삭제. (`ErrorBoundary`·`Suspense` 가 다른 곳에서 쓰이면 남긴다 — `Suspense` 는 남는다.)

- [ ] **Step 10: 옛 캘린더 삭제 — 추적 여부 확인 후**

Run: `git -C /Users/dreamfulbud/Desktop/stronger/0127 ls-files apps/page0127/src/widgets/dashboard apps/page0127/app/api/books/calendar`
Expected: 지울 6개 파일이 전부 목록에 있다(추적 중 → `git rm` 으로 복구 가능).

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 rm apps/page0127/src/widgets/dashboard/CalendarSection.tsx apps/page0127/src/widgets/dashboard/CalendarBlock.tsx apps/page0127/src/widgets/dashboard/CalendarBlockError.tsx apps/page0127/src/widgets/dashboard/CalendarBlockSkeleton.tsx apps/page0127/src/widgets/dashboard/ReadingCalendar.tsx apps/page0127/app/api/books/calendar/route.ts
```

`APP/src/shared/api/endpoints.ts` 에서 `books/calendar` 항목을 지운다. 이어서 남은 참조 확인:

Run: `grep -rn "books/calendar\|CalendarSection\|CalendarBlock\|widgets/dashboard/ReadingCalendar" /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/app`
Expected: 출력 없음

- [ ] **Step 11: 타입·린트·테스트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/features/stats /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/shared/api "/Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/app/(public)/[username]/page.tsx" && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test`
Expected: 에러 0, PASS

- [ ] **Step 12: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src apps/page0127/app
```

제안 메시지: `🐛 Fix: 월을 넘기면 0권이던 독서 달력을 받은 책 목록으로 다시 그린다` (본문: 옛 API 의 없는 `success` 필드 검사가 원인, 위젯·라우트 삭제, 방문자 공개·비공개 반투명)

---

### Task 7: 취향 공개 RPC + 연속 성향 묶기 + 페이지 조회 교체

**Files:**
- Create: `/Users/dreamfulbud/Desktop/stronger/0127/supabase/migrations/20261013000000_public_taste_history_rpc.sql`
- Modify: `APP/src/shared/config/schemaVersion.ts:14`
- Modify: `APP/src/entities/taste-analysis/types.ts` (타입 추가)
- Create: `APP/src/entities/taste-analysis/api/getPublicTasteHistory.ts`
- Create: `APP/src/entities/taste-analysis/model/groupTasteHistory.ts`, `groupTasteHistory.test.ts`
- Modify: `APP/app/(public)/[username]/page.tsx`
- Modify: `APP/src/widgets/public-library/PublicLibraryContent.tsx`, `PublicLibraryHeader.tsx` (prop 타입만)

**Interfaces:**
- Produces:

```ts
export type PublicTasteHistoryItem = TasteAnalysisSummary & {
  /** 최신 1건에만 채워진다 (preference_profile.liked.topics) */
  liked_topics: string[] | null;
};
export const getPublicTasteHistory: (userId: string) => Promise<PublicTasteHistoryItem[]>;
export type TasteHistoryRun = {
  personalityType: string;
  count: number;
  startedAt: string;   // 묶음에서 가장 오래된 created_at
  latestId: string;    // 묶음에서 가장 최신 분석 id (상세 링크용)
};
export const groupTasteHistory: (items: TasteAnalysisSummary[]) => TasteHistoryRun[]; // 오래된 → 최신
```
- `PublicLibraryContent`·`PublicLibraryHeader` 의 `analysisHistory` 타입: `PublicTasteHistoryItem[]` (방문자에게도 채워진다)

- [ ] **Step 1: 마이그레이션 번호 충돌 확인**

Run: `git -C /Users/dreamfulbud/Desktop/stronger/0127 fetch -q origin && git -C /Users/dreamfulbud/Desktop/stronger/0127 ls-tree --name-only origin/main supabase/migrations/`
Expected: 마지막 줄이 `20261004000000_about_stats_rpc.sql` 이하. `20261013…` 가 이미 있으면 다음 번호(`20261013000001`)를 쓰고 아래 버전 상수도 같이 바꾼다.

- [ ] **Step 2: 마이그레이션 작성**

`supabase/migrations/20261013000000_public_taste_history_rpc.sql`:

```sql
-- 서재 페이지 취향 카드: 방문자에게도 "성향 이름 · 날짜 · 좋아하는 주제"를 보여 준다.
--
-- 왜 RLS 를 열지 않고 함수인가: taste_analyses 의 SELECT 정책은 본인만이다.
-- 정책을 열면 긴 성향 설명·싫어하는 패턴·비용까지 통째로 나간다.
-- SECURITY DEFINER 함수로 공개해도 되는 칸만 골라 낸다(get_about_stats 와 같은 방식).
--
-- 공개 칸: id, personality_type, created_at, analyzed_books_count,
--          liked_topics(최신 1건만 — preference_profile->liked->topics)
-- 비공개 유지: personality_description, disliked, patterns, analysis_model, cost_in_cents
CREATE OR REPLACE FUNCTION public.get_public_taste_history(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  personality_type text,
  created_at timestamptz,
  analyzed_books_count integer,
  liked_topics text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.personality_type,
    t.created_at,
    t.analyzed_books_count,
    CASE
      WHEN row_number() OVER (ORDER BY t.created_at DESC) = 1
        THEN ARRAY(
          SELECT jsonb_array_elements_text(t.preference_profile -> 'liked' -> 'topics')
        )
    END
  FROM public.taste_analyses t
  WHERE t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT 10;
$$;

-- 20260725000001_lock_down_function_privileges.sql 이후 새 함수는 기본 비공개다.
-- 비로그인 방문자도 서재를 보므로 anon 까지 연다.
REVOKE EXECUTE ON FUNCTION public.get_public_taste_history(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_taste_history(uuid) TO anon, authenticated;
```

`schemaVersion.ts:14` → `export const EXPECTED_MIGRATION_VERSION = '20261013000000';`

- [ ] **Step 3: groupTasteHistory 실패 테스트**

`APP/src/entities/taste-analysis/model/groupTasteHistory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { groupTasteHistory } from './groupTasteHistory';

// RPC 는 최신순으로 준다 — 실제 운영 이력(2026-10-13 스크린샷)과 같은 모양
const HISTORY = [
  { id: 'd', personality_type: '내일의 나를 준비하는 사람', created_at: '2026-10-07T00:00:00Z', analyzed_books_count: 100 },
  { id: 'c', personality_type: '내일의 나를 준비하는 사람', created_at: '2026-07-29T00:00:00Z', analyzed_books_count: 100 },
  { id: 'b', personality_type: '한 우물을 깊이 파는 사람', created_at: '2026-07-21T02:00:00Z', analyzed_books_count: 40 },
  { id: 'a', personality_type: '한 우물을 깊이 파는 사람', created_at: '2026-07-21T01:00:00Z', analyzed_books_count: 146 },
];

describe('groupTasteHistory', () => {
  it('연속된 같은 성향을 묶어 오래된 → 최신 순으로', () => {
    expect(groupTasteHistory(HISTORY)).toEqual([
      { personalityType: '한 우물을 깊이 파는 사람', count: 2, startedAt: '2026-07-21T01:00:00Z', latestId: 'b' },
      { personalityType: '내일의 나를 준비하는 사람', count: 2, startedAt: '2026-07-29T00:00:00Z', latestId: 'd' },
    ]);
  });

  it('떨어져서 다시 나온 성향은 따로 묶는다', () => {
    const runs = groupTasteHistory([
      { ...HISTORY[0], id: '3', personality_type: 'A' },
      { ...HISTORY[1], id: '2', personality_type: 'B' },
      { ...HISTORY[2], id: '1', personality_type: 'A' },
    ]);
    expect(runs.map((r) => r.personalityType)).toEqual(['A', 'B', 'A']);
  });

  it('빈 이력은 빈 배열', () => {
    expect(groupTasteHistory([])).toEqual([]);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/taste-analysis/model/groupTasteHistory.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 5: 구현**

`APP/src/entities/taste-analysis/types.ts` 의 `TasteAnalysisSummary` 아래에 추가:

```ts
/** 서재 페이지 공개 이력 — get_public_taste_history RPC 한 행 */
export type PublicTasteHistoryItem = TasteAnalysisSummary & {
  /** 최신 1건에만 채워진다 (preference_profile.liked.topics) */
  liked_topics: string[] | null;
};
```

`APP/src/entities/taste-analysis/model/groupTasteHistory.ts`:

```ts
import type { TasteAnalysisSummary } from '../types';

export type TasteHistoryRun = {
  personalityType: string;
  count: number;
  /** 묶음에서 가장 오래된 분석 시각 — 뱃지 옆 "7월~" */
  startedAt: string;
  /** 묶음에서 가장 최신 분석 — 주인이 누르면 이 회차 상세로 */
  latestId: string;
};

/**
 * 취향 이력을 "변화"로 보이게 묶는다.
 * 같은 성향이 연달아 나오면 카드가 줄을 서서 아무것도 안 바뀐 것처럼 보였다 → 한 뱃지 + ×N.
 * 입력은 최신순(RPC 순서), 출력은 시간이 흐르는 방향(오래된 → 최신).
 */
export const groupTasteHistory = (
  items: TasteAnalysisSummary[]
): TasteHistoryRun[] =>
  [...items].reverse().reduce<TasteHistoryRun[]>((runs, item) => {
    const last = runs.at(-1);
    if (last && last.personalityType === item.personality_type) {
      last.count += 1;
      last.latestId = item.id;
      return runs;
    }
    runs.push({
      personalityType: item.personality_type,
      count: 1,
      startedAt: item.created_at,
      latestId: item.id,
    });
    return runs;
  }, []);
```

`APP/src/entities/taste-analysis/api/getPublicTasteHistory.ts`:

```ts
import { createClient } from '@/shared/config/supabase/server';

import type { PublicTasteHistoryItem } from '../types';

/**
 * 서재 주인의 취향 이력(최신순 최대 10건) — 방문자도 볼 수 있는 칸만.
 * 실패하면 빈 배열: 취향 카드만 사라지고 서재는 그대로 보인다.
 */
export const getPublicTasteHistory = async (
  userId: string
): Promise<PublicTasteHistoryItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_taste_history', {
    p_user_id: userId,
  });

  if (error) {
    console.error('취향 이력 조회 실패:', error.message);
    return [];
  }
  return (data as PublicTasteHistoryItem[] | null) ?? [];
};
```

- [ ] **Step 6: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/entities/taste-analysis/model/groupTasteHistory.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: page.tsx 조회 교체**

`LibraryContent` 에서:

1. `Promise.all` 의 세 번째 항목(`supabase.from('taste_analyses').select('personality_type')…maybeSingle()`)을 `getPublicTasteHistory(profile.id)` 로 바꾸고 구조 분해를 `const [allBooks, overallStats, tasteHistory] = …` 로.
2. 주인 블록의 `Promise.all` 에서 `history` 조회(두 번째 항목)를 삭제하고 `const [{ count }, { remaining }] = …` 로. `analysisHistory = history ?? []` 줄 삭제.
3. `let analysisHistory: TasteAnalysisSummary[] = [];` 삭제. `lastAnalysis` 는 `tasteHistory[0] ?? null` 로.
4. props: `personalityType={tasteHistory[0]?.personality_type ?? null}`, `analysisHistory={tasteHistory}` — **방문자에게도** 넘긴다.
5. import: `getPublicTasteHistory` 추가, `TasteAnalysisSummary` import 삭제.

`PublicLibraryContent.tsx`·`PublicLibraryHeader.tsx` 의 `analysisHistory` prop 타입을 `PublicTasteHistoryItem[]` 로 바꾸고 주석을 "방문자에게도 채워진다"로 고친다(`PublicLibraryHeader.tsx:59-60`).

- [ ] **Step 8: 타입·린트·테스트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/entities/taste-analysis /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets/public-library "/Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/app/(public)/[username]/page.tsx" && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test`
Expected: 에러 0, PASS

- [ ] **Step 9: 로컬 DB 에 적용해 함수 동작 확인**

> 로컬 Docker Supabase 가 떠 있어야 한다. 아래는 **사용자에게 명령을 건네 직접 입력하게** 한다(학습 규칙).

```bash
npx --prefix /Users/dreamfulbud/Desktop/stronger/0127 supabase migration up --local --workdir /Users/dreamfulbud/Desktop/stronger/0127
```

확인용 SQL 파일을 스크래치패드에 써서 실행: `select * from get_public_taste_history((select user_id from taste_analyses limit 1));` → 행이 최신순 ≤10개, `liked_topics` 는 첫 행만 채워짐. anon 역할로 `set role anon;` 후 같은 쿼리가 성공하고 `select personality_description from taste_analyses` 는 0행인지 본다.

- [ ] **Step 10: 개발 DB 적용은 사용자 확인 후** (외부 시스템 변경)

사용자에게 아래 순서를 제시하고 **실행 승인**을 받는다(메모리: 링크가 운영을 가리킨 적이 있다):

① 링크가 개발 프로젝트인지 눈으로 확인 — 출력이 정확히 `uglagvujxbgdozsucxgp` 여야 한다(운영 `sjngwxtykqhlsvxcyqah` 이면 **멈춘다**):

```bash
cat /Users/dreamfulbud/Desktop/stronger/0127/supabase/.temp/project-ref
```

② 적용 목록 미리 보기 — `20261013000000_public_taste_history_rpc.sql` 하나만 나와야 한다:

```bash
npx --prefix /Users/dreamfulbud/Desktop/stronger/0127 supabase db push --dry-run --workdir /Users/dreamfulbud/Desktop/stronger/0127
```

③ 사용자 승인 후 같은 명령에서 `--dry-run` 을 빼고 실행. 적용 후 `db push` 로그 대신 `schema_migrations` 와 `pg_proc`(`proname = 'get_public_taste_history'`)를 직접 조회해 확인한다. **운영 적용은 PR 머지 직전에 말로 다시 묻는다.**

- [ ] **Step 11: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add supabase/migrations/20261013000000_public_taste_history_rpc.sql apps/page0127/src/shared/config/schemaVersion.ts apps/page0127/src/entities/taste-analysis "apps/page0127/app/(public)/[username]/page.tsx" apps/page0127/src/widgets/public-library
```

제안 메시지: `✨ Feat: 취향 이력 중 공개해도 되는 칸만 돌려주는 RPC 를 두고 서재가 그걸 읽는다`

---

### Task 8: ① 취향 카드 + 헤더 재배치

**Files:**
- Create: `APP/src/features/taste-analysis/ui/TasteProfileCard.tsx`, `TasteProfileCard.test.tsx`
- Modify: `APP/src/widgets/public-library/PublicLibraryHeader.tsx`
- Delete: `APP/src/features/taste-analysis/ui/TasteAnalysisHistoryCards.tsx` (사용처 확인 후)

**Interfaces:**
- Consumes: `PublicTasteHistoryItem`, `groupTasteHistory` (Task 7), `getPersonalityColor`
- Produces:

```ts
type TasteProfileCardProps = {
  history: PublicTasteHistoryItem[]; // 최신순
  isOwner: boolean;
  /** 주인 전용: 분석 버튼 (헤더가 게이트·다이얼로그를 갖고 있어 노드로 받는다) */
  action?: React.ReactNode;
  /** 분석 전 자리표시용 — 주인 전용 */
  analyzableBookCount: number;
  minBooks: number;
};
```

- [ ] **Step 1: 실패 테스트**

`APP/src/features/taste-analysis/ui/TasteProfileCard.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { TasteProfileCard } from './TasteProfileCard';

const HISTORY = [
  { id: 'd', personality_type: '내일의 나를 준비하는 사람', created_at: '2026-10-07T00:00:00Z', analyzed_books_count: 100, liked_topics: ['관계', '심리', '일상의 철학', '에세이 톤', '다섯째'] },
  { id: 'c', personality_type: '내일의 나를 준비하는 사람', created_at: '2026-07-29T00:00:00Z', analyzed_books_count: 100, liked_topics: null },
  { id: 'b', personality_type: '한 우물을 깊이 파는 사람', created_at: '2026-07-21T00:00:00Z', analyzed_books_count: 40, liked_topics: null },
];

const render = (props: Partial<Parameters<typeof TasteProfileCard>[0]> = {}) =>
  renderToStaticMarkup(
    <TasteProfileCard history={HISTORY} isOwner={false} analyzableBookCount={0} minBooks={5} {...props} />
  );

describe('TasteProfileCard', () => {
  it('최신 성향 크게 + 키워드 4개 + 변화 뱃지(묶음)', () => {
    const html = render();
    expect(html).toContain('내일의 나를 준비하는 사람');
    expect(html).toContain('#관계');
    expect(html).toContain('#에세이 톤');
    expect(html).not.toContain('#다섯째');
    expect(html).toContain('책 100권 기준');
    expect(html).toContain('취향의 변화');
    expect(html).toContain('×2');
    // 방문자는 회차 상세로 가는 링크가 없다
    expect(html).not.toContain('/dashboard/taste-analysis/');
  });

  it('주인은 뱃지·자세히가 회차 상세로 이어진다', () => {
    const html = render({ isOwner: true });
    expect(html).toContain('href="/dashboard/taste-analysis/d"');
    expect(html).toContain('href="/dashboard/taste-analysis/b"');
  });

  it('이력이 한 번뿐이면 변화 줄을 그리지 않는다', () => {
    expect(render({ history: [HISTORY[0]] })).not.toContain('취향의 변화');
  });

  it('분석이 없으면 방문자에겐 아무것도, 주인에겐 남은 권수 자리표시', () => {
    expect(render({ history: [] })).toBe('');
    const owner = render({ history: [], isOwner: true, analyzableBookCount: 3 });
    expect(owner).toContain('평가한 책 3/5권');
    expect(owner).toContain('2권 더 모이면');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/taste-analysis/ui/TasteProfileCard.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`APP/src/features/taste-analysis/ui/TasteProfileCard.tsx`:

```tsx
import Link from 'next/link';

import { groupTasteHistory } from '@/entities/taste-analysis/model/groupTasteHistory';
import { getPersonalityColor } from '@/entities/taste-analysis/model/personalityTypes';

import type { PublicTasteHistoryItem } from '@/entities/taste-analysis/types';

type TasteProfileCardProps = {
  /** 최신순 (get_public_taste_history) */
  history: PublicTasteHistoryItem[];
  isOwner: boolean;
  /** 주인 전용 분석 버튼 — 게이트·다이얼로그는 헤더가 갖고 있다 */
  action?: React.ReactNode;
  analyzableBookCount: number;
  minBooks: number;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });
const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { month: 'long', timeZone: 'Asia/Seoul' });

const detailHref = (id: string) => `/dashboard/taste-analysis/${id}`;

/**
 * ① 헤더 오른쪽 취향 카드.
 * 최신 결과 하나를 크게, 지난 결과는 "변해 온 길"로 — 같은 성향이 연달아 나오면 한 뱃지 + ×N.
 */
export const TasteProfileCard = ({
  history,
  isOwner,
  action,
  analyzableBookCount,
  minBooks,
}: TasteProfileCardProps) => {
  const latest = history[0];

  if (!latest) {
    if (!isOwner) return null;
    const left = Math.max(minBooks - analyzableBookCount, 0);
    return (
      <div className='rounded-2xl border border-dashed border-line-soft bg-card p-5'>
        <p className='text-xs text-text-subtle'>AI 독서 성향</p>
        <p className='mt-1 text-sm text-text-body'>
          평가한 책 {analyzableBookCount}/{minBooks}권
          {left > 0 && ` — ${left}권 더 모이면 AI가 성향을 알려줘요`}
        </p>
        {action && <div className='mt-3'>{action}</div>}
      </div>
    );
  }

  const runs = groupTasteHistory(history);
  const topics = (latest.liked_topics ?? []).slice(0, 4);
  const accent = getPersonalityColor(latest.personality_type);

  return (
    <div className='relative overflow-hidden rounded-2xl bg-card p-5 pl-6'>
      <span aria-hidden className='absolute inset-y-0 left-0 w-1.5' style={{ backgroundColor: accent }} />
      <div className='flex items-start justify-between gap-2'>
        <p className='text-xs text-text-subtle'>
          AI 독서 성향 · {formatDate(latest.created_at)} · 책 {latest.analyzed_books_count}권 기준
        </p>
        {isOwner && (
          <Link href={detailHref(latest.id)} className='shrink-0 text-xs text-primary hover:underline'>
            자세히 ›
          </Link>
        )}
      </div>
      <p className='heading-2 mt-1 break-keep'>{latest.personality_type}</p>

      {topics.length > 0 && (
        <ul className='mt-2 flex flex-wrap gap-1'>
          {topics.map((topic) => (
            <li key={topic} className='rounded-full bg-accent px-2 py-0.5 text-xs text-text-body'>
              #{topic}
            </li>
          ))}
        </ul>
      )}

      {runs.length > 1 && (
        <div className='mt-3 flex flex-wrap items-center gap-1 border-t border-line-soft pt-3 text-xs text-text-subtle'>
          <span className='mr-1'>취향의 변화</span>
          {runs.map((run, index) => {
            const badge = (
              <>
                <span aria-hidden className='size-1.5 rounded-full' style={{ backgroundColor: getPersonalityColor(run.personalityType) }} />
                {run.personalityType}
                {run.count > 1 && ` ×${run.count}`}
                <span className='text-text-subtle'>{formatMonth(run.startedAt)}</span>
              </>
            );
            const className = 'inline-flex items-center gap-1 rounded-full border border-line-soft bg-sunken px-2 py-0.5 text-text-body';
            return (
              <span key={run.latestId} className='inline-flex items-center gap-1'>
                {index > 0 && <span aria-hidden>→</span>}
                {isOwner ? (
                  <Link href={detailHref(run.latestId)} className={`${className} hover:border-line-strong`}>{badge}</Link>
                ) : (
                  <span className={className}>{badge}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {action && <div className='mt-3'>{action}</div>}
    </div>
  );
};
```

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/features/taste-analysis/ui/TasteProfileCard.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: 헤더 재배치** — `PublicLibraryHeader.tsx`

1. import: `TasteAnalysisHistoryCards` 삭제, `TasteProfileCard` 추가. `getPersonalityColor` import 삭제(헤더에서 더 안 씀). props 타입의 `analysisHistory` 는 Task 7 에서 바꾼 `PublicTasteHistoryItem[]`. `personalityType` prop 은 삭제(카드가 history[0] 을 쓴다) — `PublicLibraryContent`·`page.tsx` 에서도 같이 제거.
2. `<header>` 를 그리드로: `className='grid gap-6 rounded-[28px] bg-accent p-6 sm:p-8 lg:grid-cols-[1fr_400px] lg:items-center'`.
3. 왼쪽 블록: 기존 아바타·이름·@·FollowStats·소개를 그대로 두고, **성향 칩(170~180행) 삭제**, 버튼 묶음(190~230행)을 소개 아래 `mt-4 flex flex-wrap gap-2` 로 옮긴다. 주인 버튼에서 **취향 분석 버튼은 빼서** 아래 `analyzeButton` 변수로:

```tsx
  const analyzeButton = isOwnProfile ? (
    <Button
      onClick={handleAnalyzeTaste}
      disabled={isAnalyzing}
      size='sm'
      variant={isTasteAnalysisUnlocked ? 'default' : 'outline'}
      className={isTasteAnalysisUnlocked ? undefined : 'shadow-none'}
      {...coachTarget('taste-analysis')}
    >
      {isAnalyzing && <Loader2 className='h-4 w-4 animate-spin' />}
      {isAnalyzing
        ? '분석 중… (최대 1분)'
        : isTasteAnalysisUnlocked
          ? `${analysisHistory.length > 0 ? '다시 분석' : '취향 분석'} (${tasteAnalysisRemaining}/${MONTHLY_LIMIT} 남음)`
          : `취향 분석 (${analyzableBookCount}/${TASTE_ANALYSIS_MIN_BOOKS}권)`}
    </Button>
  ) : undefined;
```

4. 오른쪽:

```tsx
        <TasteProfileCard
          history={analysisHistory}
          isOwner={isOwnProfile}
          action={analyzeButton}
          analyzableBookCount={analyzableBookCount}
          minBooks={TASTE_ANALYSIS_MIN_BOOKS}
        />
```

5. `{isOwnProfile && <TasteAnalysisHistoryCards items={analysisHistory} />}` 삭제.

- [ ] **Step 6: 옛 카드 삭제**

Run: `grep -rn "TasteAnalysisHistoryCards" /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/app`
Expected: 자기 파일 정의만 남음 → `git -C /Users/dreamfulbud/Desktop/stronger/0127 rm apps/page0127/src/features/taste-analysis/ui/TasteAnalysisHistoryCards.tsx`

- [ ] **Step 7: 타입·린트·테스트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/features/taste-analysis /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets/public-library "/Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/app/(public)/[username]/page.tsx" && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test`
Expected: 에러 0, PASS

- [ ] **Step 8: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src/features/taste-analysis apps/page0127/src/widgets/public-library "apps/page0127/app/(public)/[username]/page.tsx"
```

제안 메시지: `🎨 UI/UX: 헤더에 최신 취향을 크게 두고 지난 결과는 변화 뱃지로 묶는다`

---

### Task 9: ④ 책장 강화

**Files:**
- Modify: `APP/src/widgets/book/ui/PublicBookShelf.tsx`, `PublicBookShelf.module.css`, `PublicBookShelf.test.tsx`
- Modify: `APP/src/features/stats/ui/DashboardBookList.tsx:372-391` (보기 전환 글자)
- Modify: `APP/src/features/stats/ui/BookFeedGrid.tsx:55` (표지 보기 인생책 테두리)
- Modify: `APP/src/widgets/library/LibraryView.tsx` (`readingBooks` 를 선반 끝에, 명판 연도)

**Interfaces:**
- Produces: `PublicBookShelf` 새 props:

```ts
  /** 선반 끝에 책갈피를 달고 꽂을 읽는 중인 책 */
  readingBooks?: Book[];
  /** 마지막 단 오른쪽 아래 연도 명판 (장식) */
  plateLabel?: string;
```

- [ ] **Step 1: 실패 테스트 추가** — `PublicBookShelf.test.tsx` 끝에. 파일의 기존 `makeBook` 은 id 가 `'b1'` 고정이라 두 권 이상이면 key 가 겹친다 → Task 1 의 `createTestBook` 을 import 해서 쓴다(`import { createTestBook as createBook } from '@/entities/book/model/createTestBook';`):

```tsx
describe('PublicBookShelf — 책장 강화', () => {
  it('읽는 중인 책은 선반 끝에 책갈피와 함께, 접근명에 "읽는 중"', () => {
    const done = createBook({ title: '다 읽은 책' });
    const reading = createBook({ title: '읽고 있는 책', status: 'reading' });
    const html = renderToStaticMarkup(
      <PublicBookShelf books={[done]} readingBooks={[reading]} username='me' compact />
    );
    expect(html.indexOf('다 읽은 책')).toBeLessThan(html.indexOf('읽고 있는 책'));
    expect(html).toContain('data-bookmark');
    expect(html).toContain('aria-label="읽고 있는 책 (읽는 중)"');
  });

  it('책마다 제목 말풍선, 명판은 장식', () => {
    const html = renderToStaticMarkup(
      <PublicBookShelf books={[createBook({ title: '말풍선 책', rating: 3 })]} plateLabel='2026' username='me' compact />
    );
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('말풍선 책 · 3점');
    expect(html).toMatch(/aria-hidden="true"[^>]*>2026</);
  });

  it('왼쪽부터 채운다 — 가운데 정렬 클래스를 쓰지 않는다', () => {
    const html = renderToStaticMarkup(<PublicBookShelf books={[createBook()]} username='me' />);
    expect(html).toContain('data-align="start"');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/widgets/book/ui/PublicBookShelf.test.tsx`
Expected: 새 3개 FAIL, 기존 PASS

- [ ] **Step 3: 구현 — 컴포넌트**

`PublicBookShelf.tsx`:

1. props 타입에 위 두 prop 추가, 구조 분해 `readingBooks = [], plateLabel`.
2. `books.length === 0` 조건을 `books.length === 0 && readingBooks.length === 0` 로.
3. 렌더할 목록을 합친다: `const shelfItems = [...books.map((book) => ({ book, isReading: false })), ...readingBooks.map((book) => ({ book, isReading: true }))];` — `books.map((book) => …)` 을 `shelfItems.map(({ book, isReading }) => …)` 로.
4. `<ul className={styles.books}>` → `<ul className={styles.books} data-align='start'>`.
5. `<Link …>` 에 접근명과 말풍선:

```tsx
              <Link
                href={getHref(book)}
                className={isReread ? styles.reread : undefined}
                aria-label={isReading ? `${book.title} (읽는 중)` : undefined}
                aria-describedby={`shelf-tip-${book.id}`}
              >
                {/* …기존 표지/책등… */}
                <span id={`shelf-tip-${book.id}`} role='tooltip' className={styles.tip}>
                  {book.title}
                  {isRated(book.rating) && ` · ${book.is_life_book ? '인생책' : `${book.rating}점`}`}
                </span>
                {isReading && <span data-bookmark aria-hidden className={styles.bookmark} />}
```

   (`isRated` 를 `@/entities/book` import 에 추가)
6. `</ul>` 뒤:

```tsx
      {plateLabel && (
        <span aria-hidden='true' className={styles.plate}>
          {plateLabel}
        </span>
      )}
```

- [ ] **Step 4: 구현 — CSS** (`PublicBookShelf.module.css`)

1. `.books` 와 `.compact .books` 의 `justify-content: center;` → `justify-content: flex-start;`
2. `.shelf` 에 `position: relative;` 추가.
3. hover 규칙을 꺼내기로 바꾸고 포커스·모션 감소를 더한다(기존 `.books li:hover a` 블록 교체):

```css
/* 꺼내기 — 마우스·키보드 포커스 모두. 크기는 그대로, 위로만 12px 빠진다 */
.books li:hover a,
.books li a:focus-visible {
  transform: translateY(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .books li a {
    transition: none;
  }
  .books li:hover a,
  .books li a:focus-visible {
    transform: none;
  }
}

/* 제목 말풍선 — 꺼냈을 때만 보인다 */
.tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  background: var(--text-strong);
  color: var(--card);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  z-index: 2;
}

.books li:hover .tip,
.books li a:focus-visible .tip {
  opacity: 1;
}

/* 읽는 중 책갈피 리본 — 책 위쪽 가장자리에 걸친다 */
.bookmark {
  position: absolute;
  top: -2px;
  right: 6px;
  width: 8px;
  height: 26px;
  /* --rank-up 은 "순위 상승 전용"이라 쓰지 않는다 — 같은 코랄의 차트 계열 토큰 */
  background: var(--chart-2);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%);
  pointer-events: none;
}

/* 연도 명판 — 마지막 단 오른쪽 아래 */
.plate {
  position: absolute;
  right: 12px;
  bottom: 1.25rem;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  color: var(--text-subtle);
  background: var(--shelf-top);
  border: 1px solid var(--shelf-edge);
}
```

> `--text-strong`·`--card`·`--text-subtle`·`--chart-2` 는 `packages/design-tokens/dist/tokens.css` 에 있는 이름이다(2026-10-13 확인).

- [ ] **Step 5: 통과 확인**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test -- src/widgets/book/ui/PublicBookShelf.test.tsx`
Expected: 전부 PASS

- [ ] **Step 6: 보기 전환을 글자 세그먼트로** — `DashboardBookList.tsx` 372~391행 두 버튼 안의 아이콘 뒤에 글자 추가:

```tsx
            <Library className='h-4 w-4' />
            <span className='ml-1'>책등</span>
```

```tsx
            <LayoutGrid className='h-4 w-4' />
            <span className='ml-1'>표지</span>
```

(`className='h-7 px-2'` 는 유지)

표지 보기의 인생책 강조 — `APP/src/features/stats/ui/BookFeedGrid.tsx:55` 의 `className` 을 교체:

```tsx
            className={`group flex aspect-square flex-col overflow-hidden rounded-md border bg-muted transition-transform hover:-translate-y-0.5 hover:shadow-md ${
              // 인생책은 금빛(chart-4) 테두리 — 책등 보기에서 표지를 정면으로 세우는 것과 같은 위계
              book.is_life_book ? 'border-2 border-[var(--chart-4)]' : 'border-line-soft'
            }`}
```

(임의값이 린트에 걸리면 `style={book.is_life_book ? { borderColor: 'var(--chart-4)', borderWidth: 2 } : undefined}` 로)

- [ ] **Step 7: LibraryView 연결** — 연도 뷰 `renderBooks` 의 `PublicBookShelf` 에 넘긴다:

```tsx
              <PublicBookShelf
                books={filteredBooks}
                readingBooks={readingBooks}
                plateLabel={String(selectedYear)}
                username={username}
                compact
              />
```

- [ ] **Step 8: 타입·린트·테스트**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npx --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 eslint /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets/book /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/features/stats/ui/DashboardBookList.tsx /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src/widgets/library && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test`
Expected: 에러 0, PASS

- [ ] **Step 9: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src/widgets/book apps/page0127/src/features/stats/ui/DashboardBookList.tsx apps/page0127/src/features/stats/ui/BookFeedGrid.tsx apps/page0127/src/widgets/library/LibraryView.tsx
```

제안 메시지: `🎨 UI/UX: 책장을 왼쪽부터 채우고 꺼내기·말풍선·읽는 중 책갈피·연도 명판을 단다`

---

### Task 10: ③ 읽는 중 축소 · 배치 마무리 · 남은 코드 정리 · e2e · 화면 확인

**Files:**
- Modify: `APP/src/widgets/library/ReadingNowStrip.tsx`
- Modify: `APP/src/widgets/library/LibraryView.tsx` (최종 순서)
- Modify: `APP/src/features/stats/model/useLibraryFilters.ts`, `APP/src/features/stats/ui/DashboardBookList.tsx` (월 필터 제거)
- Delete (사용처 0 확인 후): `DashboardCharts.tsx`, `MonthlyReadingChart.tsx`, `RatingDoughnutChart.tsx`, `ReadingProgressOverview.tsx`
- Modify: `APP/e2e/public-library.spec.ts`

- [ ] **Step 1: 읽는 중 한 줄로** — `ReadingNowStrip.tsx` 의 `<section>` ~ `</ul>` 를 교체:

```tsx
    <section className='flex items-center gap-4 overflow-x-auto rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5'>
      <h3 className='flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-strong'>
        <BookOpen className='size-4 text-primary' />
        지금 읽는 중
      </h3>
      <ul className='flex gap-4'>
        {books.map((book) => (
          <li key={book.id} className='shrink-0'>
            <Link href={bookHref(book)} className='group flex items-center gap-2'>
              <span className='relative block h-12 w-8 bg-muted'>
                <BookCover {...toCoverSource(book)} title={book.title} size='fill' sizes='32px' decorative />
              </span>
              <span className='max-w-40 truncate text-sm text-text-body group-hover:text-primary'>
                {book.title}
              </span>
              {book.start_date && (
                <span className='text-xs text-text-subtle'>
                  {Number(book.start_date.slice(5, 7))}/{Number(book.start_date.slice(8, 10))}~
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
```

- [ ] **Step 2: LibraryView 연도 뷰 최종 순서 확인** — 연도 뷰 `<div className='space-y-6'>` 안이 정확히 이 순서인지 맞춘다:
  `YearSummary` → `bookShelf`(안에 `ReadingNowStrip` → 책장 → 비공개 펼치기) → `ReadingBalanceCard` → `grid(ReadingCalendar | RatingSummaryCard)`.

- [ ] **Step 3: 월 필터 제거** — 진입점(차트 클릭)이 없어졌다.
  - `useLibraryFilters.ts`: `selectedMonth` 상태, `TOGGLE_MONTH`·`CLEAR_MONTH` 액션, `toggleMonth`·`clearMonth` 삭제.
  - `DashboardBookList.tsx`: `selectedMonth`·`onRemoveMonthFilter` props, 월 필터 분기(178~183행), `handleRemoveMonthFilter`, `activeFilterCount` 의 월 항목, 월 칩 버튼(423~430행) 삭제.
  - `LibraryView.tsx`: 두 prop 전달과 구조 분해의 `selectedMonth` 삭제.

- [ ] **Step 4: 사용처 0 인 차트 삭제**

Run: `grep -rln "DashboardCharts\|MonthlyReadingChart\|RatingDoughnutChart\|ReadingProgressOverview" /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/src /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127/app`
Expected: 각 파일 자신(과 서로)만 나온다. 그 외 사용처가 있으면 그 파일은 지우지 않는다.

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 rm apps/page0127/src/features/stats/ui/DashboardCharts.tsx apps/page0127/src/features/stats/ui/MonthlyReadingChart.tsx apps/page0127/src/features/stats/ui/RatingDoughnutChart.tsx apps/page0127/src/features/stats/ui/ReadingProgressOverview.tsx
```

- [ ] **Step 5: e2e 추가** — `APP/e2e/public-library.spec.ts` 끝에:

```ts
test('방문자도 올해 서재·독서 캘린더를 보고, 비공개 책 펼치기는 없다', async ({ page }) => {
  const path = await findLibraryPath(page);
  test.skip(!path, '이 DB 에는 공개 서재가 없다');
  await page.goto(path!);

  // 기본 탭 = 올해(비었으면 최근 해) — '전체'가 선택돼 있으면 안 된다
  await expect(page.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'false');

  await expect(page.getByRole('heading', { name: '독서 캘린더' })).toBeVisible();
  // 월을 넘겨도 에러 없이 요약이 남는다 (예전엔 넘기면 항상 0권)
  await page.getByRole('button', { name: '이전 달' }).click();
  await expect(page.getByText(/월 \d+권 완독/)).toBeVisible();

  await expect(page.getByText('나만 보는 비공개 책')).toHaveCount(0);
});
```

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test:e2e -- e2e/public-library.spec.ts`
Expected: 2 passed (또는 공개 서재가 없으면 skipped — 그 경우 로컬 DB 시드를 확인)

- [ ] **Step 6: 전체 검증**

Run: `npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run type-check && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run lint && npm --prefix /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 run test`
Expected: 에러 0, PASS. (`lint` 는 검사만 — `--fix` 는 바꾼 파일에만)

- [ ] **Step 7: 화면 직접 확인** (로컬 dev, 메모리 `env-local-session-for-verification`)

1. dev 서버를 띄운다(포트 비었는지 먼저 확인). 방문자: 비로그인으로 `/<username>`. 주인: magiclink 세션 쿠키.
2. 데스크톱 1280px · 모바일 375px 에서 각각 캡처:
   - 첫 화면에 헤더(취향 카드) · 탭(올해 선택) · 올해 요약(권수가 가장 큰 숫자)
   - 책장: 왼쪽부터, 꺼내기 말풍선, 읽는 중 책갈피, 명판
   - 균형 카드: 레이더 + 띠 + 점수 + 0권 칩, "기울" 문구 없음
   - 달력: 이번 달 → 이전 달 3번 넘겨 표지가 계속 뜨는지, 주인은 비공개가 반투명
   - 방문자: 비공개 펼치기 없음, 취향 카드는 링크 없음
3. 375px 에서 가로 스크롤이 없는지 `document.documentElement.scrollWidth <= innerWidth`.

- [ ] **Step 8: 스테이징 후 커밋 여부 확인**

```bash
git -C /Users/dreamfulbud/Desktop/stronger/0127 add apps/page0127/src apps/page0127/e2e
```

제안 메시지: `♻️ Refactor: 연도 서재 배치를 마무리하고 쓰이지 않는 월 필터·차트를 걷어낸다`

이후 PR 은 사용자 요청 시. **PR 머지 전 운영 DB 마이그레이션 적용을 말로 확인**(Task 7).
