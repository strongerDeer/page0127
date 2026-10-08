# 홈 '책장 맛보기' Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비로그인 홈 맨 위에서 읽은 책을 고르면 내 책장이 그려지고, 로그인하면 고른 책(또는 0권일 때 목표)이 서재에 그대로 담긴다.

**Architecture:** 새 feature `features/shelf-preview` 하나에 모은다. 고르기·책장은 클라이언트 컴포넌트,
10권 조회는 서버(anon + 1시간 캐시). 로그인 너머로는 `localStorage` 에 임시 보관하고, 로그인 후
`AppShellLayout` 에 마운트한 `PendingShelfClaimer` 가 기존 `POST /api/books` 로 담는다.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Supabase · vitest · Playwright · sonner · GA4(`trackEvent`)

**Spec:** `docs/superpowers/specs/2026-10-08-home-shelf-preview-design.md`

## Global Constraints

- 노출 조건: **비로그인일 때만** 홈에 렌더. 로그인 사용자 홈은 그대로.
- 문구(진행형, 판단형 금지): 1~4권 `{5-n}권만 더 모이면 취향 노트를 받아 볼 수 있어요.` / 5권+ `별점만 매기면 바로 취향 노트를 받아 볼 수 있어요.`
- 취향 분석 기준 5권은 상수 하나(`TASTE_ANALYSIS_MIN_BOOKS`)로 분석 라우트와 공유.
- 보관 키 `page0127:pending-shelf`, 만료 24시간, 최대 20권.
- 목표 범위 1~1,000권, 기본값 12권, 올해 기준.
- GA 이벤트: `shelf_preview_pick`(source, count) · `shelf_preview_save`(count) · `shelf_preview_goal`(target).
- 담을 때 `status: 'completed'`. 이미 서재에 있는 책은 건너뛰고, 올해 목표가 있으면 덮지 않는다.
- 저장 버튼은 기존 `/login` 으로 보낸다. 로그인 화면은 바꾸지 않는다.
- 프로젝트 규칙: `type` 만(interface 금지), `any` 금지, `console.log` 금지, Props 타입 필수, 홑따옴표 JSX,
  import 순서(React → Next → 외부 → `@/` → 상대 → 타입), 학습 포인트에만 한국어 주석.
- **커밋·푸시는 사용자 요청 시에만.** 각 태스크 끝의 "커밋 지점"은 메시지 초안이다. `Co-Authored-By` 트레일러 금지.

## Review Focus

1. **개발·CI DB 에 10권이 없다** — `global_books` 는 운영 데이터다. 그리드가 비어도 섹션·검색·목표는 보여야 한다. → Task 3 `orderByIsbnList` 빈 입력 테스트, Task 9 e2e 가 그리드 0개일 때 분기.
2. **기존 사용자가 이 흐름으로 로그인** — 이미 있는 책은 건너뛰고, 올해 목표를 덮지 않는다. → Task 7 `claimPendingBooks` 중복 테스트, `shouldClaimGoal` 테스트.
3. **같은 책을 목록과 검색에서 두 번 고름** — isbn 기준으로 한 번만 꽂힌다(두 번째는 해제). → Task 2 `toggleSelection` 테스트.
4. **`localStorage` 가 던진다(사파리 비공개 등)** — 저장 버튼은 그래도 로그인으로 간다. → Task 1 `writePendingShelf` 예외 테스트.
5. **클레이머 이중 실행(StrictMode·탭 두 개)** — 두 번 담기지 않는다(먼저 지운다). → Task 8 수동 확인 단계.

---

## 파일 지도

| 파일                                                              | 책임                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| Create `apps/page0127/src/shared/config/tasteAnalysis.ts`         | 취향 분석 최소 권수 상수                              |
| Modify `apps/page0127/app/api/taste-analysis/analyze/route.ts`    | 매직 넘버 5 → 상수                                    |
| Create `apps/page0127/src/features/shelf-preview/model/types.ts`  | `PendingBook`·`PendingGoal`·`ShelfPick`               |
| Create `.../model/pendingShelf.ts` (+test)                        | 보관 형식·검사·읽기/쓰기/지우기                       |
| Create `.../model/previewMessage.ts` (+test)                      | 안내 문구                                             |
| Create `.../model/selection.ts` (+test)                           | 고르기 토글                                           |
| Create `.../model/toShelfPick.ts` (+test)                         | DB 행·검색 결과 → `ShelfPick`, 목록 순서 맞추기       |
| Create `.../config/picks.ts`                                      | 10권 isbn                                             |
| Create `.../api/getShelfPicks.ts`                                 | 10권 조회(server-only, 캐시)                          |
| Create `.../ui/ShelfPreview.tsx`                                  | 고르기 그리드 + 책장 + 저장 (client)                  |
| Create `.../ui/PreviewShelf.tsx`                                  | 책등 줄                                               |
| Create `.../ui/ShelfSearch.tsx`                                   | 다른 책 찾기 (client)                                 |
| Create `.../ui/GoalStarter.tsx`                                   | 0권 목표 (client)                                     |
| Create `.../ui/ShelfPreviewSection.tsx`                           | 서버 래퍼(조회 → 클라이언트)                          |
| Create `.../model/claim.ts` (+test)                               | 담기 루프·`toBookInput`·`shouldClaimGoal`·토스트 문구 |
| Create `.../api/claimReadingGoalAction.ts`                        | 목표 서버 액션                                        |
| Create `.../ui/PendingShelfClaimer.tsx`                           | 로그인 후 담기 (client)                               |
| Modify `apps/page0127/src/shared/lib/analytics/trackEvent.ts`     | 이벤트 3개 추가                                       |
| Modify `apps/page0127/src/widgets/AppShell/ui/AppShellLayout.tsx` | 클레이머 마운트                                       |
| Modify `apps/page0127/app/(public)/page.tsx`                      | 섹션 배치                                             |
| Create `apps/page0127/e2e/home-shelf-preview.spec.ts`             | e2e                                                   |

공통 명령 (레포 루트 기준 절대 경로, `cd` 금지):

```bash
APP=/Users/dreamfulbud/Desktop/stronger/0127/apps/page0127
npm --prefix $APP run test -- src/features/shelf-preview      # vitest
npm --prefix $APP run type-check
npm --prefix $APP run lint                                    # --fix 금지(전체 수정 금지 규칙)
```

---

### Task 1: 보관 모델 (`pendingShelf`)

**Files:**

- Create: `apps/page0127/src/features/shelf-preview/model/types.ts`
- Create: `apps/page0127/src/features/shelf-preview/model/pendingShelf.ts`
- Test: `apps/page0127/src/features/shelf-preview/model/pendingShelf.test.ts`

**Interfaces:**

- Produces: `PendingBook`, `PendingGoal`, `ShelfPick` 타입 / `PENDING_SHELF_KEY`, `PENDING_SHELF_TTL_MS`, `MAX_PENDING_BOOKS`, `GOAL_MIN`, `GOAL_MAX` / `parsePendingShelf(raw: unknown, now: number): PendingShelf | null` / `readPendingShelf(now?: number): PendingShelf | null` / `writePendingShelf(input: { books: PendingBook[]; goal: PendingGoal | null }, now?: number): boolean` / `clearPendingShelf(): void` / `isValidGoal(goal: unknown): goal is PendingGoal`

- [ ] **Step 1: 타입 파일 작성**

```ts
// apps/page0127/src/features/shelf-preview/model/types.ts

/** POST /api/books 에 넘길 책 정보 — 로그인 너머로 들고 가는 최소 필드 */
export type PendingBook = {
  isbn: string;
  provider_item_id: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image: string | null;
  spine_image: string | null;
  pub_date: string | null;
  category: string | null;
  source: string | null;
};

export type PendingGoal = { year: number; target: number };

/** 화면에 그릴 한 권 — 저장용 정보(book)와 그리기용 주소를 함께 든다 */
export type ShelfPick = {
  book: PendingBook;
  coverSrc: string | null;
  coverFallback: string | null;
  spineSrc: string | null;
};
```

- [ ] **Step 2: 실패하는 테스트 작성**

