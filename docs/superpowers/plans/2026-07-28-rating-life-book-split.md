# 트랙 F — 평점에서 인생책 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `books.rating`에 매직값으로 끼어 있던 `10`("인생책")을 `rating = 5` + `is_life_book = true` 로 분리해, 평점 컬럼이 균일한 척도만 담게 한다.

**Architecture:** 마이그레이션이 컬럼을 추가하고 백필한 뒤 CHECK를 좁힌다. 앱 쪽은 트랙 A가 `entities/book/model/rating.ts` 한 곳에 모아 둔 판정·변환을 걷어내고, 호출처가 플래그를 직접 읽게 바꾼다. 평점 하나로 항목을 구분하던 **분포 집계와 필터 체인**은 `(rating, is_life_book)` 조합을 키로 쓰도록 고친다.

**Tech Stack:** Next.js 16 App Router · Supabase(Postgres) · vitest(node 환경) · Tailwind

## Global Constraints

- **스펙:** `docs/superpowers/specs/2026-07-28-visit-log-and-rating-split-design.md` (F 절)
- **브랜치 베이스:** `track-d1-visits-rating` (D-1, PR #21). main 이 아니다 — 스펙 문서와 마이그레이션 번호 `...0002`·`...0003` 이 그 브랜치에 있다
- TypeScript strict. `any` 금지 — `unknown` + 타입 가드
- **`type` 우선, `interface` 금지** (ESLint `consistent-type-definitions`)
- `console.log` 금지 — `console.warn` / `console.error`만 허용
- **DB 컬럼과 앱 타입은 snake_case 로 이름이 같다** (`is_public`, `one_line_review`, `read_count`). 새 필드는 **`is_life_book`** 이다. camelCase (`isLifeBook`) 가 아니다
- 주석은 한국어. "무엇을"이 아니라 "왜"
- import 정렬: 그룹 사이 빈 줄 (`eslint-plugin-simple-import-sort`)
- **평가 UI 를 바꾸지 않는다.** 선택지는 지금처럼 `0~5점 · 인생책` 배타 선택이다. 트랙 F 는 스키마 부채 상환이지 UX 변경이 아니다
- 커밋 메시지는 conventional commits (`feat(rating):`, `fix(rating):`). **`Co-Authored-By` 트레일러 금지**
- ESLint autofix 는 바꾼 파일에만 (`npx eslint <경로> --fix`). 전체 `eslint . --fix` 금지
- `psql` 은 이 머신에 없다. DB 확인은 `docker exec supabase_db_0127 psql -U postgres -d postgres -c "..."`
- 테스트: `cd apps/page0127 && npx vitest run <경로>` (개별) / `npm test` (전체, 루트에서)

## 중간 상태에 대한 경고

**Task 1(마이그레이션)을 적용한 순간부터 Task 2가 끝나기 전까지, 화면에서 인생책 배지가 사라진 것처럼 보인다.** 백필로 `rating = 10` 인 행이 사라지는데 코드는 아직 `rating === 10` 으로 판정하기 때문이다. 로컬 개발 중의 정상적인 중간 상태이며, 배포는 이 브랜치 전체가 한 번에 나간다. Task 2 완료 후 복구된다.

---

### Task 1: 마이그레이션 — 컬럼·백필·제약·DB 함수

**Files:**
- Create: `supabase/migrations/20260728000004_split_life_book_from_rating.sql`

**Interfaces:**
- Produces: `books.is_life_book boolean not null default false`. 뒤의 모든 태스크가 이 컬럼을 읽는다. DB 함수 `get_books_of_life`·랭킹 스냅샷 함수가 `rating = 10` 대신 이 플래그를 본다.

**번호 주의:** `...0002`(user_daily_visits)와 `...0003`(drop_activity_notifications)이 D-1 에서 쓰였다. 이 파일은 `...0004` 다.

- [ ] **Step 1: 현재 상태를 기록한다 (백필 검증의 기준값)**

Run:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c \
  "select count(*) as life_books from public.books where rating = 10;"
docker exec supabase_db_0127 psql -U postgres -d postgres -c \
  "select conname from pg_constraint where conrelid = 'public.books'::regclass and contype = 'c';"
```

첫 번째 숫자를 적어 둔다 — Step 4에서 대조한다.
두 번째는 **CHECK 제약의 실제 이름**이다. 아래 SQL 의 `books_rating_check` 와 다르면 **실제 이름으로 바꿔 쓴다.** 이름을 잘못 넣으면 `drop constraint if exists` 가 조용히 통과해 옛 제약이 남는다.

- [ ] **Step 2: 마이그레이션 파일을 만든다**

`supabase/migrations/20260728000004_split_life_book_from_rating.sql`:

```sql
-- 평점에서 "인생책"을 분리한다.
--
-- 문제: books.rating 이 0,1,2,3,4,5,10 을 갖는데 이 값들은 균일한 척도가 아니었다.
--   0  = "평가 안 함" (점수가 아님)
--   10 = "인생책"     (11번째 점수가 아니라 최고점의 별칭)
-- 숫자 칸에 숫자가 아닌 뜻을 끼워 넣은 상태라, 평균을 그대로 내면 인생책 하나가
-- 10점으로 계산되어 왜곡됐다.
--
-- 트랙 A 가 이 왜곡을 앱 코드(entities/book/model/rating.ts)에서 막았고, 그 파일 주석이
-- "나중에 컬럼을 분리할 때 고칠 자리가 한 곳이 되게 한다"고 적었다. 여기가 그 나중이다.
--
-- 왜 지금인가: 데이터가 적을수록 데이터 변형 마이그레이션이 싸고 안전하다.
-- 실사용자 0명인 지금이 가장 싼 시점이다.
--
-- ⚠️ 순서가 중요하다. CHECK 가 10 을 허용하는 동안 백필해야 한다.
--    제약을 먼저 좁히면 백필이 자기 제약에 막힌다.

-- 1) 컬럼 추가 — 기존 행은 전부 false 로 시작한다
alter table public.books
  add column if not exists is_life_book boolean not null default false;

