# 트랙 A — 오픈 전 데이터 정합성 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소규모 공개 베타를 시작해도 방문자가 보는 숫자(평균 평점·완독 수)와 목록(완독한 독자)이 틀리지 않게 만든다.

**Architecture:** 평점의 의미(`0` = 평가 안 함, `10` = 인생책)를 `entities/book/model/rating.ts` 한 파일에 모으고, 흩어져 있던 평균 계산·인생책 판정을 모두 그 헬퍼로 교체한다. DB 스키마와 SQL 함수는 건드리지 않고 **표시 의미만** 바로잡는다. 공개 화면의 집계 쿼리에는 `is_public = true`를 명시해 로그인 여부와 무관하게 같은 숫자가 나오게 한다.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript, Supabase (PostgREST + RLS), vitest, FSD 레이어 구조, Turborepo 모노레포

## Global Constraints

- 작업 위치는 worktree `/Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes`, 브랜치 `worktree-track-a-prelaunch-fixes`. 원본 작업트리(`/Users/dreamfulbud/Desktop/stronger/0127`)를 건드리지 않는다.
- 모든 명령은 `apps/page0127` 디렉터리에서 실행한다. **eslint를 루트에서 실행하면 설정을 읽지 못해 헛통과한다.**
- 테스트: `npm test` (= `vitest run`). 린트: `npm run lint`. 타입: `npm run type-check`.
- 커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 **절대 넣지 않는다** (CLAUDE.md 규칙).
- 커밋은 `git commit -o <정확한 경로들>` 형태로 경로를 명시한다 (공유 index 사고 방지).
- DB 마이그레이션을 만들지 않는다. `supabase/migrations/` 를 수정하지 않는다.
- `get_books_of_life`·`ranking_snapshots` 의 `rating = 10` 조건은 그대로 둔다 (트랙 F 범위).
- `BookRating` 타입(`0 | 1 | 2 | 3 | 4 | 5 | 10`)과 DB CHECK 제약을 바꾸지 않는다.
- FSD 규칙: `entities` → `features` → `widgets` → `app` 방향으로만 import한다. `entities/book` 외부 소비자는 배럴 `@/entities/book`을 통해 import한다.
- 주석은 한국어로, "왜"를 적는다 (기존 코드 관행).
- 코드 스타일: 홑따옴표, 세미콜론, 화살표 함수 상수 export (기존 파일 관행 그대로).
- 이 저장소는 `simple-import-sort`를 쓴다. 새 import를 추가한 뒤 정렬 경고가 나면
  `npm run lint:fix`로 정리한다 (계획의 import 위치는 참고용이며 정렬이 우선).
- `@/entities/book` 배럴은 스스로 "클라이언트 안전"을 보장한다(서버 전용 함수는
  `./server`로 분리됨). 따라서 클라이언트 컴포넌트에서 값 import를 해도 된다.

## File Structure

**생성**
- `apps/page0127/src/entities/book/model/rating.ts` — 평점의 의미를 담는 유일한 자리. 만점 상수, 평가 여부 판정, 5점 척도 변환, 인생책 판정, 평균 계산.
- `apps/page0127/src/entities/book/model/rating.test.ts` — 위 모듈의 단위 테스트.

**수정**
- `apps/page0127/src/entities/book/index.ts` — `rating.ts` 배럴 export 추가.
- `apps/page0127/src/entities/book/model/libraryPeriod.ts` — `calculateBookStats`의 평균을 `averageScore`로 교체.
- `apps/page0127/src/entities/book/model/libraryPeriod.test.ts` — `0`·`10` 섞인 평균 케이스 추가.
- `apps/page0127/src/entities/book/api/getOverallStats.ts` — `rating === 10` → `isLifeBook`.
- `apps/page0127/src/widgets/book/ui/LifeBooksShelf.tsx` — `rating === 10` → `isLifeBook`.
- `apps/page0127/src/widgets/book/ui/PublicBookShelf.tsx` — 표지 뷰 판정 → `isTopRated`.
- `apps/page0127/src/features/stats/ui/OverallDistribution.tsx` — `rating === 10` → `isLifeBook`, 라벨 "만점" → "인생책".
- `apps/page0127/app/(public)/books/info/[id]/page.tsx` — `getBookStats`에 `is_public` 필터 + 평균 `averageScore` + `/ 5` 표기.
- `apps/page0127/app/(public)/[username]/page.tsx` — 취향 재분석 델타를 뺄셈으로 교체.
- `apps/page0127/src/features/book/ui/BookRegistrationForm.tsx` — 평점 `10` 버튼 라벨 "인생책".
- `apps/page0127/src/widgets/landing/model/heroSlides.ts` — `taste` 슬라이드 문구 모순 해소.

**삭제**
- `apps/page0127/src/widgets/dashboard/RatingDistributionChart.tsx` — 어디서도 import되지 않는 죽은 코드이며, 내부에 10점을 가중합에 넣고 `/ 5.0`으로 표기하는 버그가 있다.

**이미 완료 (커밋만 남음)**
- `apps/page0127/src/widgets/book/ui/ReaderProfiles.tsx` — worktree에 미커밋 상태로 존재.

---

### Task 1: 평점 의미 모듈 (`rating.ts`)

평점의 의미를 한 파일에 모은다. 이후 모든 태스크가 이 모듈을 소비한다.