```ts
// apps/page0127/src/features/shelf-preview/model/pendingShelf.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_PENDING_BOOKS,
  PENDING_SHELF_KEY,
  PENDING_SHELF_TTL_MS,
  clearPendingShelf,
  parsePendingShelf,
  readPendingShelf,
  writePendingShelf,
} from "./pendingShelf";

import type { PendingBook } from "./types";

const book = (isbn: string): PendingBook => ({
  isbn,
  provider_item_id: null,
  title: `책 ${isbn}`,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  pub_date: null,
  category: null,
  source: null,
});

const NOW = 1_760_000_000_000;

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parsePendingShelf", () => {
  it("정상 형식을 그대로 돌려준다", () => {
    const raw = { v: 1, savedAt: NOW, books: [book("1")], goal: null };
    expect(parsePendingShelf(raw, NOW)).toEqual(raw);
  });

  it("목표만 있는 형식도 받는다", () => {
    const raw = {
      v: 1,
      savedAt: NOW,
      books: [],
      goal: { year: 2026, target: 12 },
    };
    expect(parsePendingShelf(raw, NOW)?.goal).toEqual({
      year: 2026,
      target: 12,
    });
  });

  it("24시간이 지나면 버린다", () => {
    const raw = {
      v: 1,
      savedAt: NOW - PENDING_SHELF_TTL_MS - 1,
      books: [book("1")],
      goal: null,
    };
    expect(parsePendingShelf(raw, NOW)).toBeNull();
  });

  it("버전·형식이 틀리면 버린다", () => {
    expect(parsePendingShelf(null, NOW)).toBeNull();
    expect(parsePendingShelf("x", NOW)).toBeNull();
    expect(
      parsePendingShelf({ v: 2, savedAt: NOW, books: [], goal: null }, NOW),
    ).toBeNull();
    expect(
      parsePendingShelf(
        { v: 1, savedAt: NOW, books: [{ isbn: 1 }], goal: null },
        NOW,
      ),
    ).toBeNull();
  });

  it(`${MAX_PENDING_BOOKS}권을 넘으면 버린다`, () => {
    const books = Array.from({ length: MAX_PENDING_BOOKS + 1 }, (_, i) =>
      book(String(i)),
    );
    expect(
      parsePendingShelf({ v: 1, savedAt: NOW, books, goal: null }, NOW),
    ).toBeNull();
  });

  it("목표가 범위를 벗어나면 버린다", () => {
    expect(
      parsePendingShelf(
        { v: 1, savedAt: NOW, books: [], goal: { year: 2026, target: 0 } },
        NOW,
      ),
    ).toBeNull();
    expect(
      parsePendingShelf(
        { v: 1, savedAt: NOW, books: [], goal: { year: 2026, target: 1001 } },
        NOW,
      ),
    ).toBeNull();
  });

  it("책도 목표도 없으면 담을 것이 없으니 null", () => {
    expect(
      parsePendingShelf({ v: 1, savedAt: NOW, books: [], goal: null }, NOW),
    ).toBeNull();
  });
});

describe("read/write/clear", () => {
  it("쓰고 읽고 지운다", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    expect(writePendingShelf({ books: [book("1")], goal: null }, NOW)).toBe(
      true,
    );
    expect(readPendingShelf(NOW)?.books).toHaveLength(1);
    clearPendingShelf();
    expect(readPendingShelf(NOW)).toBeNull();
  });

  it("형식이 깨진 값은 읽을 때 지운다", () => {
    const storage = memoryStorage();
    storage.setItem(PENDING_SHELF_KEY, "{not json");
    vi.stubGlobal("localStorage", storage);
    expect(readPendingShelf(NOW)).toBeNull();
    expect(storage.getItem(PENDING_SHELF_KEY)).toBeNull();
  });

  it("저장소가 던져도 예외 없이 false", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(writePendingShelf({ books: [book("1")], goal: null }, NOW)).toBe(
      false,
    );
    expect(readPendingShelf(NOW)).toBeNull();
    expect(() => clearPendingShelf()).not.toThrow();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model/pendingShelf.test.ts`
Expected: FAIL — `Failed to resolve import "./pendingShelf"`

- [ ] **Step 4: 구현**

```ts
// apps/page0127/src/features/shelf-preview/model/pendingShelf.ts
import type { PendingBook, PendingGoal } from "./types";

/**
 * 로그인 너머로 고른 책·목표를 들고 가는 임시 보관함.
 *
 * 학습 포인트:
 * - 왜 localStorage 인가: 신규 가입자는 로그인 직후 온보딩을 먼저 거치므로 주소의
 *   `next` 로 넘기면 사라지고, 검색 결과 메타데이터는 쿠키 4KB 를 넘는다.
 * - 저장소는 사용자가 조작할 수 있는 값이다 → 읽을 때 `unknown` 으로 받고 형식을 검사한다.
 * - 사파리 비공개 모드 등에서는 접근 자체가 던진다 → 모든 접근을 try/catch 로 감싼다.
 */

export const PENDING_SHELF_KEY = "page0127:pending-shelf";
export const PENDING_SHELF_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PENDING_BOOKS = 20;
export const GOAL_MIN = 1;
export const GOAL_MAX = 1000;

export type PendingShelf = {
  v: 1;
  savedAt: number;
  books: PendingBook[];
  goal: PendingGoal | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isNullableString = (v: unknown): v is string | null =>
  v === null || typeof v === "string";

const NULLABLE_BOOK_FIELDS = [
  "provider_item_id",
  "author",
  "publisher",
  "cover_image",
  "spine_image",
  "pub_date",
  "category",
  "source",
] as const;

const isPendingBook = (v: unknown): v is PendingBook =>
  isRecord(v) &&
  typeof v.isbn === "string" &&
  v.isbn.length > 0 &&
  typeof v.title === "string" &&
  NULLABLE_BOOK_FIELDS.every((key) => isNullableString(v[key]));

export const isValidGoal = (v: unknown): v is PendingGoal =>
  isRecord(v) &&
  Number.isInteger(v.year) &&
  Number.isInteger(v.target) &&
  (v.target as number) >= GOAL_MIN &&
  (v.target as number) <= GOAL_MAX;

export const parsePendingShelf = (
  raw: unknown,
  now: number,
): PendingShelf | null => {
  if (!isRecord(raw) || raw.v !== 1) return null;
  if (typeof raw.savedAt !== "number") return null;
  if (now - raw.savedAt > PENDING_SHELF_TTL_MS) return null;
  if (!Array.isArray(raw.books) || raw.books.length > MAX_PENDING_BOOKS) {
    return null;
  }
  if (!raw.books.every(isPendingBook)) return null;
  if (raw.goal !== null && !isValidGoal(raw.goal)) return null;
  // 담을 것이 하나도 없으면 보관할 이유가 없다
  if (raw.books.length === 0 && raw.goal === null) return null;

  return {
    v: 1,
    savedAt: raw.savedAt,
    books: raw.books,
    goal: raw.goal,
  };
};

export const clearPendingShelf = (): void => {
  try {
    localStorage.removeItem(PENDING_SHELF_KEY);
  } catch {
    // 저장소에 못 닿으면 지울 것도 없다
  }
};

export const readPendingShelf = (now = Date.now()): PendingShelf | null => {
  let text: string | null;
  try {
    text = localStorage.getItem(PENDING_SHELF_KEY);
  } catch {
    return null;
  }
  if (text === null) return null;

  let parsed: PendingShelf | null = null;
  try {
    parsed = parsePendingShelf(JSON.parse(text), now);
  } catch {
    parsed = null;
  }
  // 깨졌거나 만료된 값은 남겨 둘 이유가 없다
  if (!parsed) clearPendingShelf();
  return parsed;
};

export const writePendingShelf = (
  input: { books: PendingBook[]; goal: PendingGoal | null },
  now = Date.now(),
): boolean => {
  const value: PendingShelf = {
    v: 1,
    savedAt: now,
    books: input.books.slice(0, MAX_PENDING_BOOKS),
    goal: input.goal,
  };
  try {
    localStorage.setItem(PENDING_SHELF_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
```

- [ ] **Step 5: 통과 확인**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model/pendingShelf.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 6: 커밋 지점** (사용자 요청 시)

```
✨ Feat: 로그인 너머로 고른 책을 들고 가는 임시 보관함을 만든다
```

---

### Task 2: 안내 문구 · 고르기 토글 · 기준 상수

**Files:**

- Create: `apps/page0127/src/shared/config/tasteAnalysis.ts`
- Modify: `apps/page0127/app/api/taste-analysis/analyze/route.ts` (79행 `books.length < 5`)
- Create: `apps/page0127/src/features/shelf-preview/model/previewMessage.ts`
- Create: `apps/page0127/src/features/shelf-preview/model/selection.ts`
- Test: `.../model/previewMessage.test.ts`, `.../model/selection.test.ts`

**Interfaces:**

- Consumes: `ShelfPick` (Task 1)
- Produces: `TASTE_ANALYSIS_MIN_BOOKS = 5` / `toShelfPreviewMessage(count: number): string | null` / `toggleSelection(list: ShelfPick[], pick: ShelfPick, max: number): ShelfPick[]`

- [ ] **Step 1: 상수 파일**

```ts
// apps/page0127/src/shared/config/tasteAnalysis.ts

/**
 * 취향 분석을 돌릴 수 있는 최소 권수 (완독 + 별점).
 * 분석 라우트와 홈 맛보기 문구가 같은 값을 봐야 "n권 더"가 거짓말이 되지 않는다.
 */
export const TASTE_ANALYSIS_MIN_BOOKS = 5;
```