comment on column public.books.is_life_book is
  '인생책 여부. 전에는 rating=10 이라는 매직값이었다(20260728000004에서 분리).';

-- 2) 백필 — 이 시점엔 CHECK 가 아직 10 을 허용한다
do $$
declare
  moved integer;
begin
  update public.books
     set rating = 5, is_life_book = true
   where rating = 10;

  get diagnostics moved = row_count;
  raise notice '인생책 분리: % 건', moved;
end $$;

-- 3) 이제 제약을 좁힌다
--    (이름이 다르면 pg_constraint 로 확인한 실제 이름을 쓴다)
alter table public.books drop constraint if exists books_rating_check;
alter table public.books
  add constraint books_rating_check check (rating in (0, 1, 2, 3, 4, 5));

-- 4) 랭킹 함수가 where 절로 쓰므로 부분 인덱스.
--    전체 인덱스가 아니라 부분 인덱스인 이유: 인생책은 소수라 true 행만 담으면 훨씬 작다.
create index if not exists books_is_life_book_idx
  on public.books (is_life_book) where is_life_book;

-- ── DB 함수: rating = 10 → is_life_book ──
-- 최신 정의가 20260726000000_ranking_functions_public_only.sql 에 있다. 그 파일의
-- 함수 셋을 여기서 재정의한다(옛 파일들은 이미 덮어써진 상태라 건드리지 않는다).
-- is_public = true 조건은 그대로 유지한다 — 트랙 A 가 넣은 공개 범위 조건을 떨어뜨리면
-- 비공개 책이 랭킹에 샌다.
```

**여기서 DB 함수 3개를 재정의한다.** 원본은 `supabase/migrations/20260726000000_ranking_functions_public_only.sql` 의 다음 지점이다:

- `get_books_of_life` — `WHERE b.rating = 10` (같은 파일 45행 부근)
- 랭킹 스냅샷 생성 함수 — `WHERE b.rating = 10` (112행 부근)
- 랭킹 조회 함수의 `rank_type_param = 'best'` 분기 — `AND b.rating = 10` (212행 부근)

**그 파일을 열어 세 함수의 전체 정의를 그대로 복사한 뒤, `rating = 10` 조건만 `is_life_book` 으로 바꿔 `create or replace function` 으로 넣는다.** 시그니처·반환 타입·나머지 조건(`is_public`, `group by`, `order by`, `limit`)을 한 글자도 바꾸지 않는다.

- [ ] **Step 3: 로컬에 적용한다**

Run: `supabase db reset`
Expected: 에러 없이 `Finished supabase db reset`. 중간에 `NOTICE: 인생책 분리: N 건` 이 보인다

- [ ] **Step 4: 백필과 제약을 검증한다**

Run:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c \
  "select count(*) filter (where is_life_book) as life_books,
          count(*) filter (where rating = 10) as leftover_tens
     from public.books;"
```
Expected: `life_books` 가 Step 1에서 적어 둔 숫자와 **같고**, `leftover_tens` 는 `0`