**Files:**
- Create: `apps/page0127/src/entities/book/model/rating.ts`
- Test: `apps/page0127/src/entities/book/model/rating.test.ts`
- Modify: `apps/page0127/src/entities/book/index.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `apps/page0127/src/entities/book/model/rating.ts` 에서 아래를 export하고, `@/entities/book` 배럴로도 재export한다.
  - `RATING_MAX: 5`
  - `isRated(rating: number | null): rating is number` — `null`과 `0`이면 false
  - `toScore(rating: number): number` — `10` → `5`, 나머지는 그대로
  - `isLifeBook(rating: number | null): boolean` — `rating === 10`
  - `isTopRated(rating: number | null): boolean` — 5점 또는 인생책
  - `averageScore(ratings: (number | null)[]): number` — 소수 1자리, 대상 없으면 `0`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

Create `apps/page0127/src/entities/book/model/rating.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  averageScore,
  isLifeBook,
  isRated,
  isTopRated,
  RATING_MAX,
  toScore,
} from './rating';

describe('rating', () => {
  it('0과 null은 평가로 세지 않는다', () => {
    // 0은 점수가 아니라 "평가 안 함"이다
    expect(isRated(null)).toBe(false);
    expect(isRated(0)).toBe(false);
    expect(isRated(1)).toBe(true);
    expect(isRated(5)).toBe(true);
    expect(isRated(10)).toBe(true);
  });

  it('10점은 5점 만점 척도로 접는다', () => {
    expect(toScore(10)).toBe(RATING_MAX);
    expect(toScore(5)).toBe(5);
    expect(toScore(3)).toBe(3);
  });

  it('인생책은 10점이다', () => {
    expect(isLifeBook(10)).toBe(true);
    expect(isLifeBook(5)).toBe(false);
    expect(isLifeBook(0)).toBe(false);
    expect(isLifeBook(null)).toBe(false);
  });

  it('최고 평가는 5점과 인생책 둘 다다', () => {
    expect(isTopRated(10)).toBe(true);
    expect(isTopRated(5)).toBe(true);
    expect(isTopRated(4)).toBe(false);
    expect(isTopRated(0)).toBe(false);
    expect(isTopRated(null)).toBe(false);
  });

  it('평균은 평가 안 함을 빼고 10점을 5점으로 접어 계산한다', () => {
    // 0이 섞여도 평균을 끌어내리지 않는다
    expect(averageScore([0, 5])).toBe(5);
    expect(averageScore([null, 5])).toBe(5);
    // 10 → 5 로 접히므로 (5 + 4) / 2
    expect(averageScore([10, 4])).toBe(4.5);
    // 소수 1자리로 반올림: (5 + 4 + 4) / 3 = 4.333...
    expect(averageScore([10, 4, 4])).toBe(4.3);
  });

  it('평균 대상이 없으면 0을 반환한다', () => {
    expect(averageScore([])).toBe(0);
    expect(averageScore([0])).toBe(0);
    expect(averageScore([null, 0])).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
cd apps/page0127 && npm test -- src/entities/book/model/rating.test.ts
```

Expected: FAIL — `Failed to resolve import "./rating"` (파일이 아직 없다)

- [ ] **Step 3: 최소 구현을 작성한다**

Create `apps/page0127/src/entities/book/model/rating.ts`:

```ts
/**
 * 평점의 의미를 한 곳에 모은다.
 *
 * DB의 rating 컬럼은 0, 1, 2, 3, 4, 5, 10 을 갖는데 이 값들은 균일한 척도가 아니다.
 * - 0  = "평가 안 함" (점수가 아니다)
 * - 10 = "인생책"     (11번째 점수가 아니라 최고점의 별칭)
 *
 * 이 사실이 코드 곳곳에 흩어져 있어 평균 평점이 양쪽으로 왜곡됐다.
 * 판정과 변환을 모두 이 파일로 모아, 나중에 컬럼을 분리할 때 고칠 자리가 한 곳이 되게 한다.
 */

/** 평균 평점 만점 — 화면 표기(`N / 5`)에도 이 값을 쓴다 */
export const RATING_MAX = 5;

/**
 * 평균에 넣을 수 있는 평가인지 판정한다.
 * null은 미평가, 0은 "평가 안 함"이라 둘 다 제외한다.
 */
export const isRated = (rating: number | null): rating is number =>
  rating !== null && rating > 0;

/**
 * DB의 rating을 5점 만점 점수로 접는다.
 * 10은 "인생책"이라는 뜻의 최고점이므로 만점과 같게 본다.
 */
export const toScore = (rating: number): number =>
  rating === 10 ? RATING_MAX : rating;

/** 인생책 판정 — DB 함수 get_books_of_life 와 같은 정의(rating = 10)를 쓴다 */
export const isLifeBook = (rating: number | null): boolean => rating === 10;

/** 최고 평가 판정 — 5점과 인생책. 책장에서 표지를 크게 보여줄 기준이다 */
export const isTopRated = (rating: number | null): boolean =>
  isRated(rating) && toScore(rating) === RATING_MAX;

/** 평점 목록의 평균 (소수 1자리). 평가 안 함(0)·미평가(null)는 제외한다 */
export const averageScore = (ratings: (number | null)[]): number => {
  const scores = ratings.filter(isRated).map(toScore);
  if (scores.length === 0) return 0;

  const sum = scores.reduce((total, score) => total + score, 0);
  return Math.round((sum / scores.length) * 10) / 10;
};
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
cd apps/page0127 && npm test -- src/entities/book/model/rating.test.ts
```

Expected: PASS — 6 tests passed

- [ ] **Step 5: 배럴에 export를 추가한다**

`apps/page0127/src/entities/book/index.ts` 의 맨 끝(`libraryPeriod` export 블록 다음)에 추가:

```ts

// 평점 의미 (0 = 평가 안 함, 10 = 인생책) — 판정과 평균 계산의 유일한 출처
export {
  averageScore,
  isLifeBook,
  isRated,
  isTopRated,
  RATING_MAX,
  toScore,
} from './model/rating';
```

- [ ] **Step 6: 린트와 타입 검사를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run lint && npm run type-check
```

Expected: 둘 다 에러 없이 종료 (exit 0)

- [ ] **Step 7: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  apps/page0127/src/entities/book/model/rating.ts \
  apps/page0127/src/entities/book/model/rating.test.ts \
  apps/page0127/src/entities/book/index.ts \
  -m "feat(book): 평점 의미를 rating 모듈로 모음

0은 '평가 안 함', 10은 '인생책'이라는 사실이 코드 곳곳에 흩어져 있어
평균 평점이 양쪽으로 왜곡됐다. 판정·변환·평균 계산을 한 파일로 모은다."
```

---

### Task 2: 내 서재 평균 평점 정규화

`calculateBookStats`가 `0`과 `10`을 그냥 더하는 문제를 고친다. 이 값은 `RatingDoughnutChart`(평균 큰 숫자)와 `ReadingProgressOverview`(요약 줄)가 소비하므로, 여기를 고치면 살아 있는 표시가 함께 바로잡힌다.

**Files:**
- Modify: `apps/page0127/src/entities/book/model/libraryPeriod.ts`
- Test: `apps/page0127/src/entities/book/model/libraryPeriod.test.ts`

**Interfaces:**
- Consumes: Task 1의 `averageScore` (같은 폴더이므로 `./rating` 상대 경로로 import)
- Produces: `calculateBookStats`의 반환 타입은 그대로다. `averageRating` 값의 계산 규칙만 바뀐다.

- [ ] **Step 1: 실패하는 테스트를 추가한다**

`apps/page0127/src/entities/book/model/libraryPeriod.test.ts` 의 마지막 `it(...)` 블록 뒤,
`describe` 닫는 괄호 앞에 추가:

```ts
  it('평균 평점은 평가 안 함(0)을 빼고 인생책(10)을 5점으로 접어 계산한다', () => {
    const books = [
      createBook({
        status: 'completed',
        completed_date: '2026-01-10',
        rating: 10, // 인생책 → 5점으로 접힌다
      }),
      createBook({
        status: 'completed',
        completed_date: '2026-02-10',
        rating: 4,
      }),
      createBook({
        status: 'completed',
        completed_date: '2026-03-10',
        rating: 0, // "평가 안 함" — 평균에서 빠진다
      }),
    ];

    const stats = calculateBookStats(books, 2026, 2026);

    // (5 + 4) / 2 = 4.5 — 0을 세면 3.0, 10을 그대로 더하면 4.7이 된다
    expect(stats.averageRating).toBe(4.5);
    expect(stats.totalCompletedBooks).toBe(3);
  });
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
cd apps/page0127 && npm test -- src/entities/book/model/libraryPeriod.test.ts
```

Expected: FAIL — `expected 4.7 to be 4.5` (현재는 `(10 + 4 + 0) / 3 = 4.666… → 4.7`)

- [ ] **Step 3: 평균 계산을 `averageScore`로 교체한다**

`apps/page0127/src/entities/book/model/libraryPeriod.ts` 상단 import에 추가
(`import type { Book }` 위, `mapToMainCategory` 아래):

```ts
import { averageScore } from './rating';
```

같은 파일에서 `ratedBooks`와 `ratingSum` 블록을 삭제한다. 삭제할 코드:

```ts
  const ratedBooks = completedBooks.filter(
    (book) =>
      book.rating !== null &&
      VALID_RATINGS.includes(book.rating as (typeof VALID_RATINGS)[number])
  );
```

와

```ts
  const ratingSum = ratedBooks.reduce(
    (sum, book) => sum + (book.rating ?? 0),
    0
  );
```

그리고 반환 객체의 `averageRating` 프로퍼티를 교체한다.

교체 전:

```ts
    averageRating:
      ratedBooks.length > 0
        ? Math.round((ratingSum / ratedBooks.length) * 10) / 10
        : 0,
```

교체 후:

```ts
    // 0("평가 안 함")은 제외하고 10("인생책")은 5점으로 접는다 — model/rating.ts 참고
    averageRating: averageScore(completedBooks.map((book) => book.rating)),
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
cd apps/page0127 && npm test -- src/entities/book/model/libraryPeriod.test.ts
```

Expected: PASS — 6 tests passed (기존 5개 + 신규 1개). 기존 `averageRating toBe(5)` 케이스는 평점 5점 책 1권뿐이라 영향받지 않는다.

- [ ] **Step 5: `VALID_RATINGS`가 아직 쓰이는지 확인한다**

```bash
cd apps/page0127 && grep -n "VALID_RATINGS" src/entities/book/model/libraryPeriod.ts
```

Expected: `calculateRatingReading`이 여전히 쓰므로 2줄 이상 나온다 (선언 + 사용). 만약 선언 1줄만 나오면 미사용 변수이므로 선언을 삭제한다.

- [ ] **Step 6: 린트와 타입 검사를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run lint && npm run type-check
```

Expected: 둘 다 exit 0

- [ ] **Step 7: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  apps/page0127/src/entities/book/model/libraryPeriod.ts \
  apps/page0127/src/entities/book/model/libraryPeriod.test.ts \
  -m "fix(stats): 내 서재 평균 평점에서 평가 안 함(0) 제외하고 인생책(10)은 5점으로 접음

기존에는 0과 10을 그대로 더해 평균이 양쪽으로 왜곡됐다.
RatingDoughnutChart와 ReadingProgressOverview가 이 값을 그대로 보여준다."
```

---

### Task 3: 인생책 판정을 헬퍼로 교체 + 죽은 차트 삭제

`rating === 10`이 흩어져 있는 지점을 Task 1의 헬퍼로 바꾼다. 동작은 같고 의미가 드러난다. 함께, 어디에서도 import되지 않으면서 `/ 5.0` 표기에 10점을 섞는 버그를 가진 죽은 컴포넌트를 삭제한다.

**Files:**
- Modify: `apps/page0127/src/entities/book/api/getOverallStats.ts:94`
- Modify: `apps/page0127/src/widgets/book/ui/LifeBooksShelf.tsx:35`
- Modify: `apps/page0127/src/widgets/book/ui/PublicBookShelf.tsx:62`
- Modify: `apps/page0127/src/features/stats/ui/OverallDistribution.tsx:16`
- Delete: `apps/page0127/src/widgets/dashboard/RatingDistributionChart.tsx`

**Interfaces:**
- Consumes: Task 1의 `isLifeBook`, `isTopRated`
  - `entities/book` 내부 파일(`api/getOverallStats.ts`)은 `../model/rating` 상대 경로로 import
  - 외부 레이어(`widgets/`, `features/`)는 배럴 `@/entities/book`으로 import
- Produces: 없음 (동작 변화 없는 치환 + 파일 삭제)

- [ ] **Step 1: 삭제 대상이 정말 미사용인지 확인한다**

```bash
cd apps/page0127 && grep -rn "RatingDistributionChart" . --include='*.ts' --include='*.tsx' --include='*.json' | grep -v node_modules
```

Expected: 자기 자신의 정의 1줄만 나온다 —
`src/widgets/dashboard/RatingDistributionChart.tsx:29:export const RatingDistributionChart = ...`

만약 다른 파일이 나오면 삭제하지 말고 멈추고 보고한다.

- [ ] **Step 2: 죽은 차트를 삭제한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git rm apps/page0127/src/widgets/dashboard/RatingDistributionChart.tsx
```

- [ ] **Step 3: `getOverallStats.ts`를 교체한다**

`apps/page0127/src/entities/book/api/getOverallStats.ts` 의 import 블록에 추가:

```ts
import { isLifeBook } from '../model/rating';
```

`calculateReadingJourney` 안의 다음 줄을 교체한다.

교체 전:

```ts
  // 10점 만점 책
  const perfectScoreBooks = books.filter((book) => book.rating === 10).length;
```

교체 후:

```ts
  // 인생책 (rating 10)
  const perfectScoreBooks = books.filter((book) => isLifeBook(book.rating)).length;
```

- [ ] **Step 4: `LifeBooksShelf.tsx`를 교체한다**

`apps/page0127/src/widgets/book/ui/LifeBooksShelf.tsx` 의 import를 수정한다.

교체 전:

```ts
import type { Book } from '@/entities/book';
```

교체 후:

```ts
import { isLifeBook } from '@/entities/book';

import type { Book } from '@/entities/book';
```

같은 파일에서 필터를 교체한다.

교체 전:

```ts
  const lifeBooks = books.filter((book) => book.rating === 10);
```

교체 후:

```ts
  const lifeBooks = books.filter((book) => isLifeBook(book.rating));
```

- [ ] **Step 5: `PublicBookShelf.tsx`를 교체한다**

`apps/page0127/src/widgets/book/ui/PublicBookShelf.tsx` 의 import 블록에
`@/entities/book` 값 import를 추가한다 (기존 `import type { Book } ...` 위):

```ts
import { isTopRated } from '@/entities/book';
```

같은 파일에서 표지 뷰 판정을 교체한다.

교체 전:

```ts
          const isCoverView = book.rating === 5 || book.rating === 10;
```

교체 후:

```ts
          // 최고 평가(5점·인생책)만 표지를 크게 세우고 나머지는 책등으로 꽂는다
          const isCoverView = isTopRated(book.rating);
```

- [ ] **Step 6: `OverallDistribution.tsx`를 교체한다**

`apps/page0127/src/features/stats/ui/OverallDistribution.tsx` 의 import를 수정한다.

교체 전:

```ts
import type { RatingDistribution } from '@/entities/book';
```

교체 후:

```ts
import { isLifeBook } from '@/entities/book';

import type { RatingDistribution } from '@/entities/book';
```

같은 파일의 `ratingLabel`을 교체한다. 등록 폼(Task 6)이 10점을 "인생책"으로 부르게
되므로 차트 라벨도 같은 이름으로 맞춘다.

교체 전:

```ts
// 평점 숫자 → 라벨 (10은 만점)
const ratingLabel = (rating: number) => (rating === 10 ? '만점' : `${rating}점`);
```

교체 후:

```ts
// 평점 숫자 → 라벨 (10은 점수가 아니라 "인생책")
const ratingLabel = (rating: number) =>
  isLifeBook(rating) ? '인생책' : `${rating}점`;
```

- [ ] **Step 7: 전체 테스트·린트·타입 검사를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm test && npm run lint && npm run type-check
```

Expected: 테스트 전부 PASS, 린트·타입 exit 0. `ratingLabel`의 `w-12` 라벨 칸에
"인생책"(3자)이 들어가므로 레이아웃 깨짐은 없다.

- [ ] **Step 8: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  apps/page0127/src/entities/book/api/getOverallStats.ts \
  apps/page0127/src/widgets/book/ui/LifeBooksShelf.tsx \
  apps/page0127/src/widgets/book/ui/PublicBookShelf.tsx \
  apps/page0127/src/features/stats/ui/OverallDistribution.tsx \
  apps/page0127/src/widgets/dashboard/RatingDistributionChart.tsx \
  -m "refactor(book): 인생책 판정을 rating 헬퍼로 모으고 죽은 차트 삭제

rating === 10 이 흩어져 있어 의미가 코드에 드러나지 않았다.
평점 분포 라벨도 등록 폼과 같은 이름('인생책')으로 맞춘다.

RatingDistributionChart는 어디에서도 import되지 않는 죽은 코드였고,
10점을 가중합에 넣은 채 '/ 5.0'으로 표기해 5를 넘는 값이 나올 수 있었다."
```

---

### Task 4: 공개 책 페이지 통계 정합성

공개 책 페이지의 완독 수·평균 평점이 (1) 비공개 기록까지 세고 (2) `0`과 `10`을 그냥 평균 내고 (3) 만점 표기가 없는 문제를 한 번에 고친다.

**Files:**
- Modify: `apps/page0127/app/(public)/books/info/[id]/page.tsx:67-97` (`getBookStats`)
- Modify: `apps/page0127/app/(public)/books/info/[id]/page.tsx:183-203` (표시부)

**Interfaces:**
- Consumes: Task 1의 `averageScore`, `RATING_MAX` (배럴 `@/entities/book`)
- Produces: `getBookStats`의 반환 타입이 바뀐다 — `avgRating`이 `string`에서 `number`로.
  같은 파일 안에서만 쓰이므로 외부 영향은 없다.

- [ ] **Step 1: `getBookStats`를 교체한다**

`apps/page0127/app/(public)/books/info/[id]/page.tsx` 의 import 블록에 추가
(`import type { GlobalBook } from '@/entities/book';` 위):

```ts
import { averageScore, RATING_MAX } from '@/entities/book';
```

같은 파일의 `getBookStats` 함수 전체를 교체한다.

교체 전:

```ts
async function getBookStats(isbn: string) {
  const supabase = await createClient();

  // 완독 수
  const { count: completedCount } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('isbn', isbn)
    .eq('status', 'completed');

  // 평균 평점
  const { data: ratings } = await supabase
    .from('books')
    .select('rating')
    .eq('isbn', isbn)
    .not('rating', 'is', null);

  const avgRating =
    ratings && ratings.length > 0
      ? (
          ratings.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
          ratings.length
        ).toFixed(1)
      : '0.0';

  return {
    completedCount: completedCount || 0,
    avgRating,
    ratingCount: ratings?.length || 0,
  };
}
```

교체 후:

```ts
async function getBookStats(isbn: string) {
  const supabase = await createClient();

  // is_public 을 명시하는 이유: RLS 는 익명 방문자만 걸러준다.
  // 로그인 사용자에게는 자기 비공개 기록까지 섞여 방문자와 다른 숫자가 보였다.
  // "이 책을 몇 명이 완독했나"는 누가 보든 같아야 한다.
  const { count: completedCount } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('isbn', isbn)
    .eq('status', 'completed')
    .eq('is_public', true);

  const { data: ratings } = await supabase
    .from('books')
    .select('rating')
    .eq('isbn', isbn)
    .eq('is_public', true)
    .not('rating', 'is', null);

  // 0("평가 안 함")과 10("인생책")을 그대로 평균 내면 양쪽으로 왜곡된다 — model/rating.ts
  const scores = (ratings ?? []).map((row) => row.rating);

  return {
    completedCount: completedCount || 0,
    avgRating: averageScore(scores),
    // 평균에 실제로 들어간 권수만 센다 (0점 기록은 제외)
    ratingCount: scores.filter((rating) => rating !== null && rating > 0).length,
  };
}
```

- [ ] **Step 2: 만점 표기를 추가한다**

같은 파일의 통계 표시 줄에서 평균 옆에 만점을 붙인다.

교체 전:

```tsx
                {stats.avgRating}
                <span className='font-normal text-text-faint'>
                  ({stats.ratingCount})
                </span>
```

교체 후:

```tsx
                {stats.avgRating.toFixed(1)}
                <span className='font-normal text-text-faint'>
                  / {RATING_MAX} ({stats.ratingCount})
                </span>
```

- [ ] **Step 3: 타입 검사와 린트를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run type-check && npm run lint
```

Expected: 둘 다 exit 0. `avgRating`이 `number`가 됐으므로 `.toFixed(1)`이 필요하다 —
Step 2를 빠뜨리면 여기서 타입 에러가 난다.

- [ ] **Step 4: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  "apps/page0127/app/(public)/books/info/[id]/page.tsx" \
  -m "fix(book): 공개 책 페이지 통계를 공개 기록으로 한정하고 평균 평점 정규화

is_public 필터가 없어 로그인 사용자에게는 자기 비공개 기록까지 완독 수·평균에
섞여 방문자와 다른 숫자가 보였다. 평균도 0(평가 안 함)과 10(인생책)을 그대로
더하고 있었고 만점 표기가 없어 5점 만점인지 알 수 없었다."
```

---

### Task 5: 취향 재분석 조건 수정

`completed_date`(date)를 `taste_analyses.created_at`(timestamptz)와 직접 비교하는 쿼리를 없애고, 이미 조회한 값의 뺄셈으로 바꾼다.

**Files:**
- Modify: `apps/page0127/app/(public)/[username]/page.tsx:124-134`

**Interfaces:**
- Consumes: 같은 파일이 이미 조회하는 `analyzableBookCount`(number)와
  `analysisHistory[0].analyzed_books_count`(number)
- Produces: `newBooksSinceLastAnalysis`의 타입(`number | null`)은 그대로다.
  `PublicLibraryHeader`의 props 계약을 바꾸지 않는다.

- [ ] **Step 1: 델타 계산을 뺄셈으로 교체한다**

`apps/page0127/app/(public)/[username]/page.tsx` 의 다음 블록을 교체한다.

교체 전:

```ts
    const lastAnalysis = analysisHistory[0] ?? null;
    if (lastAnalysis) {
      const { count: newCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .not('rating', 'is', null)
        .gt('completed_date', lastAnalysis.created_at);
      newBooksSinceLastAnalysis = newCount ?? 0;
    }
```

교체 후:

```ts
    const lastAnalysis = analysisHistory[0] ?? null;
    if (lastAnalysis) {
      // 이전에는 completed_date(date)를 created_at(timestamptz)와 직접 비교했다.
      // 타입이 어긋나는 데다, 과거에 읽은 책을 오늘 등록하면 새 기록으로 세지 않았다.
      // analyzed_books_count 는 분석 당시의 "완독 + 별점" 권수라 지금 값과 같은 집합이다.
      // → 총량 차이로 세면 '읽고싶어요로 담아둔 책을 나중에 완독'하는 흐름도 잡힌다.
      //
      // 알려진 한계: 분석 라우트가 프롬프트용으로 100권까지만 세므로(MAX_BOOKS_FOR_PROMPT)
      // 분석 대상이 100권을 넘으면 델타가 과다 계산된다. 사용자를 막는 방향이 아니고
      // 재분석은 월간 사용량 한도로 이미 묶여 있어 그대로 둔다.
      newBooksSinceLastAnalysis = Math.max(
        0,
        analyzableBookCount - lastAnalysis.analyzed_books_count
      );
    }
```

- [ ] **Step 2: `supabase` 변수가 이 블록 밖에서도 쓰이는지 확인한다**

```bash
cd apps/page0127 && grep -n "supabase" "app/(public)/[username]/page.tsx"
```

Expected: 여러 줄이 나온다 (`getOverallStats` 옆 `taste_analyses` 조회, `books` count 조회 등).
미사용 변수 경고가 나지 않는지는 다음 단계의 린트로 확인한다.

- [ ] **Step 3: 타입 검사와 린트를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run type-check && npm run lint
```

Expected: 둘 다 exit 0

- [ ] **Step 4: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  "apps/page0127/app/(public)/[username]/page.tsx" \
  -m "fix(taste): 재분석 조건을 분석 당시 권수와의 차이로 계산

completed_date(date)를 created_at(timestamptz)와 직접 비교해 타입이 어긋났고,
과거에 읽은 책을 오늘 등록하면 새 기록으로 세지 않았다.
analyzed_books_count 와의 차이로 세면 쿼리도 하나 줄고,
'읽고싶어요로 담아둔 책을 나중에 완독'하는 흐름도 정상 집계된다."
```

---

### Task 6: 등록 폼 평점 `10` 버튼 라벨

사용자가 보는 평점 버튼이 `0 1 2 3 4 5 10`으로 척도가 깨져 보이는 문제를 라벨만으로 해소한다. 저장 값은 `10` 그대로다.

**Files:**
- Modify: `apps/page0127/src/features/book/ui/BookRegistrationForm.tsx:356-377`

**Interfaces:**
- Consumes: Task 1의 `isLifeBook` (배럴 `@/entities/book`)
- Produces: 없음. 저장되는 `rating` 값과 `BookRating` 타입은 변하지 않는다.

- [ ] **Step 1: 값 import를 추가한다**

`apps/page0127/src/features/book/ui/BookRegistrationForm.tsx` 의 기존 타입 import
(`import type { AladinBook, BookRating, BookStatus } from '@/entities/book';`) 옆에
값 import를 추가한다:

```ts
import { isLifeBook } from '@/entities/book';
```

- [ ] **Step 2: 버튼 라벨과 `aria-label`을 교체한다**

같은 파일의 평점 버튼 블록을 교체한다.

교체 전:

```tsx
                {[0, 1, 2, 3, 4, 5, 10].map((score) => (
                  <button
                    key={score}
                    type='button'
                    // aria-pressed: 어떤 점수가 선택됐는지 스크린 리더에 전달
                    aria-pressed={rating === score}
                    aria-label={`${score}점`}
                    onClick={() =>
                      dispatch({
                        type: 'SET_RATING',
                        rating: score as BookRating,
                      })
                    }
                    className={`rounded-md border px-4 py-2 transition-colors ${
                      rating === score
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-accent'
                    }`}
                  >
                    {score}
                  </button>
                ))}
```

교체 후:

```tsx
                {[0, 1, 2, 3, 4, 5, 10].map((score) => {
                  // 10은 11번째 점수가 아니라 "인생책"이다.
                  // 버튼에 10을 그대로 쓰면 척도가 깨져 보이므로 이름으로 보여준다.
                  const label = isLifeBook(score) ? '인생책' : `${score}점`;

                  return (
                    <button
                      key={score}
                      type='button'
                      // aria-pressed: 어떤 점수가 선택됐는지 스크린 리더에 전달
                      aria-pressed={rating === score}
                      aria-label={label}
                      onClick={() =>
                        dispatch({
                          type: 'SET_RATING',
                          rating: score as BookRating,
                        })
                      }
                      className={`rounded-md border px-4 py-2 transition-colors ${
                        rating === score
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
```

- [ ] **Step 3: 타입 검사와 린트를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run type-check && npm run lint
```

Expected: 둘 다 exit 0. 버튼 텍스트가 `0` → `0점`으로도 바뀌어 숫자만 있던 버튼들이
단위를 갖게 된다 (`flex-wrap` 컨테이너라 줄바꿈으로 흡수된다).

- [ ] **Step 4: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  apps/page0127/src/features/book/ui/BookRegistrationForm.tsx \
  -m "fix(book): 등록 폼 평점 10을 '인생책'으로 표시

0 1 2 3 4 5 10 을 그대로 늘어놓으면 척도가 깨져 보인다.
10은 11번째 점수가 아니라 최고점의 별칭이므로 이름으로 보여준다.
저장 값과 BookRating 타입은 그대로다."
```

---

### Task 7: 랜딩 슬라이드 문구 모순 해소

`taste` 슬라이드가 eyebrow에서는 "완독 5권부터"라고 하고 본문에서는 "열 권이면 충분해요"라고 해 조건이 두 개로 읽힌다. 실제 조건은 5권이다.

**Files:**
- Modify: `apps/page0127/src/widgets/landing/model/heroSlides.ts:29`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (편집 카피 자산만 변경)

- [ ] **Step 1: 본문 문구를 교체한다**

`apps/page0127/src/widgets/landing/model/heroSlides.ts` 의 `taste` 슬라이드에서
`lines`를 교체한다.

교체 전:

```ts
    lines: ['열 권이면 충분해요', '취향은 이미 쌓였습니다'],
```

교체 후:

```ts
    lines: ['다섯 권이면 충분해요', '취향은 이미 쌓였습니다'],
```

`eyebrow: '완독 5권부터'`는 실제 조건이므로 그대로 둔다.

- [ ] **Step 2: 파일 상단의 편집 규칙을 지켰는지 확인한다**

파일 주석은 "메인 카피는 2줄, 각 줄 8~12자"를 요구한다.
"다섯 권이면 충분해요" = 10자, "취향은 이미 쌓였습니다" = 11자 → 규칙 충족.

- [ ] **Step 3: 린트를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run lint
```

Expected: exit 0

- [ ] **Step 4: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  apps/page0127/src/widgets/landing/model/heroSlides.ts \
  -m "fix(landing): 취향 분석 슬라이드의 권수 모순 해소

eyebrow는 '완독 5권부터'인데 본문은 '열 권이면 충분해요'라 조건이 둘로 읽혔다.
실제 조건인 5권으로 맞춘다."
```

---

### Task 8: ReaderProfiles 검증 후 커밋

worktree에 미커밋 상태로 남아 있는 수정을 검증하고 커밋한다. **코드를 새로 쓰지 않는다** — 이미 작성된 변경이 맞는지 확인하는 태스크다.

**Files:**
- Modify(이미 완료): `apps/page0127/src/widgets/book/ui/ReaderProfiles.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 미커밋 변경이 그대로 있는지 확인한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git diff --stat apps/page0127/src/widgets/book/ui/ReaderProfiles.tsx
```

Expected: `1 file changed` 가 나온다. 아무것도 안 나오면 변경이 사라진 것이므로
멈추고 보고한다.

- [ ] **Step 2: 조회하는 컬럼이 실제 스키마에 있는지 확인한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127
grep -rn "photo_url\|avatar_url" supabase/migrations/*.sql | head
```

Expected: `photo_url`이 `profiles` 정의에 나오고 `avatar_url`은 나오지 않는다.
(수정 전 코드가 `avatar_url`을 읽던 것이 결함 5였다)

- [ ] **Step 3: 수정된 코드가 `photo_url`만 쓰는지 확인한다**

```bash
cd apps/page0127 && grep -n "avatar_url\|photo_url\|is_public" src/widgets/book/ui/ReaderProfiles.tsx
```

Expected: `photo_url` 1줄 이상, `is_public` 1줄, `avatar_url` 0줄

- [ ] **Step 4: 타입 검사와 린트를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run type-check && npm run lint
```

Expected: 둘 다 exit 0

- [ ] **Step 5: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git commit -o \
  apps/page0127/src/widgets/book/ui/ReaderProfiles.tsx \
  -m "fix(book): 완독 독자 목록의 잘못된 컬럼·조인·공개범위 수정

profiles.avatar_url 을 읽고 있었지만 실제 컬럼은 photo_url 이다.
books.user_id 의 외래키는 auth.users 하나뿐이라 books↔profiles 중첩 조인은
PGRST200 으로 실패한다 → user_id 를 모아 profiles 를 따로 조회하는 2단계로 바꿨다.
is_public 필터가 없어 로그인 사용자에게 자기 비공개 기록이 섞였고,
재독 기록 때문에 같은 사람이 여러 번 나올 수 있었다."
```

---

### Task 9: 전체 검증 후 main 병합

**Files:** 없음 (검증과 병합만)

**Interfaces:**
- Consumes: Task 1~8의 모든 변경
- Produces: 없음

- [ ] **Step 1: 전체 테스트를 실행한다**

```bash
cd apps/page0127 && npm test
```

Expected: 전부 PASS. `rating.test.ts` 6개와 `libraryPeriod.test.ts` 6개가 포함된다.

- [ ] **Step 2: 린트·타입·빌드를 실행한다**

```bash
cd apps/page0127 && npm run lint && npm run type-check && npm run build
```

Expected: 셋 다 exit 0. 빌드는 삭제한 `RatingDistributionChart`를 아무도 import하지
않는지까지 확인해 준다.

- [ ] **Step 3: 로컬 개발 서버를 띄운다**

worktree에는 gitignore된 `.env.local`이 없으므로 원본에서 복사한다
(복사 후에도 gitignore 대상이라 커밋되지 않는다):

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127
cp apps/page0127/.env.local .claude/worktrees/track-a-prelaunch-fixes/apps/page0127/.env.local
cd .claude/worktrees/track-a-prelaunch-fixes/apps/page0127 && PORT=3100 npm run dev
```

원본 폴더의 서버(3000)와 헷갈리지 않도록 **3100**을 쓴다.

- [ ] **Step 4: 공개 책 페이지를 로그아웃 상태로 확인한다**

`http://localhost:3100/books/info/<id>` 를 시크릿 창으로 열고 기록한다:

- 평균 평점 표기가 `N.N / 5 (권수)` 형태인지
- 완독 인원 수
- "이 책을 완독한 사람들" 아바타 수와 이름

- [ ] **Step 5: 같은 페이지를 로그인 상태로 확인한다**

**그 책에 비공개(`is_public = false`) 기록을 가진 계정**으로 로그인해 같은 URL을 연다.
Step 4에서 기록한 세 값이 **모두 같아야 한다.** 이것이 Task 4·8의 핵심 검증이다.

값이 다르면 `is_public` 필터가 빠진 쿼리가 남아 있는 것이므로 멈추고 보고한다.

- [ ] **Step 6: 내 서재 평균 평점을 확인한다**

`http://localhost:3100/<username>` 에서:

- 평균 평점이 표시되고, 인생책(10점)이 있어도 5를 넘지 않는지
- 평점 분포 라벨에 "인생책"이 나오는지 (10점 기록이 있을 때)
- 인생책 섹션과 표지 크게 보이는 책이 이전과 같은지

- [ ] **Step 7: 등록 폼과 랜딩을 확인한다**

- 책 등록에서 완독 선택 시 평점 버튼이 `0점 1점 2점 3점 4점 5점 인생책`으로 보이는지
- 랜딩 히어로 두 번째 슬라이드가 "다섯 권이면 충분해요"인지

- [ ] **Step 8: 서버를 끄고 main에 병합한다**

`.env.local`은 gitignore 대상이라 커밋 대상에 들어가지 않는다. 병합 전 확인:

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-a-prelaunch-fixes
git status --short
```

Expected: 비어 있다 (모든 변경이 커밋됨).

원본 작업트리는 다른 세션이 동시에 쓸 수 있으므로 `--no-ff`로 병합한다:

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127
git merge --no-ff worktree-track-a-prelaunch-fixes -m "merge: 트랙 A 오픈 전 데이터 정합성 수정"
```

- [ ] **Step 9: 병합 결과를 검증한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/apps/page0127 && npm test && npm run lint
```

Expected: 둘 다 통과. 실패하면 다른 세션의 동시 변경과 충돌했을 수 있으므로 보고한다.

---

## 검증 요약

| 검증 | 방법 | 어떤 결함을 잡는가 |
| --- | --- | --- |
| `rating.test.ts` | `npm test` | 0 제외·10→5 변환 규칙 |
| `libraryPeriod.test.ts` | `npm test` | 내 서재 평균 왜곡 (결함 6) |
| `npm run build` | Task 9 Step 2 | 삭제한 죽은 차트의 잔존 import (결함 8) |
| 로그아웃/로그인 숫자 비교 | Task 9 Step 4~5 | 비공개 기록 혼입 (결함 7·5) |
| 공개 책 페이지 `/ 5` 표기 | Task 9 Step 4 | 만점 모호성 (결함 3) |
| 등록 폼 버튼 | Task 9 Step 7 | 척도 깨짐 (결함 2) |
| 랜딩 슬라이드 | Task 9 Step 7 | 권수 모순 |

취향 재분석 조건(결함 4)은 이전 분석 기록이 있는 계정이 필요해 로컬에서 재현 비용이
크다. 계산이 순수 뺄셈이고 타입 검사로 계약이 보장되므로 코드 리뷰로 대체한다.

## 이번 범위에서 제외

- 트랙 B~F 전부 (60초 기록, 재방문, 계측, 공유 OG, 평점 DB 분리)
- 취향 분석 5권 진입 장벽 조정 (트랙 B — 버그가 아닌 제품 결정)
- `RatingDoughnutChart`의 만점 표기 추가 (서재 화면 카피·디자인 결정)
- `worktree-sentry-admin-errors` 브랜치의 미병합 커밋 4개 (별개 작업)