- [ ] **Step 2: 분석 라우트가 상수를 쓰게 바꾼다**

`apps/page0127/app/api/taste-analysis/analyze/route.ts`

- import 추가(내부 alias 그룹): `import { TASTE_ANALYSIS_MIN_BOOKS } from '@/shared/config/tasteAnalysis';`
- 79행 `if (!books || books.length < 5) {` → `if (!books || books.length < TASTE_ANALYSIS_MIN_BOOKS) {`
- 81행 문구 `'분석을 위해 최소 5권의 완독한 책(별점 포함)이 필요합니다.'` → `` `분석을 위해 최소 ${TASTE_ANALYSIS_MIN_BOOKS}권의 완독한 책(별점 포함)이 필요합니다.` ``

- [ ] **Step 3: 실패하는 테스트**

```ts
// apps/page0127/src/features/shelf-preview/model/previewMessage.test.ts
import { describe, expect, it } from "vitest";

import { toShelfPreviewMessage } from "./previewMessage";

describe("toShelfPreviewMessage", () => {
  it("0권이면 문구가 없다(목표 흐름이 대신한다)", () => {
    expect(toShelfPreviewMessage(0)).toBeNull();
  });

  it("1~4권은 남은 권수를 말한다", () => {
    expect(toShelfPreviewMessage(1)).toBe(
      "4권만 더 모이면 취향 노트를 받아 볼 수 있어요.",
    );
    expect(toShelfPreviewMessage(4)).toBe(
      "1권만 더 모이면 취향 노트를 받아 볼 수 있어요.",
    );
  });

  it("5권 이상은 별점만 남았다고 말한다 — 고르기만 한 책엔 별점이 없다", () => {
    expect(toShelfPreviewMessage(5)).toBe(
      "별점만 매기면 바로 취향 노트를 받아 볼 수 있어요.",
    );
    expect(toShelfPreviewMessage(20)).toBe(
      "별점만 매기면 바로 취향 노트를 받아 볼 수 있어요.",
    );
  });
});
```

```ts
// apps/page0127/src/features/shelf-preview/model/selection.test.ts
import { describe, expect, it } from "vitest";

import { toggleSelection } from "./selection";

import type { ShelfPick } from "./types";

const pick = (isbn: string): ShelfPick => ({
  book: {
    isbn,
    provider_item_id: null,
    title: isbn,
    author: null,
    publisher: null,
    cover_image: null,
    spine_image: null,
    pub_date: null,
    category: null,
    source: null,
  },
  coverSrc: null,
  coverFallback: null,
  spineSrc: null,
});

describe("toggleSelection", () => {
  it("없으면 뒤에 붙인다(고른 순서대로 꽂힌다)", () => {
    expect(
      toggleSelection([pick("a")], pick("b"), 20).map((p) => p.book.isbn),
    ).toEqual(["a", "b"]);
  });

  it("같은 isbn 이면 뺀다 — 목록과 검색에서 같은 책을 골라도 한 번만", () => {
    const fromSearch = {
      ...pick("a"),
      coverSrc: "https://image.yes24.com/goods/1/L",
    };
    expect(
      toggleSelection([pick("a"), pick("b")], fromSearch, 20).map(
        (p) => p.book.isbn,
      ),
    ).toEqual(["b"]);
  });

  it("상한이면 더 붙이지 않는다(빼기는 된다)", () => {
    expect(
      toggleSelection([pick("a")], pick("b"), 1).map((p) => p.book.isbn),
    ).toEqual(["a"]);
    expect(toggleSelection([pick("a")], pick("a"), 1)).toEqual([]);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model`
Expected: FAIL — `./previewMessage`, `./selection` 해석 실패

- [ ] **Step 5: 구현**

```ts
// apps/page0127/src/features/shelf-preview/model/previewMessage.ts
import { TASTE_ANALYSIS_MIN_BOOKS } from "@/shared/config/tasteAnalysis";

/**
 * 책장 아래 한 줄 — 판단("~쪽으로 기울어 있다")이 아니라 다음 단계를 말한다.
 * 고르기만 한 책에는 별점이 없으므로 5권을 넘겨도 "바로 받는다"고 하지 않는다.
 */
export const toShelfPreviewMessage = (count: number): string | null => {
  if (count <= 0) return null;
  if (count < TASTE_ANALYSIS_MIN_BOOKS) {
    return `${TASTE_ANALYSIS_MIN_BOOKS - count}권만 더 모이면 취향 노트를 받아 볼 수 있어요.`;
  }
  return "별점만 매기면 바로 취향 노트를 받아 볼 수 있어요.";
};
```

```ts
// apps/page0127/src/features/shelf-preview/model/selection.ts
import type { ShelfPick } from "./types";

/** 같은 책(isbn)이 있으면 빼고, 없으면 상한 안에서 뒤에 붙인다 */
export const toggleSelection = (
  list: ShelfPick[],
  pick: ShelfPick,
  max: number,
): ShelfPick[] => {
  if (list.some((p) => p.book.isbn === pick.book.isbn)) {
    return list.filter((p) => p.book.isbn !== pick.book.isbn);
  }
  if (list.length >= max) return list;
  return [...list, pick];
};
```

- [ ] **Step 6: 통과 확인 + 타입 검사**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model` → PASS
Run: `npm --prefix $APP run type-check` → 에러 0

- [ ] **Step 7: 커밋 지점**

```
✨ Feat: 책장 맛보기 안내 문구와 고르기 규칙을 만든다

취향 분석 기준 5권을 상수로 꺼내 분석 라우트와 문구가 같은 값을 보게 한다.
```

---

### Task 3: 10권 조회 (`getShelfPicks`)

**Files:**

- Create: `apps/page0127/src/features/shelf-preview/config/picks.ts`
- Create: `apps/page0127/src/features/shelf-preview/model/toShelfPick.ts`
- Create: `apps/page0127/src/features/shelf-preview/api/getShelfPicks.ts`
- Test: `.../model/toShelfPick.test.ts`

**Interfaces:**

- Consumes: `ShelfPick`, `PendingBook` (Task 1), `toCoverSource` (`@/entities/book`), `toRenderableSrc` (`@/shared/lib/imageHost`), `ProviderBook` (`@/shared/api/book-provider`)
- Produces: `HOME_SHELF_PICK_ISBNS: readonly string[]` / `type PickRow` / `orderByIsbnList<T extends { isbn: string }>(rows: T[], order: readonly string[]): T[]` / `fromGlobalBookRow(row: PickRow, storageOrigin: string): ShelfPick` / `fromProviderBook(b: ProviderBook): ShelfPick` / `getShelfPicks(): Promise<ShelfPick[]>`

- [ ] **Step 1: 10권 목록**

```ts
// apps/page0127/src/features/shelf-preview/config/picks.ts

/**
 * 홈 맛보기에 내놓는 10권 (설계 문서 §4).
 *
 * 우리 랭킹을 쓰지 않는 이유: 독자가 아직 적어 상위권이 한 사람의 취향이다.
 * 처음 온 사람이 "읽은 책"을 하나라도 찾을 수 있게 대중적인 책을 장르를 섞어 골랐다.
 * isbn 은 global_books 조회 키일 뿐이다 — ISBN13 이 아닌 값(K코드·ISBN10)이 섞여 있다.
 */
export const HOME_SHELF_PICK_ISBNS = [
  "8936434594", // 채식주의자
  "8954682154", // 작별하지 않는다
  "9788998441012", // 모순
  "8936437976", // 대도시의 사랑법
  "8931005148", // 이방인
  "K782638449", // 동물농장
  "K732831392", // 세이노의 가르침
  "K222931412", // 마흔에 읽는 쇼펜하우어
  "9788965965046", // 도파민네이션
  "8901276534", // 나는 메트로폴리탄 미술관의 경비원입니다
] as const;
```

- [ ] **Step 2: 실패하는 테스트**

```ts
// apps/page0127/src/features/shelf-preview/model/toShelfPick.test.ts
import { describe, expect, it } from "vitest";

import {
  fromGlobalBookRow,
  fromProviderBook,
  orderByIsbnList,
} from "./toShelfPick";

import type { ProviderBook } from "@/shared/api/book-provider";

const STORAGE = "https://abc.supabase.co";

describe("orderByIsbnList", () => {
  it("목록 순서대로 세우고, 없는 isbn 은 건너뛴다", () => {
    const rows = [{ isbn: "c" }, { isbn: "a" }];
    expect(orderByIsbnList(rows, ["a", "b", "c"]).map((r) => r.isbn)).toEqual([
      "a",
      "c",
    ]);
  });

  it("DB 에 한 권도 없으면 빈 배열 — 개발 DB 에는 운영 책이 없을 수 있다", () => {
    expect(orderByIsbnList([], ["a"])).toEqual([]);
  });
});