Run:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c \
  "insert into public.books (user_id, isbn, title, status, rating)
   select user_id, 'CHECK-TEST', 't', 'completed', 10 from public.books limit 1;"
```
Expected: **실패해야 한다** — `new row for relation "books" violates check constraint`. 성공하면 제약이 안 걸린 것이므로 Step 1의 제약 이름을 다시 확인한다

- [ ] **Step 5: DB 함수가 인생책을 여전히 찾는지 확인한다**

Run:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c \
  "select count(*) from public.get_books_of_life(10);"
```
Expected: 에러 없이 실행된다. 로컬에 공개 인생책이 없으면 0이어도 정상이다 — **함수가 새 컬럼으로 컴파일되는지**가 이 단계의 목적이다

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/20260728000004_split_life_book_from_rating.sql
git commit -m "feat(rating): 평점에서 인생책을 is_life_book 컬럼으로 분리"
```

---

### Task 2: 도메인 모델·타입과 읽기 경로 일괄 치환

**Files:**
- Modify: `apps/page0127/src/entities/book/model/rating.ts`
- Modify: `apps/page0127/src/entities/book/model/rating.test.ts`
- Modify: `apps/page0127/src/entities/book/types.ts`
- Modify: `apps/page0127/src/entities/book/index.ts` (export 목록)
- Modify: 아래 읽기 경로 파일들

**Interfaces:**
- Consumes: `books.is_life_book` (Task 1)
- Produces: `Book.is_life_book: boolean`, `BookRating = 0|1|2|3|4|5`, `isTopRated(rating, isLifeBook)`. Task 3·4·5가 이 시그니처를 쓴다.

**이 태스크가 큰 이유:** `isLifeBook`·`toScore` 를 지우는 순간 15개 파일이 **동시에** 깨진다. 쪼개면 중간 상태가 컴파일되지 않는다. 대신 치환 자체는 기계적이므로, 리뷰는 **"select 목록에 `is_life_book` 이 빠진 곳이 없는가"** 한 가지에 집중하면 된다.

- [ ] **Step 1: 도메인 모델을 고친다**

`apps/page0127/src/entities/book/model/rating.ts`:

- **`toScore` 삭제.** 10이 사라지면 항등함수가 된다
- **`isLifeBook` 삭제.** 판정이 `flag === true` 가 되면 술어 함수가 값을 더하지 않는다. 게다가 남겨 두면 select 에서 컬럼을 빠뜨렸을 때 `isLifeBook(undefined)` 가 조용히 `false` 를 돌려준다 — **없는 값을 "아니오"로 둔갑시키는 폴백**이고, 인생책 배지가 이유 없이 사라지는 버그가 된다
- **`isTopRated` 를 2인자로:**

```ts
/** 최고 평가 판정 — 5점과 인생책. 책장에서 표지를 크게 보여줄 기준이다 */
export const isTopRated = (
  rating: number | null,
  isLifeBook: boolean
): boolean => isLifeBook || rating === RATING_MAX;
```

- `averageScore` / `summarizeRatings` 는 `.map(toScore)` 만 제거한다. 동작은 같다
- `isRated` 는 그대로
- 파일 상단 JSDoc 을 갱신한다 — "DB의 rating 컬럼은 0,1,2,3,4,5,10 을 갖는데" 는 더 이상 사실이 아니다. 분리가 **끝났다**는 것과 `is_life_book` 이 별도 컬럼이라는 것을 적는다

- [ ] **Step 2: 타입을 고친다**

`apps/page0127/src/entities/book/types.ts`:

```ts
export type BookRating = 0 | 1 | 2 | 3 | 4 | 5;   // 10 제거
```

`Book` 타입의 `rating: BookRating | null` 바로 아래에 추가 (snake_case 관례):

```ts
  // 평가
  rating: BookRating | null;
  /** 인생책 여부. 전에는 rating=10 이라는 매직값이었다 */
  is_life_book: boolean;
