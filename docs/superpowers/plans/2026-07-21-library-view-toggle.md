# 서재 정렬 수정 + 책장형/피드형 토글 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내 서재/공개 서재의 "최신순" 정렬을 완독일(completed_date) 기준으로 고치고, 책장형(기존)과 피드형(신규, 표지 카드 + BOOK #번호) 뷰를 토글할 수 있게 만든다.

**Architecture:** `DashboardBookList.tsx`(내 서재·공개 서재 공용 필터/정렬/툴바 컴포넌트)에 `viewMode` 상태와 완독 순번 계산을 추가하고, 신규 컴포넌트 `BookFeedGrid.tsx`를 피드형일 때 렌더링한다. 책장형은 기존 `PublicBookShelf` 렌더링 경로를 그대로 쓴다.

**Tech Stack:** Next.js 16 (App Router), React (Compiler 활성화 — 수동 `useMemo` 불필요), Tailwind, lucide-react 아이콘, shadcn 스타일 `Button`.

## Global Constraints

- 이 프로젝트엔 자동화 테스트가 없다 (`package.json`에 test 스크립트/프레임워크 없음). 각 태스크의 검증은 `type-check` + `lint` + 로컬 서버 수동 확인으로 한다.
- 패키지 매니저는 npm (`packageManager: npm@10.7.0`). 모든 명령은 `apps/page0127` 안에서 실행한다.
- 새로운 학습 포인트(React Compiler 자동 메모이제이션, Map을 이용한 순번 계산 등)에는 한국어 주석을 남긴다 — 기존 파일들의 주석 스타일(`/** 학습 포인트: ... */`)을 따른다.
- 이 파일이 수정 대상인 `DashboardBookList.tsx`는 이미 React Compiler(`reactCompiler: true`)를 전제로 손으로 쓴 `useMemo`를 쓰지 않는 컨벤션이다 — 새로 추가하는 `rankMap` 계산도 같은 방식(순수 계산, 수동 메모이제이션 없음)을 따른다.
- 참고 설계 문서: `docs/superpowers/specs/2026-07-21-library-view-toggle-design.md`

---

### Task 1: 정렬 기준을 완독일(completed_date) 기준으로 수정

**Files:**
- Modify: `apps/page0127/src/features/stats/ui/DashboardBookList.tsx:204-227` (정렬 comparator)

**Interfaces:**
- Consumes: 없음 (기존 `Book` 타입의 `completed_date: string | null`, `created_at: string` 필드만 사용)
- Produces: 없음 (동작만 바뀜, 시그니처 변경 없음)

- [ ] **Step 1: 정렬 comparator에서 비교 필드를 completed_date로 변경**

`apps/page0127/src/features/stats/ui/DashboardBookList.tsx`의 `.sort()` 안, `field === 'created_at'` 분기를 찾아 다음과 같이 바꾼다:

```tsx
      if (field === 'created_at') {
        // '최신순'/'오래된순'은 등록 시각이 아니라 완독일 기준이어야 한다.
        // completed_date가 없는 예외 케이스만 created_at으로 대체한다.
        const dateA = new Date(a.completed_date ?? a.created_at).getTime();
        const dateB = new Date(b.completed_date ?? b.created_at).getTime();
        return order === 'desc' ? dateB - dateA : dateA - dateB;
      }
```

`sortOption` 값(`created_at-desc`/`created_at-asc`)과 `<SelectItem>` 라벨은 그대로 둔다 — localStorage에 저장된 기존 값과 계속 호환되도록, 필드가 실제로 비교하는 날짜만 바꾼다.

- [ ] **Step 2: 타입 체크 실행**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음 (0 errors)

- [ ] **Step 3: lint 실행**

Run: `cd apps/page0127 && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 로컬 서버로 수동 확인**

Run: `cd apps/page0127 && npm run dev` (이미 떠 있다면 생략)

브라우저에서 `/dashboard` 접속 → 정렬을 "최신순"으로 두고, 최근에 완독한(별점을 매긴 날짜가 아니라 실제 완독일이 최신인) 책이 목록 맨 앞에 오는지 확인한다. "오래된순"으로 바꿔 반대로 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/src/features/stats/ui/DashboardBookList.tsx
git commit -m "fix: 서재 최신순/오래된순 정렬을 완독일 기준으로 수정"
```

---