describe("fromGlobalBookRow", () => {
  it("Storage 표지 + 상품번호면 YES24 를 먼저, Storage 를 대체로", () => {
    const pick = fromGlobalBookRow(
      {
        isbn: "8936434594",
        provider_item_id: "108422348",
        title: "채식주의자",
        author: "한강",
        publisher: "창비",
        cover_image: `${STORAGE}/storage/v1/object/public/covers/a.jpg`,
        spine_image: `${STORAGE}/storage/v1/object/public/spines/a.jpg`,
        pub_date: "2022-03-28",
        category: "소설",
        source: "yes24",
      },
      STORAGE,
    );
    expect(pick.coverSrc).toContain("image.yes24.com");
    expect(pick.coverFallback).toBe(
      `${STORAGE}/storage/v1/object/public/covers/a.jpg`,
    );
    expect(pick.spineSrc).toBe(
      `${STORAGE}/storage/v1/object/public/spines/a.jpg`,
    );
    // 저장할 때는 DB 원본 주소를 그대로 들고 간다
    expect(pick.book.cover_image).toBe(
      `${STORAGE}/storage/v1/object/public/covers/a.jpg`,
    );
  });

  it("그릴 수 없는 호스트(알라딘 잔존)는 화면 주소를 비운다", () => {
    const pick = fromGlobalBookRow(
      {
        isbn: "x",
        provider_item_id: null,
        title: "t",
        author: null,
        publisher: null,
        cover_image: "https://image.aladin.co.kr/a.jpg",
        spine_image: "https://image.aladin.co.kr/s.jpg",
        pub_date: null,
        category: null,
        source: null,
      },
      STORAGE,
    );
    expect(pick.coverSrc).toBeNull();
    expect(pick.spineSrc).toBeNull();
  });
});

describe("fromProviderBook", () => {
  it("검색 결과를 저장용 필드로 옮긴다", () => {
    const b = {
      isbn: "9788937462672",
      title: "페스트",
      subTitle: null,
      author: "알베르 카뮈",
      publisher: "민음사",
      pubDate: "2011-03-25",
      description: "",
      category: "소설",
      coverImage: "https://image.yes24.com/goods/4827619/L",
      spineImage: null,
      backImage: null,
      page: null,
      toc: null,
      dimensions: null,
      source: "yes24",
      providerItemId: "4827619",
      providerLink: "https://www.yes24.com/product/goods/4827619",
    } as ProviderBook;
    const pick = fromProviderBook(b);
    expect(pick.book).toEqual({
      isbn: "9788937462672",
      provider_item_id: "4827619",
      title: "페스트",
      author: "알베르 카뮈",
      publisher: "민음사",
      cover_image: "https://image.yes24.com/goods/4827619/L",
      spine_image: null,
      pub_date: "2011-03-25",
      category: "소설",
      source: "yes24",
    });
    expect(pick.coverSrc).toBe("https://image.yes24.com/goods/4827619/L");
  });
});
```

> `ProviderBook` 의 필드가 위와 다르면(`types.ts` 28~73행) 테스트 객체를 그 타입에 맞춘다 — `as ProviderBook` 은 누락 필드를 숨기므로 type-check 에서 경고가 없더라도 실제 필드명을 눈으로 대조할 것.

- [ ] **Step 3: 실패 확인**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model/toShelfPick.test.ts`
Expected: FAIL — `./toShelfPick` 해석 실패

- [ ] **Step 4: 변환 구현**

```ts
// apps/page0127/src/features/shelf-preview/model/toShelfPick.ts
import { toRenderableSrc } from "@/shared/lib/imageHost";

import { toCoverSource } from "@/entities/book";

import type { ProviderBook } from "@/shared/api/book-provider";
import type { ShelfPick } from "./types";

/** global_books 에서 읽는 열 — PendingBook 과 같은 이름이다 */
export type PickRow = {
  isbn: string;
  provider_item_id: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image: string | null;
  spine_image: string | null;
  pub_date: string | null;
  category: string | null;
  source: string | null;
};

/** `.in()` 조회는 순서를 보장하지 않는다 — 편집한 순서대로 다시 세운다 */
export const orderByIsbnList = <T extends { isbn: string }>(
  rows: T[],
  order: readonly string[],
): T[] =>
  order.flatMap((isbn) => rows.filter((r) => r.isbn === isbn).slice(0, 1));

/**
 * 화면 주소와 저장 정보를 나눠 든다.
 * - 화면: 그릴 수 있는 호스트만, YES24 먼저(toCoverSource)
 * - 저장: DB 원본 그대로 — POST /api/books 가 global_books 와 맞춰 쓴다
 */
export const fromGlobalBookRow = (
  row: PickRow,
  storageOrigin: string,
): ShelfPick => {
  const cover = toCoverSource({
    cover_image: toRenderableSrc(row.cover_image, storageOrigin),
    provider_item_id: row.provider_item_id,
  });
  return {
    book: { ...row },
    coverSrc: cover.src,
    coverFallback: cover.fallbackSrc,
    spineSrc: toRenderableSrc(row.spine_image, storageOrigin),
  };
};

export const fromProviderBook = (b: ProviderBook): ShelfPick => ({
  book: {
    isbn: b.isbn,
    provider_item_id: b.providerItemId,
    title: b.title,
    author: b.author || null,
    publisher: b.publisher || null,
    cover_image: b.coverImage || null,
    spine_image: b.spineImage,
    pub_date: b.pubDate,
    category: b.category || null,
    source: b.source,
  },
  coverSrc: b.coverImage || null,
  coverFallback: null,
  spineSrc: b.spineImage,
});
```

- [ ] **Step 5: 조회 구현 (server-only, 1시간 캐시)**

```ts
// apps/page0127/src/features/shelf-preview/api/getShelfPicks.ts
import { unstable_cache } from "next/cache";

import { createAnonClient } from "@/shared/config/supabase/anon";

import { HOME_SHELF_PICK_ISBNS } from "../config/picks";
import { fromGlobalBookRow, orderByIsbnList } from "../model/toShelfPick";

import type { PickRow } from "../model/toShelfPick";
import type { ShelfPick } from "../model/types";

import "server-only";

const PICK_COLUMNS =
  "isbn, provider_item_id, title, author, publisher, cover_image, spine_image, pub_date, category, source";

/**
 * 실패하면 던진다 — unstable_cache 는 던진 결과를 저장하지 않으므로
 * 일시 오류가 한 시간 동안 빈 그리드로 굳지 않는다 (widgets/about/api/aboutCache.ts 와 같은 이유).
 * 쿠키 없는 anon 클라이언트: 모든 방문자에게 같은 결과를 돌려주므로 세션이 섞이면 안 된다.
 */
const loadPicks = async (): Promise<ShelfPick[]> => {
  const { data, error } = await createAnonClient()
    .from("global_books")
    .select(PICK_COLUMNS)
    .in("isbn", [...HOME_SHELF_PICK_ISBNS]);
  if (error) throw new Error(error.message);

  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return orderByIsbnList(
    (data as PickRow[] | null) ?? [],
    HOME_SHELF_PICK_ISBNS,
  ).map((row) => fromGlobalBookRow(row, storage));
};

const cachedPicks = unstable_cache(loadPicks, ["shelf-preview", "picks"], {
  revalidate: 3600,
});

/** 그리드가 비어도 검색·목표로 이어지므로 실패는 빈 목록으로 삼킨다 */
export const getShelfPicks = async (): Promise<ShelfPick[]> => {
  try {
    return await cachedPicks();
  } catch (error) {
    console.error(
      "[shelf-preview] 10권 조회 실패:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
};
```

- [ ] **Step 6: 통과 확인**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model` → PASS
Run: `npm --prefix $APP run type-check` → 에러 0

- [ ] **Step 7: 커밋 지점**

```
✨ Feat: 홈 맛보기에 내놓을 10권을 global_books 에서 읽는다
```

---

### Task 4: 고르기 그리드 + 책장 + 저장 (`ShelfPreview`)

**Files:**

- Modify: `apps/page0127/src/shared/lib/analytics/trackEvent.ts` (`AnalyticsEvent` 유니온)
- Create: `apps/page0127/src/features/shelf-preview/ui/PreviewShelf.tsx`
- Create: `apps/page0127/src/features/shelf-preview/ui/ShelfPreview.tsx`

**Interfaces:**

- Consumes: Task 1~3 전부
- Produces: `<ShelfPreview picks={ShelfPick[]} />` — Task 5·6 이 이 파일의 `{/* SEARCH_SLOT */}`·`{/* GOAL_SLOT */}` 자리에 끼운다

- [ ] **Step 1: GA 이벤트 추가**

`trackEvent.ts` 의 `AnalyticsEvent` 유니온 맨 앞 `'cta_click'` 줄 다음(랜딩 단계)에 추가하고, 위 주석의 깔때기 표 `랜딩` 줄에 `shelf_preview_*` 를 덧붙인다:

```ts
  /** 홈 맛보기에서 책을 골랐다. source: 'picks' | 'search', count: 고른 뒤 권수 */
  | 'shelf_preview_pick'
  /** 맛보기 [책장 저장하기] — 로그인으로 간다. count: 고른 권수 */
  | 'shelf_preview_save'
  /** 맛보기 0권 [목표 저장하기] — 로그인으로 간다. target: 목표 권수 */
  | 'shelf_preview_goal'