```

`BookInput` 에도 선택 필드로 추가: `is_life_book?: boolean;`

- [ ] **Step 3: export 목록에서 지운 함수를 뺀다**

`apps/page0127/src/entities/book/index.ts` 의 `isLifeBook`, `toScore` 를 제거한다.

- [ ] **Step 4: 읽기 경로 15곳을 치환한다**

`isLifeBook(X.rating)` → `X.is_life_book` 으로 바꾼다. 대상:

| 파일 | 비고 |
| --- | --- |
| `src/features/book/ui/BookCardInfo.tsx` | `book.rating` → `book.is_life_book` |
| `src/features/book/ui/DuplicateBookDialog.tsx` | `existingBook` |
| `src/features/book/ui/BookSavedCard.tsx` | prop 으로 `rating` 만 받는다 — **prop 에 `isLifeBook: boolean` 을 추가**하고 호출처에서 넘긴다 |
| `src/widgets/activity/ui/ActivityCard.tsx` | `activity.book` |
| `src/widgets/dashboard/ReadingCalendar.tsx` | `book` |
| `src/widgets/book/ui/BookStreamEvent.tsx` | prop — `BookSavedCard` 와 같은 처리 |
| `src/widgets/book/ui/BookDetailContent.tsx` | `book` |
| `src/widgets/book/ui/LifeBooksShelf.tsx` | `books.filter((b) => b.is_life_book)` |
| `src/widgets/book/ui/MyBookMemo.tsx` | `myBook` |
| `src/entities/book/model/libraryPeriod.ts` | `lifeBookCount` 집계 |
| `src/entities/book/api/getOverallStats.ts` | `lifeBookCount` 집계 |

`isTopRated` 1곳: `src/widgets/book/ui/PublicBookShelf.tsx` → `isTopRated(book.rating, book.is_life_book)`

`toScore` 2곳 — `isRated` 로 0을 거른 뒤 `book.rating` 을 그대로 쓴다:
- `app/api/compatibility/analyze/route.ts:162` → `score: isRated(book.rating) ? book.rating : null`
- `app/api/taste-analysis/analyze/route.ts:102` → 같은 형태

**분포 라벨 2곳**(`src/features/stats/ui/RatingDoughnutChart.tsx`, `src/features/stats/ui/OverallDistribution.tsx`)의 `ratingLabel` 도 여기서 컴파일은 되게 고친다. **다만 그룹핑 자체는 Task 3에서 고친다** — 여기서는 `isLifeBook(rating)` 호출만 제거하고 라벨 함수가 플래그를 인자로 받도록 시그니처를 준비한다.

- [ ] **Step 5: 조회 select 에 `is_life_book` 을 추가한다**

**이 단계가 이 태스크에서 가장 놓치기 쉬운 곳이다.** Supabase 클라이언트에 `Database` 제네릭이 없어 **select 에 컬럼을 빠뜨려도 `tsc` 가 통과한다.** 증상은 인생책 배지가 조용히 사라지는 것이다.

Run:
```bash
cd apps/page0127 && grep -rn "is_life_book" src app --include="*.ts" --include="*.tsx" | grep -v "\.test\." | wc -l
cd apps/page0127 && grep -rn "select(" src/entities/book/api src/widgets src/features app/api --include="*.ts" --include="*.tsx" | grep -i "rating" 
```

두 번째 명령이 뽑아 준 **`rating` 을 select 하는 모든 곳에 `is_life_book` 을 함께 넣는다.** `select('*')` 인 곳은 자동으로 따라오므로 그대로 둔다.

- [ ] **Step 6: 테스트를 고친다**

`apps/page0127/src/entities/book/model/rating.test.ts`:

- `toScore` 케이스 삭제
- `isLifeBook` 케이스 삭제
- `isRated` 의 `expect(isRated(10)).toBe(true)` 삭제 (10은 더 이상 유효한 값이 아니다)
- `isTopRated` 를 2인자로:

```ts
  it('최고 평가는 5점과 인생책 둘 다다', () => {
    expect(isTopRated(5, false)).toBe(true);
    expect(isTopRated(5, true)).toBe(true);
    // 인생책이면 점수와 무관하게 최고 평가다
    expect(isTopRated(3, true)).toBe(true);
    expect(isTopRated(4, false)).toBe(false);
    expect(isTopRated(0, false)).toBe(false);
    expect(isTopRated(null, false)).toBe(false);
  });