### Task 2: BookFeedGrid 컴포넌트 생성 (피드형 렌더러)

**Files:**
- Create: `apps/page0127/src/widgets/book/ui/BookFeedGrid.tsx`

**Interfaces:**
- Consumes: `Book` 타입 (`@/entities/book`) — `id`, `title`, `author`, `cover_image` 필드 사용
- Produces:
  ```ts
  type BookFeedGridProps = {
    books: Book[];
    rankMap: Map<string, number>;
    bookHref: (book: Book) => string;
  };
  export const BookFeedGrid: (props: BookFeedGridProps) => JSX.Element;
  ```
  Task 3에서 `DashboardBookList.tsx`가 이 컴포넌트를 import해서 쓴다.

- [ ] **Step 1: BookFeedGrid.tsx 작성**

`apps/page0127/src/widgets/book/ui/BookFeedGrid.tsx` 새로 생성:

```tsx
import Image from 'next/image';
import Link from 'next/link';

import type { Book } from '@/entities/book';

type BookFeedGridProps = {
  /** 표시할 책 — 검색/필터가 적용된 목록 */
  books: Book[];
  /** 완독 순서 기준 번호 (book.id → 1부터 시작하는 순번). DashboardBookList가
   *  필터와 무관한 원본 목록 기준으로 미리 계산해 넘긴다 */
  rankMap: Map<string, number>;
  /** 책 클릭 시 이동할 URL 생성 함수 */
  bookHref: (book: Book) => string;
};

/**
 * 피드형 렌더러 — 표지 카드 그리드 + "BOOK #번호" 뱃지
 *
 * 학습 포인트:
 * - 번호는 이 컴포넌트가 계산하지 않는다. rankMap을 조회만 한다.
 *   그래야 검색/카테고리 필터를 걸어도 같은 책은 항상 같은 번호를 유지한다.
 * - 표지 없는 책의 fallback(제목 조판)은 BookGridItem과 동일한 패턴 —
 *   책장형/그리드형/피드형이 같은 "표지 없을 때" 규칙을 공유한다.
 */
export const BookFeedGrid = ({
  books,
  rankMap,
  bookHref,
}: BookFeedGridProps) => {
  if (books.length === 0) {
    return (
      <div className='rounded-2xl bg-sunken p-12 text-center'>
        <p className='text-text-body'>조건에 맞는 책이 없어요.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'>
      {books.map((book) => {
        const rank = rankMap.get(book.id);

        return (
          <Link
            key={book.id}
            href={bookHref(book)}
            className='group transition-transform hover:scale-105'
          >
            <div className='aspect-2/3 relative overflow-hidden rounded-lg bg-muted'>
              {book.cover_image ? (
                <Image
                  src={book.cover_image}
                  alt={book.title}
                  fill
                  sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw'
                  className='object-cover'
                />
              ) : (
                <div className='flex h-full w-full flex-col justify-between bg-sunken px-2 py-2.5 text-left'>
                  <p className='line-clamp-4 break-keep text-[11px] font-bold leading-snug text-text-strong'>
                    {book.title}
                  </p>
                  {book.author && (
                    <p className='line-clamp-1 text-[10px] text-text-faint'>
                      {book.author}
                    </p>
                  )}
                </div>
              )}
              {rank !== undefined && (
                <div className='absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white'>
                  BOOK #{String(rank).padStart(3, '0')}
                </div>
              )}
            </div>
            <p className='mt-2 line-clamp-2 text-xs text-foreground group-hover:text-primary'>
              {book.title}
            </p>
          </Link>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: 타입 체크 실행**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음 (아직 아무 곳에서도 import하지 않으므로 미사용 export 경고만 없으면 됨)

- [ ] **Step 3: lint 실행**

Run: `cd apps/page0127 && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/src/widgets/book/ui/BookFeedGrid.tsx
git commit -m "feat: 피드형 렌더러 BookFeedGrid 컴포넌트 추가"
```

---

### Task 3: 책장형/피드형 토글 연결 (상태 + UI + 번호 계산 + 렌더링 분기)

**Files:**
- Modify: `apps/page0127/src/features/stats/ui/DashboardBookList.tsx`
- Modify: `apps/page0127/src/widgets/library/LibraryView.tsx`

**Interfaces:**
- Consumes: Task 2에서 만든 `BookFeedGrid` (`{ books, rankMap, bookHref }` props), 기존 `useLocalStorage<T>(key, initialValue)` 훅
- Produces: 없음 (최종 사용자 화면 기능)

- [ ] **Step 1: BookFeedGrid, 아이콘 import 추가**

`apps/page0127/src/features/stats/ui/DashboardBookList.tsx` 상단 import를 수정한다.

기존:
```tsx
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
```

변경:
```tsx
import { LayoutGrid, Library, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
```

그리고 다른 로컬 컴포넌트 import들(`BookGridItem` 등) 근처에 추가:

```tsx
import { BookFeedGrid } from '@/widgets/book/ui/BookFeedGrid';
```

- [ ] **Step 2: viewMode 상태 추가**

정렬 상태(`sortOption`)를 선언한 바로 아래에 추가한다:

```tsx
  // 책장형(선반)/피드형(번호 붙은 카드 그리드) 토글 — 내 서재·공개 서재 공용 컴포넌트라
  // 여기서 저장하면 두 화면 모두 같은 값을 공유한다
  const [viewMode, setViewMode] = useLocalStorage<'shelf' | 'feed'>(
    'library-view-mode',
    'shelf'
  );
```

- [ ] **Step 3: 완독 순번(rankMap) 계산 추가**

`filteredBooks` 계산 바로 위(또는 아래, `sortOption` 선언 이후 아무 곳)에 추가한다. **주의: `books`(원본 prop) 기준으로 계산해야 한다. `filteredBooks`를 쓰면 검색/필터에 따라 번호가 바뀐다.**

```tsx
  // 피드형 "BOOK #번호"는 검색/카테고리 필터와 무관하게 고정되어야 한다 →
  // 필터 적용 전 원본 books를 완독일 오름차순으로 정렬해 번호를 매긴다.
  // (React Compiler가 자동 메모이제이션하므로 수동 useMemo는 쓰지 않는다)
  const rankMap = new Map<string, number>();
  [...books]
    .sort((a, b) => {
      const dateA = new Date(a.completed_date ?? a.created_at).getTime();
      const dateB = new Date(b.completed_date ?? b.created_at).getTime();
      return dateA - dateB;
    })
    .forEach((book, index) => rankMap.set(book.id, index + 1));
```

- [ ] **Step 4: 툴바에 책장형/피드형 토글 버튼 추가**

정렬 `<Select>` 바로 앞(필터 팝오버와 정렬 드롭다운 사이)에 추가한다:

```tsx
        <div className='flex items-center gap-0.5 rounded-md border border-line-soft p-0.5'>
          <Button
            variant={viewMode === 'shelf' ? 'secondary' : 'ghost'}
            size='sm'
            className='h-7 px-2'
            aria-pressed={viewMode === 'shelf'}
            onClick={() => setViewMode('shelf')}
          >
            <Library className='h-4 w-4' />
          </Button>
          <Button
            variant={viewMode === 'feed' ? 'secondary' : 'ghost'}
            size='sm'
            className='h-7 px-2'
            aria-pressed={viewMode === 'feed'}
            onClick={() => setViewMode('feed')}
          >
            <LayoutGrid className='h-4 w-4' />
          </Button>
        </div>

```

- [ ] **Step 5: 렌더링 분기에 피드형 추가**

기존 렌더링 분기:

```tsx
            {renderBooks ? (
              // 커스텀 렌더러: 선반 레이아웃 등 외부에서 주입
              renderBooks(filteredBooks)
            ) : (
              <div className='grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
                {paginatedBooks.map((book) => (
                  // key는 사용처에서 부여 (memo로 감싼 컴포넌트도 동일)
                  <BookGridItem
                    key={book.id}
                    book={book}
                    href={bookHref(book)}
                  />
                ))}
              </div>
            )}
```

다음으로 교체:

```tsx
            {viewMode === 'feed' ? (
              <BookFeedGrid
                books={filteredBooks}
                rankMap={rankMap}
                bookHref={bookHref}
              />
            ) : renderBooks ? (
              // 커스텀 렌더러: 선반 레이아웃 등 외부에서 주입
              renderBooks(filteredBooks)
            ) : (
              <div className='grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
                {paginatedBooks.map((book) => (
                  // key는 사용처에서 부여 (memo로 감싼 컴포넌트도 동일)
                  <BookGridItem
                    key={book.id}
                    book={book}
                    href={bookHref(book)}
                  />
                ))}
              </div>
            )}
```

그리고 바로 아래 페이지네이션 노출 조건도 피드형에서는 숨기도록 고친다.

기존:
```tsx
            {!renderBooks && totalPages > 1 && (
```

변경:
```tsx
            {viewMode === 'shelf' && !renderBooks && totalPages > 1 && (
```

- [ ] **Step 6: LibraryView가 DashboardBookList에 bookHref를 명시적으로 전달하도록 수정**

`apps/page0127/src/widgets/library/LibraryView.tsx`에서 `<DashboardBookList>` 호출부를 찾는다 (`renderBooks={...}` 바로 위).

기존:
```tsx
      <DashboardBookList
        title={shelfTitle}
        books={books}
        categories={stats.categoryReading}
        selectedMonth={selectedMonth}
        selectedCategories={selectedCategories}
        selectedRating={selectedRating}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onCategoriesChange={filters.setCategories}
        onRemoveMonthFilter={filters.clearMonth}
        onRemoveRatingFilter={filters.clearRating}
        onSearchChange={filters.setSearch}
        onStatusChange={filters.setStatus}
        onResetAll={filters.resetAll}
        renderBooks={(filteredBooks) => (
          <PublicBookShelf books={filteredBooks} username={username} compact />
        )}
      />
```

변경 (`renderBooks` 앞에 `bookHref` 추가):
```tsx
      <DashboardBookList
        title={shelfTitle}
        books={books}
        categories={stats.categoryReading}
        selectedMonth={selectedMonth}
        selectedCategories={selectedCategories}
        selectedRating={selectedRating}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onCategoriesChange={filters.setCategories}
        onRemoveMonthFilter={filters.clearMonth}
        onRemoveRatingFilter={filters.clearRating}
        onSearchChange={filters.setSearch}
        onStatusChange={filters.setStatus}
        onResetAll={filters.resetAll}
        // 책장형은 PublicBookShelf가 username으로 직접 링크를 계산하지만,
        // 피드형(BookFeedGrid)은 DashboardBookList 내부에서 렌더링되므로
        // bookHref를 통해 공개 서재/내 서재 링크를 구분해 넘겨야 한다
        bookHref={(book) =>
          username ? `/${username}/${book.id}` : `/books/${book.id}`
        }
        renderBooks={(filteredBooks) => (
          <PublicBookShelf books={filteredBooks} username={username} compact />
        )}
      />
```

- [ ] **Step 7: 타입 체크 실행**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음

- [ ] **Step 8: lint 실행**

Run: `cd apps/page0127 && npm run lint`
Expected: 에러 없음

- [ ] **Step 9: 로컬 서버로 수동 확인**

Run: `cd apps/page0127 && npm run dev` (이미 떠 있다면 생략)

`/dashboard`에서:
1. 툴바에 책장형/피드형 토글 버튼 2개가 보이는지 확인
2. 피드형 클릭 → 표지 카드 그리드로 바뀌고, 각 카드 좌상단에 `BOOK #001` 형태 뱃지가 붙는지 확인
3. 가장 먼저 완독한 책이 `#001`인지 확인
4. 검색어를 입력해 목록을 좁혀도 같은 책의 번호가 그대로인지 확인
5. 연도 탭을 특정 연도로 바꿔 그 해 기준으로 `#001`부터 다시 매겨지는지 확인
6. 새로고침해도 마지막으로 선택한 뷰(책장형/피드형)가 유지되는지 확인 (localStorage)
7. 책장형으로 돌아가 기존 선반 렌더링이 그대로인지 확인
8. 공개 서재(`/[username]`, 본인 프로필 링크)에서도 1~7이 동일하게 동작하고, 피드형 카드 클릭 시 `/[username]/[bookId]`로 이동하는지 확인

- [ ] **Step 10: 커밋**

```bash
git add apps/page0127/src/features/stats/ui/DashboardBookList.tsx apps/page0127/src/widgets/library/LibraryView.tsx
git commit -m "feat: 서재에 책장형/피드형 뷰 토글 추가"
```

---

## 완료 후 확인

- Task 1~3을 모두 마치면 `docs/superpowers/specs/2026-07-21-library-view-toggle-design.md`의 "테스트 계획" 7개 항목을 다시 한번 순서대로 훑어 전부 통과하는지 확인한다.