```

- [ ] **Step 2: 책장 줄**

```tsx
// apps/page0127/src/features/shelf-preview/ui/PreviewShelf.tsx
import { CoverImage } from "@repo/ui";

import type { ShelfPick } from "../model/types";

type PreviewShelfProps = { picks: ShelfPick[] };

/** 같은 색이 줄지으면 책장이 아니라 막대그래프처럼 보인다 */
const BLANK_TONES = [
  "bg-text-subtle/40",
  "bg-primary/40",
  "bg-text-strong/30",
] as const;

const BlankSpine = ({ index }: { index: number }) => (
  <span
    className={`block h-full w-6 rounded-sm ${BLANK_TONES[index % BLANK_TONES.length]}`}
  />
);

/**
 * 고른 순서대로 책등을 세운다. 책등이 없거나 못 불러온 책은 색 막대로 선다.
 * 스크린리더는 위 그리드의 aria-pressed 로 이미 상태를 안다 → 장식으로 숨긴다.
 */
export const PreviewShelf = ({ picks }: PreviewShelfProps) => (
  <ul
    aria-hidden="true"
    className="flex h-28 items-end gap-1 overflow-x-auto border-b-8 border-accent px-1"
  >
    {picks.map((pick, i) => (
      <li
        key={pick.book.isbn}
        className="h-full shrink-0 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
      >
        <CoverImage
          src={pick.spineSrc}
          alt=""
          width={30}
          height={112}
          fallback={<BlankSpine index={i} />}
          className="h-full w-auto rounded-sm object-contain"
        />
      </li>
    ))}
  </ul>
);
```

> `animate-in`/`slide-in-from-bottom-4` 는 레포에 이미 있는 `tw-animate-css` 유틸이다.

- [ ] **Step 3: 섹션 본체**

```tsx
// apps/page0127/src/features/shelf-preview/ui/ShelfPreview.tsx
"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button, CoverImage } from "@repo/ui";
import { Check } from "lucide-react";

import { trackEvent } from "@/shared/lib/analytics/trackEvent";

import { MAX_PENDING_BOOKS, writePendingShelf } from "../model/pendingShelf";
import { toShelfPreviewMessage } from "../model/previewMessage";
import { toggleSelection } from "../model/selection";
import { PreviewShelf } from "./PreviewShelf";

import type { ShelfPick } from "../model/types";

type ShelfPreviewProps = { picks: ShelfPick[] };

/**
 * 홈 '책장 맛보기' — 고르면 내 책장이 그려지고, 저장은 로그인으로 이어진다.
 *
 * 학습 포인트:
 * - 가입을 "부탁"하지 않는다. 이미 만든 책장을 "저장"하려고 가입하게 한다.
 * - 보관에 실패해도(비공개 모드 등) 로그인은 진행한다 — 빈 서재로 시작할 뿐이다.
 */