```

- `averageScore` 의 10 이 섞인 케이스를 5로 바꾼다. 예: `averageScore([10, 4])` → `averageScore([5, 4])` 는 여전히 `4.5`
- `summarizeRatings([10, 4, 4, 0, null])` → `summarizeRatings([5, 4, 4, 0, null])`, 기대값 `{ average: 4.3, ratedCount: 3 }` 동일

- [ ] **Step 7: 검증**

Run:
```bash
cd apps/page0127 && npx vitest run src/entities/book/model/rating.test.ts
cd apps/page0127 && npx tsc --noEmit
```
Expected: 테스트 통과, 타입 에러 0

Run: `cd apps/page0127 && grep -rn "rating === 10\|rating == 10\|=== 10\b" src app --include="*.ts" --include="*.tsx"`
Expected: **출력 없음** — 남은 매직값이 있으면 여기서 걸린다

- [ ] **Step 8: 커밋**

```bash
git add -A apps/page0127/src apps/page0127/app
git commit -m "refactor(rating): isLifeBook·toScore 제거하고 is_life_book 플래그로 전환"
```

---

### Task 3: 분포 그룹핑 — 5점과 인생책이 갈리게

**Files:**
- Modify: `apps/page0127/src/entities/book/model/libraryPeriod.ts` (`VALID_RATINGS`, `RATING_COLORS`, `calculateRatingReading`)
- Modify: `apps/page0127/src/entities/book/api/getOverallStats.ts` (`calculateRatingDistribution`)
- Modify: `apps/page0127/src/entities/book/types/stats.ts` (`RatingReadingData`, `RatingDistribution`)
- Modify: `apps/page0127/src/features/stats/ui/RatingDoughnutChart.tsx`
- Modify: `apps/page0127/src/features/stats/ui/OverallDistribution.tsx`
- Test: `apps/page0127/src/entities/book/model/libraryPeriod.test.ts` (기존 파일에 추가)

**Interfaces:**
- Consumes: `Book.is_life_book` (Task 2)
- Produces: `RatingReadingData`/`RatingDistribution` 에 `is_life_book: boolean` 필드. Task 4의 필터 체인이 이 항목을 클릭 대상으로 쓴다.

**왜 별도 태스크인가 — 이것만 기계적 치환이 아니다.**

분포는 지금 **rating 값으로 그룹핑**해 "1점 n권 … 5점 n권, 인생책 n권"을 그린다. 인생책이 `rating = 10` 이라 자연히 별도 항목으로 갈렸다. **백필 후에는 인생책도 `rating = 5` 라 5점 항목에 합쳐진다** — 치환만 하면 차트에서 인생책 항목이 사라지고 5점 막대가 갑자기 커진다. 에러도 안 나고 숫자 합계도 맞아서 **눈치채기 어렵다.**

- [ ] **Step 1: 실패하는 테스트를 먼저 쓴다**

`apps/page0127/src/entities/book/model/libraryPeriod.test.ts` 에 추가한다. `calculateBookStats` 를 통해 `ratingReading` 을 확인한다(내부 함수가 export 되어 있지 않다면 `calculateBookStats` 로 감싸서 검증한다 — 기존 테스트가 쓰는 방식을 따른다).

```ts
  it('5점과 인생책을 다른 항목으로 센다', () => {
    // 백필 후 인생책도 rating=5 다. 평점만으로 그룹핑하면 두 항목이 합쳐진다.
    const books = [
      createBook({
        rating: 5,
        is_life_book: false,
        status: 'completed',
        completed_date: '2026-03-01',
      }),
      createBook({
        rating: 5,
        is_life_book: true,
        status: 'completed',
        completed_date: '2026-03-02',
      }),
    ];

    const { ratingReading } = calculateBookStats(books, null, 2026);

    const plainFive = ratingReading.find(
      (r) => r.rating === 5 && !r.is_life_book
    );
    const lifeBook = ratingReading.find((r) => r.is_life_book);

    expect(plainFive?.count).toBe(1);
    expect(lifeBook?.count).toBe(1);
  });