export const ShelfPreview = ({ picks }: ShelfPreviewProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ShelfPick[]>([]);

  const isFull = selected.length >= MAX_PENDING_BOOKS;
  const message = toShelfPreviewMessage(selected.length);
  const isSelected = (isbn: string) =>
    selected.some((p) => p.book.isbn === isbn);

  const handleToggle = (pick: ShelfPick, source: "picks" | "search") => {
    const next = toggleSelection(selected, pick, MAX_PENDING_BOOKS);
    // 해제는 세지 않는다 — "고르는 행동"이 일어났는지만 본다
    if (next.length > selected.length) {
      trackEvent("shelf_preview_pick", { source, count: next.length });
    }
    setSelected(next);
  };

  const handleSave = () => {
    trackEvent("shelf_preview_save", { count: selected.length });
    writePendingShelf({ books: selected.map((p) => p.book), goal: null });
    router.push("/login");
  };

  return (
    <section
      aria-labelledby="shelf-preview-title"
      className="rounded-2xl border border-line-soft p-6 md:p-10"
    >
      <h2
        id="shelf-preview-title"
        className="heading-2 break-keep text-text-strong"
      >
        읽은 책을 골라 보세요.
      </h2>
      <p className="mt-2 break-keep text-sm text-text-subtle">
        고른 책이 내 책장에 꽂혀요. 한 권도 없어도 괜찮아요.
      </p>

      {picks.length > 0 && (
        <ul className="mt-6 grid grid-cols-5 gap-2 md:grid-cols-10 md:gap-3">
          {picks.map((pick) => {
            const on = isSelected(pick.book.isbn);
            return (
              <li key={pick.book.isbn}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={pick.book.title}
                  disabled={!on && isFull}
                  onClick={() => handleToggle(pick, "picks")}
                  className={`relative block w-full overflow-hidden rounded-md transition focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40 ${
                    on ? "ring-2 ring-primary" : "hover:opacity-90"
                  }`}
                >
                  <CoverImage
                    src={pick.coverSrc}
                    fallbackSrc={pick.coverFallback}
                    alt=""
                    width={96}
                    height={144}
                    fallback={
                      <span className="flex aspect-[2/3] items-center justify-center bg-sunken p-1 text-[10px] text-text-subtle">
                        {pick.book.title}
                      </span>
                    }
                    className="aspect-[2/3] h-auto w-full object-cover"
                  />
                  {on && (
                    <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                      <Check aria-hidden="true" className="size-3" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* SEARCH_SLOT — Task 5 */}

      <div className="mt-8">
        {selected.length > 0 ? (
          <>
            <h3 className="text-sm font-medium text-text-subtle">내 책장</h3>
            <div className="mt-2">
              <PreviewShelf picks={selected} />
            </div>
            <p
              aria-live="polite"
              className="mt-4 break-keep font-medium text-text-strong"
            >
              {message}
            </p>
            {isFull && (
              <p className="mt-1 text-xs text-text-subtle">
                한 번에 {MAX_PENDING_BOOKS}권까지 꽂을 수 있어요.
              </p>
            )}
            <Button size="lg" className="mt-4 px-8" onClick={handleSave}>
              책장 저장하기
            </Button>
          </>
        ) : (
          <>{/* GOAL_SLOT — Task 6 */}</>
        )}
      </div>
    </section>
  );
};
```

- [ ] **Step 4: 검사**

Run: `npm --prefix $APP run type-check` → 에러 0
Run: `npm --prefix $APP run lint` → 새 파일에 에러·경고 0

- [ ] **Step 5: 커밋 지점**

```
✨ Feat: 읽은 책을 고르면 책장에 꽂히는 맛보기 섹션을 만든다
```

---

### Task 5: 다른 책 찾기 (`ShelfSearch`)

**Files:**

- Create: `apps/page0127/src/features/shelf-preview/ui/ShelfSearch.tsx`
- Modify: `apps/page0127/src/features/shelf-preview/ui/ShelfPreview.tsx` (`{/* SEARCH_SLOT — Task 5 */}`)

**Interfaces:**

- Consumes: `searchBooks(query, { maxResults })` (`@/shared/api/book`), `fromProviderBook` (Task 3)
- Produces: `<ShelfSearch isSelected={(isbn: string) => boolean} disabled={boolean} onPick={(pick: ShelfPick) => void} />`

- [ ] **Step 1: 구현**

```tsx
// apps/page0127/src/features/shelf-preview/ui/ShelfSearch.tsx
"use client";

import { useState } from "react";

import { Button, CoverImage, Input } from "@repo/ui";
import { Check, Search } from "lucide-react";

import { searchBooks } from "@/shared/api/book";

import { fromProviderBook } from "../model/toShelfPick";

import type { ShelfPick } from "../model/types";

type ShelfSearchProps = {
  isSelected: (isbn: string) => boolean;
  /** 상한에 닿았으면 새로 고를 수 없다(이미 고른 책 빼기는 된다) */
  disabled: boolean;
  onPick: (pick: ShelfPick) => void;
};

type Status = "idle" | "loading" | "done" | "error";

/** 목록에 없는 책 — 기존 검색 API(로그인 없이 열려 있음, 레이트 리밋만)를 쓴다 */
export const ShelfSearch = ({
  isSelected,
  disabled,
  onPick,
}: ShelfSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<ShelfPick[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setStatus("loading");
    try {
      const { items } = await searchBooks(q, { maxResults: 8 });
      setResults(items.map(fromProviderBook));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        목록에 없나요? 다른 책 찾기
      </button>
    );
  }

  return (
    <div className="mt-4">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex max-w-md gap-2"
      >
        <Input
          aria-label="책 제목이나 저자"
          placeholder="책 제목이나 저자"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type="submit" variant="outline" disabled={status === "loading"}>
          <Search aria-hidden="true" className="size-4" />
          찾기
        </Button>
      </form>

      <div aria-live="polite" className="mt-3">
        {status === "loading" && (
          <p className="text-sm text-text-subtle">찾는 중…</p>
        )}
        {status === "error" && (
          <p className="text-sm text-text-subtle">
            지금은 검색할 수 없어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
        {status === "done" && results.length === 0 && (
          <p className="text-sm text-text-subtle">검색 결과가 없어요.</p>
        )}
      </div>

      {results.length > 0 && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {results.map((pick) => {
            const on = isSelected(pick.book.isbn);
            return (
              <li key={pick.book.isbn}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={!on && disabled}
                  onClick={() => onPick(pick)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition disabled:opacity-40 ${
                    on ? "border-primary" : "border-line-soft hover:bg-sunken"
                  }`}
                >
                  <CoverImage
                    src={pick.coverSrc}
                    alt=""
                    width={36}
                    height={54}
                    className="h-[54px] w-9 shrink-0 rounded-sm object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-strong">
                      {pick.book.title}
                    </span>
                    <span className="block truncate text-xs text-text-subtle">
                      {pick.book.author}
                    </span>
                  </span>
                  {on && (
                    <Check aria-hidden="true" className="size-4 text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
```

- [ ] **Step 2: 섹션에 끼우기**

`ShelfPreview.tsx`:

- import 추가(상대 그룹): `import { ShelfSearch } from './ShelfSearch';`
- `{/* SEARCH_SLOT — Task 5 */}` 를 다음으로 바꾼다:

```tsx
<ShelfSearch
  isSelected={isSelected}
  disabled={isFull}
  onPick={(pick) => handleToggle(pick, "search")}
/>
```

- [ ] **Step 3: 검사**

Run: `npm --prefix $APP run type-check` → 에러 0
Run: `npm --prefix $APP run lint` → 새 파일 에러·경고 0

- [ ] **Step 4: 커밋 지점**

```
✨ Feat: 맛보기 목록에 없는 책은 검색해서 꽂을 수 있게 한다
```

---

### Task 6: 0권 목표 (`GoalStarter`)

**Files:**

- Create: `apps/page0127/src/features/shelf-preview/ui/GoalStarter.tsx`
- Modify: `apps/page0127/src/features/shelf-preview/ui/ShelfPreview.tsx` (`<>{/* GOAL_SLOT — Task 6 */}</>`)

**Interfaces:**

- Consumes: `writePendingShelf`, `GOAL_MIN`, `GOAL_MAX` (Task 1), `trackEvent`
- Produces: `<GoalStarter />` (props 없음)

- [ ] **Step 1: 구현**

```tsx
// apps/page0127/src/features/shelf-preview/ui/GoalStarter.tsx
"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@repo/ui";
import { Minus, Plus } from "lucide-react";

import { trackEvent } from "@/shared/lib/analytics/trackEvent";

import { GOAL_MAX, GOAL_MIN, writePendingShelf } from "../model/pendingShelf";

/** 한 달에 한 권 — 처음 정하는 사람에게 부담 없는 기본값 */
const DEFAULT_GOAL = 12;

/** 0권인 방문자의 다음 행동 — 막다른 길 대신 "오늘부터" 를 준다 */
export const GoalStarter = () => {
  const router = useRouter();
  const [target, setTarget] = useState(DEFAULT_GOAL);
  const year = new Date().getFullYear();

  const change = (delta: number) =>
    setTarget((t) => Math.min(GOAL_MAX, Math.max(GOAL_MIN, t + delta)));

  const handleSave = () => {
    trackEvent("shelf_preview_goal", { target });
    writePendingShelf({ books: [], goal: { year, target } });
    router.push("/login");
  };

  return (
    <div>
      <p className="break-keep font-medium text-text-strong">
        아직 없어도 괜찮아요. 오늘부터 시작해요.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-text-subtle">{year}년 목표</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="목표 한 권 줄이기"
          disabled={target <= GOAL_MIN}
          onClick={() => change(-1)}
        >
          <Minus aria-hidden="true" className="size-4" />
        </Button>
        <output
          aria-live="polite"
          className="min-w-14 text-center text-lg font-bold text-text-strong"
        >
          {target}권
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="목표 한 권 늘리기"
          disabled={target >= GOAL_MAX}
          onClick={() => change(1)}
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <Button size="lg" className="mt-4 px-8" onClick={handleSave}>
        목표 저장하기
      </Button>
    </div>
  );
};
```

- [ ] **Step 2: 섹션에 끼우기**

`ShelfPreview.tsx`:

- import 추가: `import { GoalStarter } from './GoalStarter';`
- `<>{/* GOAL_SLOT — Task 6 */}</>` → `<GoalStarter />`

- [ ] **Step 3: 검사**

Run: `npm --prefix $APP run type-check` → 에러 0
Run: `npm --prefix $APP run lint` → 새 파일 에러·경고 0

- [ ] **Step 4: 커밋 지점**

```
✨ Feat: 읽은 책이 없으면 올해 목표부터 정하게 한다
```

---

### Task 7: 담기 규칙 + 목표 서버 액션

**Files:**

- Create: `apps/page0127/src/features/shelf-preview/model/claim.ts`
- Test: `apps/page0127/src/features/shelf-preview/model/claim.test.ts`
- Create: `apps/page0127/src/features/shelf-preview/api/claimReadingGoalAction.ts`

**Interfaces:**

- Consumes: `PendingBook`, `PendingGoal`, `isValidGoal` (Task 1), `BookInput` (`@/entities/book`)
- Produces: `toBookInput(p: PendingBook): BookInput` / `claimPendingBooks(books: PendingBook[], deps: ClaimDeps): Promise<ClaimResult>` (`ClaimDeps = { findExisting: (b) => Promise<boolean>; create: (b) => Promise<void> }`, `ClaimResult = { added: number; skipped: number; failed: number }`) / `shouldClaimGoal(current: unknown, year: number): boolean` / `toClaimToast(added: number, goalSet: boolean): string | null` / `claimReadingGoalAction(goal: PendingGoal): Promise<boolean>`

- [ ] **Step 1: 실패하는 테스트**

```ts
// apps/page0127/src/features/shelf-preview/model/claim.test.ts
import { describe, expect, it, vi } from "vitest";

import {
  claimPendingBooks,
  shouldClaimGoal,
  toBookInput,
  toClaimToast,
} from "./claim";

import type { PendingBook } from "./types";

const book = (isbn: string, over: Partial<PendingBook> = {}): PendingBook => ({
  isbn,
  provider_item_id: null,
  title: isbn,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  pub_date: null,
  category: null,
  source: null,
  ...over,
});

describe("toBookInput", () => {
  it("완독으로 담고, null 은 생략(undefined)으로 바꾼다 — BookInput 의 선택 필드는 string 만 받는다", () => {
    expect(
      toBookInput(
        book("1", { author: "한강", provider_item_id: "9", spine_image: null }),
      ),
    ).toEqual({
      isbn: "1",
      title: "1",
      provider_item_id: "9",
      source: null,
      author: "한강",
      publisher: undefined,
      cover_image: undefined,
      spine_image: null,
      pub_date: undefined,
      category: undefined,
      status: "completed",
    });
  });
});

describe("claimPendingBooks", () => {
  it("이미 서재에 있는 책은 건너뛴다 — 기존 사용자가 이 흐름으로 로그인한 경우", async () => {
    const create = vi.fn(async () => undefined);
    const result = await claimPendingBooks([book("a"), book("b")], {
      findExisting: async (b) => b.isbn === "a",
      create,
    });
    expect(result).toEqual({ added: 1, skipped: 1, failed: 0 });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("한 권이 실패해도 나머지는 담는다", async () => {
    const result = await claimPendingBooks([book("a"), book("b"), book("c")], {
      findExisting: async () => false,
      create: async (b) => {
        if (b.isbn === "b") throw new Error("500");
      },
    });
    expect(result).toEqual({ added: 2, skipped: 0, failed: 1 });
  });

  it("고른 순서대로 담는다(활동 기록 순서)", async () => {
    const order: string[] = [];
    await claimPendingBooks([book("a"), book("b")], {
      findExisting: async () => false,
      create: async (b) => void order.push(b.isbn),
    });
    expect(order).toEqual(["a", "b"]);
  });
});

describe("shouldClaimGoal", () => {
  it("비어 있으면 넣는다 — null, 컬럼 기본값 {}, target 없음", () => {
    expect(shouldClaimGoal(null, 2026)).toBe(true);
    expect(shouldClaimGoal({}, 2026)).toBe(true);
    expect(shouldClaimGoal({ year: 2026 }, 2026)).toBe(true);
  });

  it("지난해 목표만 있으면 올해 것을 넣는다", () => {
    expect(shouldClaimGoal({ year: 2025, target: 30 }, 2026)).toBe(true);
  });

  it("올해 목표가 이미 있으면 덮지 않는다", () => {
    expect(shouldClaimGoal({ year: 2026, target: 30 }, 2026)).toBe(false);
  });
});

describe("toClaimToast", () => {
  it("담은 것만 말한다", () => {
    expect(toClaimToast(3, false)).toBe("3권을 서재에 꽂았어요.");
    expect(toClaimToast(0, true)).toBe("올해 독서 목표를 정했어요.");
    expect(toClaimToast(2, true)).toBe(
      "2권을 서재에 꽂고 올해 독서 목표를 정했어요.",
    );
    expect(toClaimToast(0, false)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model/claim.test.ts`
Expected: FAIL — `./claim` 해석 실패

- [ ] **Step 3: 구현**

```ts
// apps/page0127/src/features/shelf-preview/model/claim.ts
import type { BookInput } from "@/entities/book";
import type { PendingBook } from "./types";

export type ClaimDeps = {
  /** 이미 서재에 있으면 true */
  findExisting: (b: PendingBook) => Promise<boolean>;
  create: (b: PendingBook) => Promise<void>;
};

export type ClaimResult = { added: number; skipped: number; failed: number };

/**
 * 완독으로 담는다. 완독일은 모르므로 비워 둔다(지어내지 않는다).
 * BookInput 의 선택 필드는 `string | undefined` 라 null 을 undefined 로 바꾼다.
 * spine_image 만은 null 을 받는다(명시적으로 비우는 값).
 */
export const toBookInput = (p: PendingBook): BookInput => ({
  isbn: p.isbn,
  title: p.title,
  provider_item_id: p.provider_item_id,
  source: p.source,
  author: p.author ?? undefined,
  publisher: p.publisher ?? undefined,
  cover_image: p.cover_image ?? undefined,
  spine_image: p.spine_image,
  pub_date: p.pub_date ?? undefined,
  category: p.category ?? undefined,
  status: "completed",
});

/**
 * 한 권씩 차례로 담는다 — 병렬로 쏘면 활동 순서가 섞이고 레이트 리밋에 걸린다.
 * 한 권의 실패가 나머지를 막지 않는다.
 */
export const claimPendingBooks = async (
  books: PendingBook[],
  deps: ClaimDeps,
): Promise<ClaimResult> => {
  const result: ClaimResult = { added: 0, skipped: 0, failed: 0 };
  for (const b of books) {
    try {
      if (await deps.findExisting(b)) {
        result.skipped += 1;
        continue;
      }
      await deps.create(b);
      result.added += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
};

/**
 * 올해 목표가 이미 있으면 덮지 않는다.
 * ⚠️ 컬럼 기본값이 `'{}'` 다 — null 만 비었다고 보면 기본값 사용자를 "목표 있음"으로 오판한다.
 */
export const shouldClaimGoal = (current: unknown, year: number): boolean => {
  if (typeof current !== "object" || current === null) return true;
  const goal = current as { year?: unknown; target?: unknown };
  if (typeof goal.target !== "number") return true;
  return goal.year !== year;
};

export const toClaimToast = (
  added: number,
  goalSet: boolean,
): string | null => {
  if (added > 0 && goalSet) {
    return `${added}권을 서재에 꽂고 올해 독서 목표를 정했어요.`;
  }
  if (added > 0) return `${added}권을 서재에 꽂았어요.`;
  if (goalSet) return "올해 독서 목표를 정했어요.";
  return null;
};
```

- [ ] **Step 4: 서버 액션**

```ts
// apps/page0127/src/features/shelf-preview/api/claimReadingGoalAction.ts
"use server";

import { createClient } from "@/shared/config/supabase/server";

import { shouldClaimGoal } from "../model/claim";
import { isValidGoal } from "../model/pendingShelf";

import type { PendingGoal } from "../model/types";

/**
 * 맛보기에서 정한 목표를 넣는다 — 올해 목표가 비어 있을 때만.
 *
 * 기존 updateReadingGoalAction 을 쓰지 않는 이유: 그쪽은 설정 화면용이라 무조건 덮어쓴다.
 * 학습 포인트: 서버 액션 인자는 클라이언트가 보낸 값이다 → 여기서 다시 검증한다.
 */
export const claimReadingGoalAction = async (
  goal: PendingGoal,
): Promise<boolean> => {
  if (!isValidGoal(goal)) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("reading_goal")
    .eq("id", user.id)
    .single();
  if (readError) {
    console.error("맛보기 목표 조회 실패:", readError.message);
    return false;
  }
  if (!shouldClaimGoal(profile?.reading_goal, goal.year)) return false;

  const { error } = await supabase
    .from("profiles")
    .update({
      reading_goal: { year: goal.year, target: goal.target },
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    console.error("맛보기 목표 저장 실패:", error.message);
    return false;
  }
  return true;
};
```

- [ ] **Step 5: 통과 확인**

Run: `npm --prefix $APP run test -- src/features/shelf-preview/model/claim.test.ts` → PASS
Run: `npm --prefix $APP run type-check` → 에러 0

- [ ] **Step 6: 커밋 지점**

```
✨ Feat: 맛보기에서 고른 책과 목표를 서재에 담는 규칙을 만든다

이미 있는 책은 건너뛰고, 올해 목표가 있으면 덮지 않는다. 컬럼 기본값 '{}' 도 빈 목표로 본다.
```

---

### Task 8: 로그인 후 담기 (`PendingShelfClaimer`)

**Files:**

- Create: `apps/page0127/src/features/shelf-preview/ui/PendingShelfClaimer.tsx`
- Modify: `apps/page0127/src/widgets/AppShell/ui/AppShellLayout.tsx`

**Interfaces:**

- Consumes: `readPendingShelf`, `clearPendingShelf` (Task 1), `claimPendingBooks`, `toBookInput`, `toClaimToast` (Task 7), `claimReadingGoalAction` (Task 7), `bookApi.getBookByISBN(isbn, providerItemId)`, `bookApi.createBook(input)` (`@/entities/book`)
- Produces: `<PendingShelfClaimer />` (props 없음, 아무것도 그리지 않음)

- [ ] **Step 1: 구현**

```tsx
// apps/page0127/src/features/shelf-preview/ui/PendingShelfClaimer.tsx
"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { bookApi } from "@/entities/book";

import { claimReadingGoalAction } from "../api/claimReadingGoalAction";
import { claimPendingBooks, toBookInput, toClaimToast } from "../model/claim";
import { clearPendingShelf, readPendingShelf } from "../model/pendingShelf";

/**
 * 로그인 후, 맛보기에서 들고 온 책·목표를 서재에 담는다. 화면에는 아무것도 그리지 않는다.
 *
 * 학습 포인트:
 * - 읽자마자 **먼저 지운다**. React StrictMode 는 개발에서 effect 를 두 번 돌리고,
 *   사용자는 탭을 두 개 열 수 있다 — 지우기 전에 담기를 시작하면 두 번 담긴다.
 * - 온보딩((onboarding) 그룹)은 AppShell 밖이라 여기서 실행되지 않는다.
 *   아이디가 정해진 뒤 서재에서 담겨야 활동 기록이 맞는 주소로 남는다.
 */
export const PendingShelfClaimer = () => {
  const router = useRouter();

  useEffect(() => {
    const pending = readPendingShelf();
    if (!pending) return;
    clearPendingShelf();

    const run = async () => {
      const { added } = await claimPendingBooks(pending.books, {
        findExisting: async (b) =>
          (await bookApi.getBookByISBN(b.isbn, b.provider_item_id)).length > 0,
        create: async (b) => {
          await bookApi.createBook(toBookInput(b));
        },
      });
      const goalSet = pending.goal
        ? await claimReadingGoalAction(pending.goal)
        : false;

      const message = toClaimToast(added, goalSet);
      if (message) toast.success(message);
      if (added > 0 || goalSet) router.refresh();
    };
    void run();
  }, [router]);

  return null;
};
```

- [ ] **Step 2: 셸에 마운트**

`AppShellLayout.tsx`:

- import 추가(`@/` 그룹, `@/widgets/Gnb` 위): `import { PendingShelfClaimer } from '@/features/shelf-preview/ui/PendingShelfClaimer';`
- `{user && <BottomTabBar username={user.username} />}` 다음 줄에:

```tsx
{
  /* 홈 맛보기에서 고른 책·목표를 로그인 직후 서재에 담는다 (보관분이 없으면 아무 일도 안 한다) */
}
{
  user && <PendingShelfClaimer />;
}
```

- [ ] **Step 3: 검사**

Run: `npm --prefix $APP run type-check` → 에러 0
Run: `npm --prefix $APP run lint` → 에러·경고 0 (FSD 경계 린트가 widgets → features import 를 허용하는지 함께 확인)

- [ ] **Step 4: 수동 확인 (로컬 세션 — 메모리 `env-local-session-for-verification` 방식)**

1. `npm --prefix $APP run dev`
2. 비로그인 브라우저에서 개발자 도구 콘솔로 보관분을 직접 넣는다(개발 DB 에 10권이 없을 수 있으므로):
   `localStorage.setItem('page0127:pending-shelf', JSON.stringify({v:1,savedAt:Date.now(),books:[{isbn:'9788937462672',provider_item_id:'4827619',title:'페스트',author:'알베르 카뮈',publisher:'민음사',cover_image:'https://image.yes24.com/goods/4827619/L',spine_image:null,pub_date:'2011-03-25',category:'소설',source:'yes24'}],goal:null}))`
3. magiclink 세션으로 로그인 → 서재 도착 시 토스트 "1권을 서재에 꽂았어요." + 서재에 페스트(완독)
4. 새로고침 → 토스트가 다시 뜨지 않고 페스트가 **한 권뿐**인지 확인 (Review Focus 5)
5. 같은 보관분을 다시 넣고 새로고침 → 토스트 없음(이미 있음으로 건너뜀) (Review Focus 2)

- [ ] **Step 5: 커밋 지점**

```
✨ Feat: 로그인하면 맛보기에서 고른 책과 목표를 서재에 담는다
```

---

### Task 9: 홈 배치 + e2e

**Files:**

- Create: `apps/page0127/src/features/shelf-preview/ui/ShelfPreviewSection.tsx`
- Modify: `apps/page0127/app/(public)/page.tsx` (100행 `<h1 className='sr-only'>` 바로 아래)
- Create: `apps/page0127/e2e/home-shelf-preview.spec.ts`

**Interfaces:**

- Consumes: `getShelfPicks` (Task 3), `ShelfPreview` (Task 4)
- Produces: `<ShelfPreviewSection />` (async server component)

- [ ] **Step 1: 서버 래퍼**

```tsx
// apps/page0127/src/features/shelf-preview/ui/ShelfPreviewSection.tsx
import { getShelfPicks } from "../api/getShelfPicks";
import { ShelfPreview } from "./ShelfPreview";

/** 10권은 서버에서 읽고(캐시), 고르기는 클라이언트가 한다 */
export const ShelfPreviewSection = async () => {
  const picks = await getShelfPicks();
  return <ShelfPreview picks={picks} />;
};
```

- [ ] **Step 2: 홈에 배치**

`app/(public)/page.tsx`:

- import 추가(`@/features` 는 `@/shared` 다음, `@/widgets` 앞): `import { ShelfPreviewSection } from '@/features/shelf-preview/ui/ShelfPreviewSection';`
- `<h1 className='sr-only'>…</h1>` 바로 다음, 히어로 배너 주석 앞에:

```tsx
{
  /* 책장 맛보기 — 처음 온 사람에게 가입할 이유를 "겪게" 한다 (설계: 2026-10-08-home-shelf-preview-design.md)
            로그인한 사람에게 "읽은 책을 골라 보세요"는 맞지 않으므로 비로그인에게만.
            조회가 실패해도 빈 그리드로 그려지고 검색·목표는 남는다 */
}
{
  !user && (
    <Suspense
      fallback={
        <div className="min-h-80 animate-pulse rounded-2xl border border-line-soft bg-sunken" />
      }
    >
      <ShelfPreviewSection />
    </Suspense>
  );
}
```

- [ ] **Step 3: e2e 작성**

```ts
// apps/page0127/e2e/home-shelf-preview.spec.ts
import { expect, test } from "@playwright/test";

/**
 * 홈 책장 맛보기 — 비로그인 흐름 (설계: docs/superpowers/specs/2026-10-08-home-shelf-preview-design.md)
 * 10권은 운영 global_books 기준이라 개발·CI DB 에는 없을 수 있다 → 그리드가 비면 그 갈래를 건너뛴다.
 */

const section = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "읽은 책을 골라 보세요." });

test("0권이면 목표 흐름이 보이고, 저장하면 로그인으로 가며 목표를 보관한다", async ({
  page,
}) => {
  await page.goto("/");
  const s = section(page);
  await expect(s).toBeVisible();
  await expect(
    s.getByText("아직 없어도 괜찮아요. 오늘부터 시작해요."),
  ).toBeVisible();

  await s.getByRole("button", { name: "목표 한 권 늘리기" }).click();
  await expect(s.getByText("13권")).toBeVisible();

  await s.getByRole("button", { name: "목표 저장하기" }).click();
  await expect(page).toHaveURL(/\/login/);
  const stored = await page.evaluate(() =>
    localStorage.getItem("page0127:pending-shelf"),
  );
  expect(JSON.parse(stored ?? "{}").goal.target).toBe(13);
});

test("책을 고르면 책장에 꽂히고 남은 권수를 말하며, 저장하면 보관한다", async ({
  page,
}) => {
  await page.goto("/");
  const s = section(page);
  const picks = s.getByRole("list").first().getByRole("button");
  const count = await picks.count();
  test.skip(count < 2, "이 DB 에는 맛보기 10권이 없다(운영 데이터)");

  await picks.nth(0).click();
  await picks.nth(1).click();
  await expect(picks.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(
    s.getByText("3권만 더 모이면 취향 노트를 받아 볼 수 있어요."),
  ).toBeVisible();

  // 같은 책을 다시 누르면 빠진다
  await picks.nth(1).click();
  await expect(
    s.getByText("4권만 더 모이면 취향 노트를 받아 볼 수 있어요."),
  ).toBeVisible();

  await s.getByRole("button", { name: "책장 저장하기" }).click();
  await expect(page).toHaveURL(/\/login/);
  const stored = await page.evaluate(() =>
    localStorage.getItem("page0127:pending-shelf"),
  );
  expect(JSON.parse(stored ?? "{}").books).toHaveLength(1);
});

test("다른 책 찾기를 펼치면 검색창이 나온다", async ({ page }) => {
  await page.goto("/");
  const s = section(page);
  await s.getByRole("button", { name: "목록에 없나요? 다른 책 찾기" }).click();
  await expect(
    s
      .getByRole("searchbox", { name: "책 제목이나 저자" })
      .or(s.getByRole("textbox", { name: "책 제목이나 저자" })),
  ).toBeVisible();
});
```

> 로그인 사용자 홈에 섹션이 **없는지**는 로그인 세션이 필요해 이 파일에서 다루지 않는다 — `page.tsx` 의 `!user` 조건으로 보장하고 Task 8 수동 확인 때 홈도 함께 열어 본다.
> `<section aria-labelledby>` 는 이름이 있으므로 `region` 역할을 갖는다. 다른 랜딩 섹션과 이름이 겹치지 않는다.

- [ ] **Step 4: 실행**

Run: `npm --prefix $APP run test:e2e -- e2e/home-shelf-preview.spec.ts`
Expected: 3 passed (또는 2 passed + 1 skipped — 개발 DB 에 10권이 없을 때)

Run: `npm --prefix $APP run test` → 전체 vitest PASS
Run: `npm --prefix $APP run type-check` → 에러 0
Run: `npm --prefix $APP run lint` → 에러 0

- [ ] **Step 5: 화면 확인**

`npm --prefix $APP run dev` → 비로그인으로 `/` 를 375px·1280px 에서 연다.

- 가로 스크롤 없음(그리드 5열/10열)
- 다크 모드에서 섹션 테두리·문구 대비 정상
- 표지 실패 칸은 제목 조판으로 선다

- [ ] **Step 6: 커밋 지점**

```
✨ Feat: 비로그인 홈 맨 위에 책장 맛보기를 둔다
```

---

## 실행 후

- 설계 문서 §10 의 결정은 그대로다. 문서 변경(§5 목표 액션, §7 GrowingShelf 미이동)은 계획 단계에서 이미 반영했다.
- PR 은 사용자 요청 시. 본문에 "개발 DB 에 10권이 없어 e2e 한 갈래는 skip 될 수 있음"을 적는다.