```

> `createBook` 은 이 파일 13행에 이미 있는 헬퍼다(`(overrides: Partial<Book>) => Book`). Task 2에서 `Book` 에 `is_life_book` 을 추가했으므로 그 기본값(`false`)도 헬퍼의 기본 객체에 넣어야 한다 — 안 넣으면 `Book` 타입을 만족하지 못해 파일 전체가 컴파일되지 않는다.
>
> `status`·`completed_date` 를 명시하는 이유: `calculateBookStats` 가 **완독한 책만** 집계하므로 둘 중 하나라도 비면 0건이 나와 테스트가 엉뚱한 이유로 실패한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `cd apps/page0127 && npx vitest run src/entities/book/model/libraryPeriod.test.ts`
Expected: FAIL — `is_life_book` 필드가 `RatingReadingData` 에 없어 타입 에러이거나, 두 책이 한 항목에 합쳐져 `plainFive?.count` 가 2

- [ ] **Step 3: 타입에 플래그를 추가한다**

`apps/page0127/src/entities/book/types/stats.ts`:

```ts
export type RatingReadingData = {
  /** 평점 (0~5) */
  rating: number;
  /** 인생책 항목인지. rating 만으로는 5점과 구별되지 않는다 */
  is_life_book: boolean;
  count: number;
  fill: string;
};
```

`RatingDistribution` 에도 같은 필드를 추가한다. 두 타입의 JSDoc 에 남은 "0,1,2,3,4,5,10점 (7가지)" 서술을 고친다.

- [ ] **Step 4: 버킷 정의와 집계를 고친다**

`apps/page0127/src/entities/book/model/libraryPeriod.ts` 12~22행의 상수를 바꾼다:

```ts
// 분포 버킷. 인생책은 이제 rating=5 라 평점만으로는 5점과 구별되지 않는다
// → (rating, is_life_book) 조합이 버킷 키다. 인생책을 맨 위에 둔다.
const RATING_BUCKETS = [
  { rating: 5, is_life_book: true, fill: '#22c55e' },
  { rating: 5, is_life_book: false, fill: '#3b82f6' },
  { rating: 4, is_life_book: false, fill: '#a855f7' },
  { rating: 3, is_life_book: false, fill: '#f59e0b' },
  { rating: 2, is_life_book: false, fill: '#14b8a6' },
  { rating: 1, is_life_book: false, fill: '#f43f5e' },
  { rating: 0, is_life_book: false, fill: '#cbd5e1' },
] as const;
```

`calculateRatingReading` 이 이 버킷을 돌며 세도록 고친다 — 매칭 조건이 `rating` 하나가 아니라 **두 값 모두** 여야 한다:

```ts
const calculateRatingReading = (books: Book[]): RatingReadingData[] => {
  const ratingData = RATING_BUCKETS.map((bucket) => ({ ...bucket, count: 0 }));

  books.forEach((book) => {
    const item = ratingData.find(
      // 인생책은 rating 이 5 라도 별도 항목이다 — 두 값을 모두 본다
      (b) => b.rating === book.rating && b.is_life_book === book.is_life_book
    );
    if (item) item.count += 1;
  });

  return ratingData;
};
```

`getOverallStats.ts` 의 `calculateRatingDistribution` 도 같은 방식으로 고친다. 그 함수는 `Map<number, number>` 를 쓰므로 키를 `` `${rating}:${is_life_book}` `` 같은 합성 키로 바꾸거나, 위와 같은 배열 순회 방식으로 통일한다. **`percentage` 계산의 분모(`books.length`)는 그대로 둔다.**

- [ ] **Step 5: 라벨과 정렬을 고친다**

`RatingDoughnutChart.tsx`:

```ts
// 평점 숫자 → 라벨. 인생책은 rating 이 5 라도 "인생책"이다(OverallDistribution 과 같은 규칙)
const ratingLabel = (rating: number, isLifeBook: boolean) =>
  isLifeBook ? '인생책' : isRated(rating) ? `${rating}점` : '평가 안 함';
```

**정렬도 고쳐야 한다.** 현재 `sort((a, b) => b.rating - a.rating)` 은 인생책(5)과 5점(5)이 같은 값이라 순서가 불안정하다. 인생책이 맨 위에 오도록:

```ts
    // 인생책과 5점은 rating 이 같으므로 rating 만으로 정렬하면 순서가 흔들린다
    .sort((a, b) =>
      b.rating - a.rating || Number(b.is_life_book) - Number(a.is_life_book)
    );
```

리스트 `key` 도 `item.rating` 단독으로는 중복된다 — `` key={`${item.rating}-${item.is_life_book}`} `` 로 바꾼다. `OverallDistribution.tsx` 의 `key={r.rating}` 도 같다.

`ratedTotal`(평균의 분모)은 `isRated` 기준이므로 그대로 둔다 — 인생책도 rating 5라 자연히 포함된다.

- [ ] **Step 6: 통과를 확인한다**

Run:
```bash
cd apps/page0127 && npx vitest run src/entities/book/model/libraryPeriod.test.ts
cd apps/page0127 && npx tsc --noEmit
```
Expected: 통과

- [ ] **Step 7: 커밋**

```bash
git add -A apps/page0127/src
git commit -m "fix(rating): 분포에서 5점과 인생책이 합쳐지던 문제 수정"
```

---

### Task 4: 필터 체인 — "인생책만 보기"가 5점을 끌고 오지 않게

**Files:**
- Modify: `apps/page0127/src/features/stats/model/useLibraryFilters.ts`
- Modify: `apps/page0127/src/widgets/library/LibraryView.tsx`
- Modify: `apps/page0127/src/features/stats/ui/DashboardCharts.tsx`
- Modify: `apps/page0127/src/features/stats/ui/RatingDoughnutChart.tsx`
- Modify: `apps/page0127/src/features/stats/ui/DashboardBookList.tsx`

**Interfaces:**
- Consumes: `RatingReadingData.is_life_book` (Task 3)

**문제:** 도넛 차트 항목을 클릭하면 그 평점의 책만 걸러 보여 준다. 체인은 이렇다.

```
RatingDoughnutChart (onRatingClick(item.rating))
  → DashboardCharts (prop 전달)
    → LibraryView (handleRatingClick → filters.toggleRating)
      → useLibraryFilters (selectedRating: number | null)
        → DashboardBookList:193 (book.rating !== selectedRating → 제외)
```

인생책 항목을 클릭하면 `selectedRating = 5` 가 되어 **평범한 5점 책까지 함께 걸린다.** 그리고 `DashboardBookList:441` 의 필터 칩이 `{selectedRating}점` 이라 **"5점"** 이라고 표시된다.

- [ ] **Step 1: 필터 상태 타입을 넓힌다**

`useLibraryFilters.ts` 의 `selectedRating: number | null` 을 바꾼다:

```ts
/** 선택된 평점 필터. 인생책은 rating 이 5 라 숫자만으로 구별되지 않아 별도 값을 쓴다 */
export type RatingFilter = number | 'life';
```

상태 필드는 `selectedRating: RatingFilter | null`, 액션은 `toggleRating: (rating: RatingFilter) => void`. 리듀서의 `TOGGLE_RATING` 은 같은 값이면 해제하는 기존 동작을 유지한다(`===` 비교가 `'life'` 에도 그대로 통한다).

- [ ] **Step 2: 클릭 지점이 인생책을 구분해 넘기게 한다**

`RatingDoughnutChart.tsx` 의 `onRatingClick` 시그니처를 `(rating: RatingFilter) => void` 로 바꾸고, 호출을 이렇게 고친다:

```tsx
onClick={() => onRatingClick(item.is_life_book ? 'life' : item.rating)}
```

`DashboardCharts.tsx` 의 prop 타입도 같이 넓힌다. `LibraryView.tsx:145` 의 `handleRatingClick` 도 `(rating: RatingFilter)` 로 받는다.

- [ ] **Step 3: 필터 적용과 칩 라벨을 고친다**

`DashboardBookList.tsx`:

```tsx
      if (selectedRating !== null) {
        // 인생책 필터는 rating 이 아니라 플래그로 판정한다 — 인생책도 rating 이 5 라
        // 숫자 비교만 하면 평범한 5점 책까지 함께 걸린다
        if (selectedRating === 'life') {
          if (!book.is_life_book) return false;
        } else if (book.rating !== selectedRating || book.is_life_book) {
          return false;
        }
      }
```

> `else` 쪽에 `|| book.is_life_book` 이 들어가는 이유: 5점 항목을 클릭했을 때 인생책이 섞이면 분포 차트의 "5점 n권"과 목록 개수가 어긋난다. Task 3에서 두 항목을 갈랐으니 필터도 같은 기준이어야 한다.

칩 라벨(441행 부근)도 고친다:

```tsx
{selectedRating === 'life' ? '인생책' : `${selectedRating}점`}
```

prop 타입 `selectedRating?: number | null` 도 `RatingFilter | null` 로 바꾼다.

- [ ] **Step 4: 검증**

Run:
```bash
cd apps/page0127 && npx tsc --noEmit
cd apps/page0127 && npx eslint src/features/stats src/widgets/library --ext .ts,.tsx
cd apps/page0127 && npm run build
```
Expected: 셋 다 통과

- [ ] **Step 5: 커밋**

```bash
git add -A apps/page0127/src
git commit -m "fix(rating): 인생책 필터가 5점 책을 함께 거르던 문제 수정"
```

---

### Task 5: 쓰기 경로 — 폼이 두 칸에 나눠 저장

**Files:**
- Modify: `apps/page0127/src/features/book/ui/BookRegistrationForm.tsx`

**Interfaces:**
- Consumes: `BookInput.is_life_book` (Task 2)

**API 라우트는 고칠 것이 없다 — 확인했다.** `app/api/books/route.ts:99` 가 `.insert({ ...body, user_id })`, `app/api/books/[id]/route.ts:67` 이 `.update({ ...body })` 로 본문을 통째로 넘긴다. 폼이 `is_life_book` 을 담아 보내면 생성·수정 양쪽 모두 그대로 저장된다.

**화면은 바꾸지 않는다.** 지금처럼 `0점 1점 2점 3점 4점 5점 인생책` 중 하나를 고르는 배타 선택이다.

- [ ] **Step 1: 선택지에서 매직값 10을 걷어낸다**

`BookRegistrationForm.tsx` 349행 부근의 `{[0, 1, 2, 3, 4, 5, 10].map((score) => {` 를 바꾼다:

```tsx
{/* 인생책은 11번째 점수가 아니라 최고점의 별칭이다 — 저장할 때 rating=5 + 플래그로 나뉜다 */}
{([0, 1, 2, 3, 4, 5, 'life'] as const).map((score) => {
  const label = score === 'life' ? '인생책' : `${score}점`;
  const selected = score === 'life' ? isLifeBook : !isLifeBook && rating === score;
```

리듀서 상태에 `isLifeBook: boolean` 을 더하고, `SET_RATING` 액션이 두 값을 함께 세팅하게 한다:

```ts
// 인생책 선택 = 최고점 + 플래그. 배타 선택이므로 다른 점수를 고르면 플래그가 풀린다
case 'SET_RATING':
  return action.rating === 'life'
    ? { ...state, rating: 5, isLifeBook: true }
    : { ...state, rating: action.rating, isLifeBook: false };
```

`aria-pressed` 는 위의 `selected` 를 쓰고, `initialData` 로 폼을 채울 때(155행 부근) `isLifeBook: initialData?.is_life_book ?? false` 도 함께 채운다 — **수정 화면에서 인생책이 풀려 보이면 안 된다.**

- [ ] **Step 2: 제출 payload 에 담는다**

194행 부근의 제출 객체에 `is_life_book: isLifeBook` 을 추가한다.

- [ ] **Step 3: 검증**

Run:
```bash
cd apps/page0127 && npx tsc --noEmit
cd apps/page0127 && npx eslint src/features/book/ui/BookRegistrationForm.tsx
cd apps/page0127 && npm run build
cd .. && npm test
```
Expected: 전부 통과

- [ ] **Step 4: 수동 검증 (자동 테스트로 못 잠그는 부분)**

dev 서버를 띄우고 로그인한 뒤:

1. 책을 하나 등록하며 **인생책**을 고른다 → 저장
2. DB 확인:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c \
  "select title, rating, is_life_book from public.books order by created_at desc limit 1;"
```
Expected: `rating = 5`, `is_life_book = t`

3. 서재의 통계 화면을 연다 → 분포에 **"인생책" 항목이 따로** 보인다
4. 그 항목을 클릭한다 → 목록에 **인생책만** 나온다(평범한 5점 책이 섞이지 않는다). 필터 칩에 **"인생책"** 이라고 뜬다
5. 방금 등록한 책을 **수정**한다 → 평가에 인생책이 선택된 상태로 보인다

- [ ] **Step 5: 커밋**

```bash
git add -A apps/page0127/src
git commit -m "feat(rating): 등록 폼이 인생책을 rating 5 + 플래그로 저장"
```

---

## 완료 조건

- [ ] `npm test` (루트) 전체 통과
- [ ] `cd apps/page0127 && npx tsc --noEmit` 통과
- [ ] `cd apps/page0127 && npm run build` 통과
- [ ] `supabase db reset` 클린 적용
- [ ] `grep -rn "rating === 10\|=== 10\b" apps/page0127/src apps/page0127/app` → 출력 없음
- [ ] Task 5 Step 4의 수동 검증 5단계 완료

## 이 계획이 만들지 않는 것

- **평가 UI 변경** — 별점과 인생책을 독립 입력으로 나누는 것은 제품 판단이 필요하고, 사용자 0명 상태에서 실험할 근거가 없다
- **`rating` 컬럼의 `0`("평가 안 함") 분리** — 같은 종류의 부채지만 `isRated` 가 이미 한 곳에서 막고 있고, 0은 최소한 척도 안의 값이라 평균을 왜곡하지 않는다. 별도 판단이 필요하다
- **운영 DB 적용** — 배포는 PR 병합 후 사용자가 한다. 백필 건수를 배포 전후로 대조할 것
