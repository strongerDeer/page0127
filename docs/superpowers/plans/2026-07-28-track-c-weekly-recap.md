# 트랙 C 주간 회상 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 랜딩 `/`에 왔을 때 "이번 주에 할 말이 있는" 회상 카드 1장을 만나게 한다.
할 말이 없으면 아무것도 그리지 않는다.

**Architecture:** 핵심은 순수 함수 `selectRecapCard(books, now)` 하나다. DB도 화면도 모르고, 책
목록과 기준 시각만 받아 카드 1장 또는 `null`을 돌려준다. 서버 컴포넌트가 내 책을 읽어 이 함수에
넘기고, 결과를 위젯이 그린다. 테이블·크론·마이그레이션은 만들지 않는다.

**Tech Stack:** Next.js 16 App Router(Server Component) · TypeScript strict · Supabase JS ·
vitest(node 환경) · Tailwind

설계 근거는 `docs/superpowers/specs/2026-07-28-track-c-weekly-recap-design.md` 를 본다.

## Global Constraints

모든 태스크에 아래가 암묵적으로 포함된다.

- **TypeScript strict.** `any` 금지 — 불명확하면 `unknown` + 타입 가드. `interface` 금지, `type` 만
  쓴다.
- **화살표 함수 + named export.** 이 레포의 새 파일 관례다 (`export const foo = () => {}`).
- **`console.log` 금지.** `console.warn` / `console.error` 만 허용.
- **import 정렬** — 외부 → `@/...` 별칭 → 상대경로 → `import type`. 그룹 사이 빈 줄.
- **테스트 파일은 `.test.ts`** — vitest가 `{src,app}/**/*.test.{ts,tsx}` 를 수집한다. Playwright는
  `e2e/*.spec.ts` 라 절대 겹치면 안 된다.
- **`select('*')` 금지.** `books` 에는 `description`·`toc` 같은 큰 칸이 있다. 필요한 칸만 나열한다.
- **"0권" 문구 금지.** 회상할 거리가 없으면 문구를 만들지 말고 `null` 을 돌려 아무것도 안 그린다.
  (`00_docs/00_남은_작업_목록.md` 의 금지 원칙)
- **별점은 `@/entities/book` 헬퍼를 쓴다** — `isRated` · `toScore` · `RATING_MAX`. DB의 `rating` 은
  `0|1|2|3|4|5|10` 이고 `10` 은 11번째 점수가 아니라 "인생책"이라는 최고점의 별칭이다. 직접
  `rating / 2` 같은 계산을 하지 않는다.
- **커밋 메시지에 `Co-Authored-By` 트레일러를 넣지 않는다.** (`CLAUDE.md` 6번)
- **작업 위치**: 워크트리 `.claude/worktrees/track-c-weekly-recap`, 브랜치 `track-c-weekly-recap`
  (베이스 `main` = `658d332`). 명령의 `cd` 기준은
  `.claude/worktrees/track-c-weekly-recap/apps/page0127` 이다.

### 카드 우선순위 (모든 태스크가 공유하는 제품 규칙)

위에서부터 **처음 걸리는 것 하나만** 쓴다.

| 순위 | `kind`          | 조건                                                |
| ---- | --------------- | --------------------------------------------------- |
| 1    | `this-week`     | 이번 주(KST 월~일)에 완독 또는 등록이 있다          |
| 2    | `years-ago`     | n년 전 기념일(오늘의 월·일) ±7일에 완독한 책이 있다 |
| 3    | `still-reading` | `status === 'reading'` 인 책이 있다                 |
| —    | `null`          | 셋 다 없음 → **카드를 그리지 않는다**               |

1번은 완독이 있으면 `variant: 'completed'`, 등록만 있으면 `variant: 'added'` 다.

---

## 파일 구조

| 파일                                             | 책임                              | 태스크 |
| ------------------------------------------------ | --------------------------------- | ------ |
| `src/shared/lib/date.ts`                         | `toKstDateKey` 추가 (cherry-pick) | 1      |
| `src/entities/recap/lib/kstWeek.ts`              | KST 주(월~일) 경계 계산           | 2      |
| `src/entities/recap/lib/kstWeek.test.ts`         | 위의 테스트                       | 2      |
| `src/entities/recap/model/types.ts`              | `RecapBook` · `RecapCard` 타입    | 3      |
| `src/entities/recap/lib/selectRecapCard.ts`      | **카드 선택 순수 함수**           | 3      |
| `src/entities/recap/lib/selectRecapCard.test.ts` | 위의 테스트 9케이스               | 3      |
| `src/entities/recap/api/getRecapBooks.ts`        | 내 책 조회                        | 4      |
| `src/entities/recap/index.ts`                    | 슬라이스 공개 API                 | 4      |
| `src/widgets/recap/ui/WeeklyRecapCard.tsx`       | 화면                              | 5      |
| `app/(public)/page.tsx`                          | 랜딩에 연결                       | 6      |

주 경계 계산을 `shared/lib/date.ts` 가 아니라 `entities/recap` 안에 두는 이유: "한 주는 월요일에
시작한다"는 것은 범용 날짜 유틸이 아니라 **회상의 제품 결정**이고, `date.ts` 는 D-1 브랜치도
건드리는 파일이라 충돌 면적을 넓히지 않는 편이 낫다.

**스펙은 커밋 5개로 잡았는데 이 계획은 태스크 6개다.** 주 경계 계산(Task 2)을 카드 선택 함수(Task
3)에서 떼어냈기 때문이다. 둘을 한 태스크로 묶으면 테스트가 실패했을 때 "날짜 계산이 틀렸는지, 카드
고르는 규칙이 틀렸는지"를 구분할 수 없다. 각 태스크가 독립적으로 검증되도록 나눴다.

---

## Task 1: KST 날짜 유틸 가져오기

D-1 브랜치가 이미 만든 `toKstDateKey` 를 cherry-pick 한다. 새로 짜면 D-1 병합 때 충돌한다.

**Files:**

- Modify: `apps/page0127/src/shared/lib/date.ts` (cherry-pick으로 자동)
- Create: `apps/page0127/src/shared/lib/date.test.ts` (cherry-pick으로 자동)

**Interfaces:**

- Produces: `toKstDateKey(at: Date): string` — KST 기준 `'YYYY-MM-DD'` 를 돌려준다.
  `@/shared/lib/date` 에서 import 한다.

- [ ] **Step 1: 두 커밋을 cherry-pick 한다**

`61e7a89` 는 유틸 추가, `41bd6de` 는 시그니처를 `Date` 만 받게 좁힌 후속 수정이다. 순서대로
가져온다.

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap
git cherry-pick 61e7a89 41bd6de
```

기대: 충돌 없이 두 커밋이 적용된다. (`037c32d..main` 사이에 `date.ts` 변경이 없음을 확인했다)

- [ ] **Step 2: 가져온 테스트가 통과하는지 확인한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap/apps/page0127
npm run test -- src/shared/lib/date.test.ts
```

기대: PASS.

- [ ] **Step 3: 함수가 실제로 존재하는지 눈으로 확인한다**

```bash
grep -n "export const toKstDateKey" src/shared/lib/date.ts
```

기대: 한 줄이 출력된다. 안 나오면 cherry-pick이 실패한 것이므로 다음 태스크로 넘어가지 않는다.

커밋은 cherry-pick이 이미 만들었으므로 따로 하지 않는다.

---

## Task 2: KST 주 경계 계산

**Files:**

- Create: `apps/page0127/src/entities/recap/lib/kstWeek.ts`
- Test: `apps/page0127/src/entities/recap/lib/kstWeek.test.ts`

**Interfaces:**

- Consumes: `toKstDateKey(at: Date): string` (Task 1)
- Produces:
  - `type KstWeekRange = { startKey: string; endKey: string }` — 양끝 포함, `'YYYY-MM-DD'`
  - `toKstWeekRange(now: Date): KstWeekRange`
  - `isWithinWeek(dateKey: string, week: KstWeekRange): boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/entities/recap/lib/kstWeek.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { isWithinWeek, toKstWeekRange } from './kstWeek';

describe('toKstWeekRange', () => {
  it('주는 월요일에 시작해서 일요일에 끝난다', () => {
    // 2026-07-28 은 화요일. 그 주는 07-27(월) ~ 08-02(일)
    const week = toKstWeekRange(new Date('2026-07-28T03:00:00Z'));

    expect(week).toEqual({ startKey: '2026-07-27', endKey: '2026-08-02' });
  });

  it('월요일에는 그날이 곧 주의 시작이다', () => {
    const week = toKstWeekRange(new Date('2026-07-27T03:00:00Z'));

    expect(week.startKey).toBe('2026-07-27');
  });

  it('일요일에는 그날이 곧 주의 끝이다', () => {
    const week = toKstWeekRange(new Date('2026-08-02T03:00:00Z'));

    expect(week.endKey).toBe('2026-08-02');
  });

  // 이 두 케이스가 이 파일이 존재하는 이유다.
  // KST 는 UTC 보다 9시간 빠르므로 둘이 날짜를 다르게 보는 구간은 UTC 15:00~24:00 뿐이다.
  it('UTC 일요일 16시는 KST 로 월요일 새벽이라 이미 새 주다', () => {
    // UTC 2026-08-02 16:00(일) === KST 2026-08-03 01:00(월)
    const week = toKstWeekRange(new Date('2026-08-02T16:00:00Z'));

    expect(week).toEqual({ startKey: '2026-08-03', endKey: '2026-08-09' });
  });

  it('UTC 일요일 14시는 KST 로도 일요일이라 아직 지난 주다', () => {
    // UTC 2026-08-02 14:00(일) === KST 2026-08-02 23:00(일)
    const week = toKstWeekRange(new Date('2026-08-02T14:00:00Z'));

    expect(week).toEqual({ startKey: '2026-07-27', endKey: '2026-08-02' });
  });
});

describe('isWithinWeek', () => {
  const week = { startKey: '2026-07-27', endKey: '2026-08-02' };

  it('양끝을 포함한다', () => {
    expect(isWithinWeek('2026-07-27', week)).toBe(true);
    expect(isWithinWeek('2026-08-02', week)).toBe(true);
  });

  it('구간 밖은 제외한다', () => {
    expect(isWithinWeek('2026-07-26', week)).toBe(false);
    expect(isWithinWeek('2026-08-03', week)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap/apps/page0127
npm run test -- src/entities/recap/lib/kstWeek.test.ts
```

기대: FAIL — `Failed to resolve import "./kstWeek"`.

- [ ] **Step 3: 최소 구현을 넣는다**

`src/entities/recap/lib/kstWeek.ts`:

```ts
import { toKstDateKey } from '@/shared/lib/date';

/** 양끝을 포함하는 KST 주 구간. 값은 'YYYY-MM-DD' */
export type KstWeekRange = {
  startKey: string;
  endKey: string;
};

/**
 * 날짜 키에 일수를 더한다.
 *
 * 'YYYY-MM-DD'를 Date로 파싱하면 UTC 자정으로 읽힌다. 그래서 UTC getter/setter만
 * 쓰는 한 실행 환경의 시간대에 영향받지 않는다. 여기서 getDate()/setDate() 같은
 * 로컬 getter를 쓰면 서버 시간대에 따라 하루가 밀린다.
 */
const shiftDateKey = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * 기준 시각이 속한 KST 주(월~일)의 시작·끝 날짜를 준다.
 *
 * 왜 KST인가: 서버는 UTC로 돈다. UTC로 주를 자르면 한국 시각 월요일 새벽 0~9시가
 * 지난 주로 밀린다(그 시각 UTC는 아직 일요일이라서).
 */
export const toKstWeekRange = (now: Date): KstWeekRange => {
  const todayKey = toKstDateKey(now);

  // getUTCDay(): 0=일 … 6=토. 월요일 시작으로 옮긴다(월=0 … 일=6)
  const dayOfWeek = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const startKey = shiftDateKey(todayKey, -daysSinceMonday);

  return { startKey, endKey: shiftDateKey(startKey, 6) };
};

/**
 * 날짜 키가 주 구간 안에 있는지 (양끝 포함).
 * 'YYYY-MM-DD'는 자릿수가 고정이라 문자열 비교가 곧 날짜 비교다.
 */
export const isWithinWeek = (dateKey: string, week: KstWeekRange): boolean =>
  dateKey >= week.startKey && dateKey <= week.endKey;
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npm run test -- src/entities/recap/lib/kstWeek.test.ts
```

기대: PASS, 7개 테스트 전부.

- [ ] **Step 5: 커밋**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap
git add apps/page0127/src/entities/recap/lib/kstWeek.ts apps/page0127/src/entities/recap/lib/kstWeek.test.ts
git commit -m "✨ Feat: 회상용 KST 주(월~일) 경계 계산 추가

서버는 UTC로 돌기 때문에 UTC로 주를 자르면 한국 시각 월요일 새벽 0~9시가
지난 주로 밀린다. UTC 15:00~24:00 구간에서 두 시간대가 날짜를 다르게 보는
것을 테스트로 못박았다."
```

---

## Task 3: 카드 타입과 선택 함수

이 태스크가 트랙 C의 심장이다. **테스트를 먼저 쓴다** — 이 함수는 화면으로 재현하기 가장
어렵다("작년 이맘때 책이 없는 사용자"를 만들려면 계정을 새로 파야 한다).

**Files:**

- Create: `apps/page0127/src/entities/recap/model/types.ts`
- Create: `apps/page0127/src/entities/recap/lib/selectRecapCard.ts`
- Test: `apps/page0127/src/entities/recap/lib/selectRecapCard.test.ts`

**Interfaces:**

- Consumes: `toKstDateKey` (Task 1), `toKstWeekRange` · `isWithinWeek` (Task 2), `type Book` from
  `@/entities/book`
- Produces:
  - `type RecapBook` — `Book` 에서 카드에 필요한 칸만 뽑은 것
  - `type RecapCard` — `kind` 로 구분되는 유니온 3종
  - `selectRecapCard(books: RecapBook[], now: Date): RecapCard | null`

- [ ] **Step 1: 타입을 먼저 만든다**

테스트가 이 타입을 import 하므로 타입만 선행한다.

`src/entities/recap/model/types.ts`:

```ts
import type { Book } from '@/entities/book';

/**
 * 회상 카드가 쓰는 책 한 권.
 *
 * Book 전체가 아니라 카드에 필요한 칸만 뽑는다. description·toc 같은 큰 칸을
 * 실어 나르지 않기 위해서이고, 조회 쿼리의 select 목록이 이 타입과 1:1로 맞는다.
 */
export type RecapBook = Pick<
  Book,
  'id' | 'title' | 'author' | 'cover_image' | 'status' | 'rating' | 'completed_date' | 'created_at'
>;

/** 모든 카드가 공통으로 갖는 것 — 대표 책 1권과 곁들일 나머지 */
type RecapCardBase = {
  lead: RecapBook;
  others: RecapBook[];
};

/**
 * 회상 카드 3종.
 *
 * - this-week    이번 주에 완독(completed)하거나 담은(added) 책
 * - years-ago    n년 전 기념일 언저리에 완독한 책
 * - still-reading 읽는 중인 채로 가장 오래 놓여 있는 책
 *
 * 넷째 값은 없다. 할 말이 없으면 카드 자체가 null 이다.
 */
export type RecapCard =
  | ({ kind: 'this-week'; variant: 'completed' | 'added' } & RecapCardBase)
  | ({ kind: 'years-ago'; yearsAgo: number } & RecapCardBase)
  | ({ kind: 'still-reading' } & RecapCardBase);
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/entities/recap/lib/selectRecapCard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { selectRecapCard } from './selectRecapCard';

import type { RecapBook } from '../model/types';

/** 기준 시각 — 2026-07-28(화). 그 주는 07-27(월)~08-02(일) */
const NOW = new Date('2026-07-28T03:00:00Z');

/** 테스트용 책 한 권. 지정하지 않은 칸은 "아무 카드에도 안 걸리는" 값이다 */
const book = (over: Partial<RecapBook> & { id: string }): RecapBook => ({
  title: '테스트 책',
  author: null,
  cover_image: null,
  status: 'completed',
  rating: null,
  completed_date: null,
  // 2020년 등록 = 이번 주도 아니고 기념일 언저리도 아니다
  created_at: '2020-03-05T00:00:00Z',
  ...over,
});

describe('selectRecapCard', () => {
  it('1) 이번 주에 완독한 책이 있으면 이번 주 카드를 끝냈다로 준다', () => {
    const card = selectRecapCard([book({ id: 'a', completed_date: '2026-07-28' })], NOW);

    expect(card?.kind).toBe('this-week');
    expect(card).toMatchObject({ variant: 'completed' });
    expect(card?.lead.id).toBe('a');
  });

  it('2) 이번 주에 담기만 했으면 이번 주 카드를 담았다로 준다', () => {
    const card = selectRecapCard(
      [
        book({
          id: 'a',
          status: 'reading',
          created_at: '2026-07-28T01:00:00Z',
        }),
      ],
      NOW
    );

    expect(card).toMatchObject({ kind: 'this-week', variant: 'added' });
    expect(card?.lead.id).toBe('a');
  });

  it('3) 이번 주가 비었고 작년 이맘때 완독이 있으면 그 해 카드를 준다', () => {
    const card = selectRecapCard([book({ id: 'a', completed_date: '2025-07-30' })], NOW);

    expect(card).toMatchObject({ kind: 'years-ago', yearsAgo: 1 });
    expect(card?.lead.id).toBe('a');
  });

  it('4) 작년이 비어 있으면 더 거슬러 올라가고 몇 년 전인지 담는다', () => {
    const card = selectRecapCard([book({ id: 'a', completed_date: '2023-07-26' })], NOW);

    expect(card).toMatchObject({ kind: 'years-ago', yearsAgo: 3 });
  });

  it('5) 앞의 것이 다 없으면 읽는 중인 책을 준다', () => {
    const card = selectRecapCard([book({ id: 'a', status: 'reading' })], NOW);

    expect(card).toMatchObject({ kind: 'still-reading' });
    expect(card?.lead.id).toBe('a');
  });

  it('6) 할 말이 없으면 카드를 만들지 않는다', () => {
    // 완독일이 기념일에서 멀고, 읽는 중도 아니다
    const card = selectRecapCard([book({ id: 'a', completed_date: '2025-01-15' })], NOW);

    expect(card).toBeNull();
  });

  it('7) 같은 입력이면 몇 번을 불러도 같은 결과다', () => {
    const books = [
      book({ id: 'b', completed_date: '2025-07-29' }),
      book({ id: 'a', completed_date: '2025-07-27' }),
      book({ id: 'c', completed_date: '2025-08-01' }),
    ];

    const first = selectRecapCard(books, NOW);
    const second = selectRecapCard(books, NOW);

    expect(first).toEqual(second);
  });

  it('8) 기념일과의 거리가 같으면 id 오름차순으로 안정되게 고른다', () => {
    // 기념일은 2025-07-28. 07-27 과 07-29 는 둘 다 하루 차이다.
    // 입력 순서를 뒤집어도 같은 책이 대표여야 한다.
    const forward = selectRecapCard(
      [
        book({ id: 'zzz', completed_date: '2025-07-27' }),
        book({ id: 'aaa', completed_date: '2025-07-29' }),
      ],
      NOW
    );
    const reversed = selectRecapCard(
      [
        book({ id: 'aaa', completed_date: '2025-07-29' }),
        book({ id: 'zzz', completed_date: '2025-07-27' }),
      ],
      NOW
    );

    expect(forward?.lead.id).toBe('aaa');
    expect(reversed?.lead.id).toBe('aaa');
  });

  it('9) UTC 일요일 16시는 KST 로 새 주라, 지난 주 완독은 이번 주가 아니다', () => {
    // UTC 2026-08-02 16:00(일) === KST 2026-08-03 01:00(월) → 이번 주는 08-03~08-09
    const card = selectRecapCard(
      [book({ id: 'a', completed_date: '2026-08-01' })],
      new Date('2026-08-02T16:00:00Z')
    );

    // 08-01 은 지난 주이므로 this-week 이 되면 안 된다
    expect(card?.kind).not.toBe('this-week');
  });

  it('이번 주에 완독과 등록이 둘 다 있으면 완독을 보여준다', () => {
    const card = selectRecapCard(
      [
        book({
          id: 'added',
          status: 'reading',
          created_at: '2026-07-28T01:00:00Z',
        }),
        book({ id: 'done', completed_date: '2026-07-27' }),
      ],
      NOW
    );

    expect(card).toMatchObject({ kind: 'this-week', variant: 'completed' });
    expect(card?.lead.id).toBe('done');
  });

  it('같은 주의 나머지 책은 others 에 담는다', () => {
    const card = selectRecapCard(
      [
        book({ id: 'a', completed_date: '2025-07-28' }),
        book({ id: 'b', completed_date: '2025-07-30' }),
        book({ id: 'c', completed_date: '2025-07-24' }),
      ],
      NOW
    );

    expect(card?.lead.id).toBe('a'); // 기념일 당일
    expect(card?.others.map((b) => b.id)).toEqual(['b', 'c']); // 2일 차, 4일 차
  });

  it('책이 하나도 없으면 null 이다', () => {
    expect(selectRecapCard([], NOW)).toBeNull();
  });
});
```

- [ ] **Step 3: 실패를 확인한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap/apps/page0127
npm run test -- src/entities/recap/lib/selectRecapCard.test.ts
```

기대: FAIL — `Failed to resolve import "./selectRecapCard"`.

- [ ] **Step 4: 구현을 넣는다**

`src/entities/recap/lib/selectRecapCard.ts`:

```ts
import { toKstDateKey } from '@/shared/lib/date';

import { isWithinWeek, toKstWeekRange } from './kstWeek';

import type { RecapBook, RecapCard } from '../model/types';

/** 몇 해 전까지 거슬러 볼 것인가. 이 서비스가 담는 독서 이력의 현실적 상한 */
const MAX_YEARS_BACK = 10;

/** 기념일 앞뒤 며칠까지를 "같은 주"로 볼 것인가 */
const ANNIVERSARY_WINDOW_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 완독일이 있는 책. filter 로 좁히면 completed_date 가 string 으로 확정된다 */
type CompletedBook = RecapBook & { completed_date: string };

const hasCompletedDate = (book: RecapBook): book is CompletedBook => book.completed_date !== null;

/**
 * 같은 값끼리는 id 오름차순.
 *
 * 장식이 아니다. 이 꼬리표가 없으면 DB가 돌려주는 행 순서에 대표 책이 좌우돼
 * "같은 입력 → 같은 출력"이 깨진다.
 */
const byIdAsc = (a: RecapBook, b: RecapBook): number => a.id.localeCompare(b.id);

const daysBetween = (aKey: string, bKey: string): number =>
  Math.round((Date.parse(`${aKey}T00:00:00Z`) - Date.parse(`${bKey}T00:00:00Z`)) / MS_PER_DAY);

/**
 * 날짜 키에서 연도만 뒤로 민다.
 *
 * 2월 29일은 평년에 3월 1일로 넘어간다(JS 기본 동작). 기념일 창이 ±7일이라
 * 하루 밀린 것은 결과를 바꾸지 않으므로 그대로 둔다.
 */
const shiftYearsBack = (dateKey: string, yearsBack: number): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - yearsBack);
  return date.toISOString().slice(0, 10);
};

/** 정렬된 목록을 대표 1권 + 나머지로 가른다 */
const split = (sorted: RecapBook[]) => ({
  lead: sorted[0],
  others: sorted.slice(1),
});

/**
 * 이번 주에 할 말이 있는 카드 1장을 고른다. 없으면 null.
 *
 * 우선순위는 고정이고 무작위가 없다 — 같은 주에 홈을 몇 번 새로고침해도 같은
 * 카드가 나온다.
 *
 * ⚠️ 지금은 사용자의 책 전량을 받아 여기서 거른다. 157권 기준 30KB 라 문제없지만,
 *    한 사람이 2000권을 넘으면 DB 쪽 계산(RPC)으로 옮긴다.
 */
export const selectRecapCard = (books: RecapBook[], now: Date): RecapCard | null => {
  const week = toKstWeekRange(now);

  // ① 이번 주의 나 — 완독이 담기보다 먼저다. 끝낸 것이 회상할 거리가 더 크다
  const completedThisWeek = books
    .filter(hasCompletedDate)
    .filter((book) => isWithinWeek(book.completed_date, week));

  if (completedThisWeek.length > 0) {
    const sorted = [...completedThisWeek].sort(
      (a, b) => b.completed_date.localeCompare(a.completed_date) || byIdAsc(a, b)
    );
    return { kind: 'this-week', variant: 'completed', ...split(sorted) };
  }

  const addedThisWeek = books.filter((book) =>
    isWithinWeek(toKstDateKey(new Date(book.created_at)), week)
  );

  if (addedThisWeek.length > 0) {
    const sorted = [...addedThisWeek].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || byIdAsc(a, b)
    );
    return { kind: 'this-week', variant: 'added', ...split(sorted) };
  }

  // ② 그 해, 이 주의 나 — 가장 가까운 해부터 보고, 걸리면 거기서 멈춘다
  const todayKey = toKstDateKey(now);
  const completed = books.filter(hasCompletedDate);

  for (let yearsAgo = 1; yearsAgo <= MAX_YEARS_BACK; yearsAgo += 1) {
    const anniversaryKey = shiftYearsBack(todayKey, yearsAgo);

    const nearAnniversary = completed.filter(
      (book) =>
        Math.abs(daysBetween(book.completed_date, anniversaryKey)) <= ANNIVERSARY_WINDOW_DAYS
    );

    if (nearAnniversary.length === 0) continue;

    const sorted = [...nearAnniversary].sort((a, b) => {
      const gap =
        Math.abs(daysBetween(a.completed_date, anniversaryKey)) -
        Math.abs(daysBetween(b.completed_date, anniversaryKey));
      return gap !== 0 ? gap : byIdAsc(a, b);
    });

    return { kind: 'years-ago', yearsAgo, ...split(sorted) };
  }

  // ③ 아직 읽는 중 — 가장 오래 놓여 있는 것이 회상할 거리가 크다
  const reading = books.filter((book) => book.status === 'reading');

  if (reading.length > 0) {
    const sorted = [...reading].sort(
      (a, b) => a.created_at.localeCompare(b.created_at) || byIdAsc(a, b)
    );
    return { kind: 'still-reading', ...split(sorted) };
  }

  // ④ 할 말이 없으면 침묵한다. "이번 주 0권" 같은 문구를 만들지 않는다
  return null;
};
```

- [ ] **Step 5: 통과를 확인한다**

```bash
npm run test -- src/entities/recap/lib/selectRecapCard.test.ts
```

기대: PASS, 12개 테스트 전부.

- [ ] **Step 6: 타입 검사**

```bash
npx tsc --noEmit
```

기대: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap
git add apps/page0127/src/entities/recap/
git commit -m "✨ Feat: 주간 회상 카드 선택 함수

책 목록과 기준 시각만 받아 카드 1장 또는 null 을 돌려주는 순수 함수.
DB도 화면도 모르므로 나중에 메일 본문을 만들 때 그대로 재사용한다.

우선순위: 이번 주 완독 → 이번 주 등록 → n년 전 기념일 → 읽는 중 → null.
셋 다 없으면 문구를 만들지 않고 침묵한다.
동점일 때 id 오름차순으로 끊어 DB 행 순서에 결과가 흔들리지 않게 했다."
```

---

## Task 4: 내 책 조회

**Files:**

- Create: `apps/page0127/src/entities/recap/api/getRecapBooks.ts`
- Create: `apps/page0127/src/entities/recap/index.ts`

**Interfaces:**

- Consumes: `createClient` from `@/shared/config/supabase/server`, `type RecapBook` (Task 3)
- Produces:
  - `getRecapBooks(userId: string): Promise<RecapBook[]>`
  - `src/entities/recap/index.ts` 가 `selectRecapCard` · `getRecapBooks` · `type RecapBook` ·
    `type RecapCard` 를 재수출한다.

- [ ] **Step 1: 조회 함수를 만든다**

`src/entities/recap/api/getRecapBooks.ts`:

```ts
import { createClient } from '@/shared/config/supabase/server';

import type { RecapBook } from '../model/types';

/**
 * 회상 카드에 필요한 칸만 골라 내 책을 가져온다.
 *
 * select 목록이 RecapBook 타입과 1:1로 맞는다. `select('*')` 를 쓰지 않는 이유는
 * books 에 description·toc 처럼 큰 칸이 있어서다.
 *
 * RLS: books 의 SELECT 정책은 `is_public = true OR auth.uid() = user_id` 다.
 * 여기서는 user_id 를 직접 걸어 내 책만 가져오므로 비공개 책도 회상에 들어온다.
 * 회상은 남에게 보여주는 화면이 아니라 내가 내 기록을 되돌아보는 자리라 이게 맞다.
 * (여러 사용자를 걸치는 집계였다면 is_public 을 명시해야 한다 — TodayStrip 참고)
 *
 * 실패하면 빈 배열을 준다. 회상은 곁들이는 화면이라 랜딩 전체를 막지 않는다.
 */
export const getRecapBooks = async (userId: string): Promise<RecapBook[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, cover_image, status, rating, completed_date, created_at')
    .eq('user_id', userId);

  if (error) {
    console.error('회상용 책 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};
```

- [ ] **Step 2: 슬라이스 공개 API를 만든다**

`src/entities/recap/index.ts`:

```ts
// entities/recap public API
// 외부 슬라이스/레이어는 항상 '@/entities/recap'을 통해 import 한다
// 내부 폴더 구조(model/, lib/, api/)는 외부에 노출하지 않는다

export { getRecapBooks } from './api/getRecapBooks';
export { selectRecapCard } from './lib/selectRecapCard';

export type { RecapBook, RecapCard } from './model/types';
```

- [ ] **Step 3: 타입 검사와 린트를 돌린다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap/apps/page0127
npx tsc --noEmit && npx eslint src/entities/recap
```

기대: 둘 다 에러 없음.

`select` 문자열과 `RecapBook` 이 어긋나도 **tsc 가 못 잡는다.** Supabase 클라이언트에 `Database`
제네릭이 붙어 있지 않아 반환 타입이 느슨하기 때문이다. 그래서 다음 단계에서 컬럼 이름을 눈으로
대조한다.

- [ ] **Step 4: select 목록과 타입이 실제로 일치하는지 대조한다**

```bash
grep -n "'id, title" src/entities/recap/api/getRecapBooks.ts
grep -n "| '" src/entities/recap/model/types.ts
```

기대: 두 목록의 컬럼 이름 8개가 정확히 같다 — `id` · `title` · `author` · `cover_image` · `status` ·
`rating` · `completed_date` · `created_at`. 하나라도 다르면 런타임에 `undefined` 가 흘러 들어간다.

- [ ] **Step 5: 커밋**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap
git add apps/page0127/src/entities/recap/
git commit -m "✨ Feat: 회상용 책 조회와 recap 슬라이스 공개 API

회상 카드에 필요한 8개 칸만 select 한다. books 에는 description·toc 같은
큰 칸이 있어 select('*') 를 쓰지 않는다.

내 책만 보는 화면이므로 user_id 로 직접 거른다. 비공개 책도 회상에 들어오는
것이 맞다 — 남에게 보여주는 화면이 아니다."
```

---

## Task 5: 회상 카드 화면

**Files:**

- Create: `apps/page0127/src/widgets/recap/ui/WeeklyRecapCard.tsx`

**Interfaces:**

- Consumes: `getRecapBooks` · `selectRecapCard` · `type RecapCard` (Task 4), `isRated` · `toScore` ·
  `RATING_MAX` from `@/entities/book`, `createClient` from `@/shared/config/supabase/server`
- Produces: `WeeklyRecapCard` — 인자 없는 async 서버 컴포넌트. 로그인하지 않았거나 카드가 없으면
  `null` 을 렌더한다.

- [ ] **Step 1: 컴포넌트를 만든다**

`src/widgets/recap/ui/WeeklyRecapCard.tsx`:

```tsx
import Image from 'next/image';

import { isRated, RATING_MAX, toScore } from '@/entities/book';
import { getRecapBooks, selectRecapCard } from '@/entities/recap';
import { createClient } from '@/shared/config/supabase/server';

import type { RecapBook, RecapCard } from '@/entities/recap';

/**
 * 주간 회상 — "이번 주의 한 장".
 *
 * 이번 주에 할 말이 있는 카드 1장만 그린다. 할 말이 없으면 아무것도 그리지 않는다.
 * "이번 주 0권 완독" 같은 문구는 살아 있는 서비스가 아니라 죽은 서비스라는 자백이 된다.
 * (00_docs/00_남은_작업_목록.md 의 금지 원칙 — TodayStrip 과 같은 이유)
 *
 * 저장하는 데이터가 없다. 열 때마다 계산하지만 우선순위가 고정이라 같은 주에는
 * 항상 같은 카드가 나온다.
 */

/** 카드 종류별 제목. N권은 대표 1권 + 나머지 */
const toHeading = (card: RecapCard, count: number): string => {
  switch (card.kind) {
    case 'this-week':
      return card.variant === 'completed'
        ? `이번 주에 ${count}권을 끝내셨어요`
        : `이번 주에 ${count}권을 담으셨어요`;
    case 'years-ago':
      return `${card.yearsAgo}년 전 이맘때, 이런 책을 읽으셨어요`;
    case 'still-reading':
      return '아직 읽고 계신 책이에요';
  }
};

/** 'YYYY-MM-DD' → '2025년 7월 28일' */
const toKoreanDate = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-');
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

/** 대표 책 아래 한 줄 — 카드마다 다른 근거를 적는다 */
const toLeadMeta = (card: RecapCard): string | null => {
  const { lead } = card;

  if (card.kind === 'still-reading') return '읽는 중';
  if (card.kind === 'this-week' && card.variant === 'added') return '이번 주에 담음';
  if (lead.completed_date) return `${toKoreanDate(lead.completed_date)} 완독`;

  return null;
};

/**
 * 별점 — 채워진 별과 빈 별.
 *
 * rating 은 0|1|2|3|4|5|10 이고 10 은 11번째 점수가 아니라 "인생책"이라는 최고점의
 * 별칭이다. 그래서 직접 계산하지 않고 entities/book 헬퍼로 5점 척도에 접는다.
 */
const RecapStars = ({ rating }: { rating: RecapBook['rating'] }) => {
  if (!isRated(rating)) return null;

  const score = toScore(rating);

  return (
    <p className='mt-1 text-[13px] text-text-subtle'>
      <span aria-hidden='true'>
        {'★'.repeat(score)}
        {'☆'.repeat(RATING_MAX - score)}
      </span>
      <span className='sr-only'>{`${RATING_MAX}점 만점에 ${score}점`}</span>
    </p>
  );
};

export const WeeklyRecapCard = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 회상은 내 기록을 되돌아보는 자리라 로그인 사용자에게만 보인다
  if (!user) return null;

  const card = selectRecapCard(await getRecapBooks(user.id), new Date());

  // 할 말이 없으면 침묵한다
  if (!card) return null;

  const count = 1 + card.others.length;
  const meta = toLeadMeta(card);

  return (
    <section
      aria-labelledby='weekly-recap-heading'
      className='rounded-xl border border-line px-7 py-6'
    >
      <h2 id='weekly-recap-heading' className='text-sm font-bold text-text-strong'>
        {toHeading(card, count)}
      </h2>

      <div className='mt-4 flex items-start gap-4'>
        {card.lead.cover_image && (
          <Image
            src={card.lead.cover_image}
            alt=''
            width={120}
            height={174}
            className='book-cover h-28 w-auto shrink-0 rounded-md'
          />
        )}

        <div className='pt-1'>
          <p className='text-lg font-bold leading-snug text-text-strong'>{card.lead.title}</p>

          <p className='mt-1 text-[13px] text-text-subtle'>
            {[card.lead.author, meta].filter(Boolean).join(' · ')}
          </p>

          <RecapStars rating={card.lead.rating} />
        </div>
      </div>

      {card.others.length > 0 && (
        <p className='mt-4 line-clamp-1 break-keep text-[13px] text-text-body'>
          {`같은 주에 ${card.others.length}권 더 — `}
          {card.others.map((book) => book.title).join(' · ')}
        </p>
      )}
    </section>
  );
};
```

- [ ] **Step 2: 타입 검사와 린트를 돌린다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap/apps/page0127
npx tsc --noEmit && npx eslint src/widgets/recap
```

기대: 둘 다 에러 없음.

`toHeading` 의 `switch` 는 세 `kind` 를 모두 다루므로 반환 타입이 `string` 으로 좁혀진다. `kind` 를
추가하고 분기를 빠뜨리면 여기서 tsc 가 잡아준다.

- [ ] **Step 3: 커밋**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap
git add apps/page0127/src/widgets/recap/
git commit -m "🎨 UI/UX: 주간 회상 카드 화면

카드 종류에 따라 제목과 근거 한 줄이 갈린다. 별점은 entities/book 헬퍼로
5점 척도에 접는다 — rating 의 10 은 11번째 점수가 아니라 인생책이라는
최고점의 별칭이라서다.

로그인하지 않았거나 카드가 없으면 null 을 렌더해 아무것도 그리지 않는다."
```

---

## Task 6: 랜딩에 연결하고 눈으로 확인

**Files:**

- Modify: `apps/page0127/app/(public)/page.tsx`

**Interfaces:**

- Consumes: `WeeklyRecapCard` (Task 5)

- [ ] **Step 1: import 를 추가한다**

`app/(public)/page.tsx` 의 `@/widgets/landing/...` import 들 사이, 알파벳 순서에 맞는 자리에 넣는다.
`simple-import-sort` 가 강제하므로 순서가 틀리면 린트가 잡는다.

```tsx
import { WeeklyRecapCard } from '@/widgets/recap/ui/WeeklyRecapCard';
```

- [ ] **Step 2: 히어로 배너 위에 마운트한다**

`<div className='container mx-auto max-w-6xl space-y-12 px-4 py-6 md:py-8'>` 바로 다음, 히어로 배너
`ErrorBoundary` **앞**에 넣는다.

```tsx
{
  /* 주간 회상 — 로그인 사용자에게만, 이번 주에 할 말이 있을 때만 나온다.
    실패하거나 할 말이 없으면 조용히 사라진다(랜딩을 막지 않는다) */
}
<ErrorBoundary fallback={null}>
  <Suspense fallback={null}>
    <WeeklyRecapCard />
  </Suspense>
</ErrorBoundary>;
```

`ErrorBoundary`(바깥) > `Suspense`(안) 순서는 이 파일의 기존 관례다 — 로딩은 Suspense, 에러는
ErrorBoundary가 맡는다. `fallback={null}` 은 `TodayStrip` 과 같은 선택이다: 곁들이는 섹션이므로
실패해도 자리를 차지하지 않는다.

- [ ] **Step 3: 타입 검사·린트·빌드를 돌린다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap/apps/page0127
npx tsc --noEmit
npx eslint app/\(public\)/page.tsx src/entities/recap src/widgets/recap
npm run test
npm run build
```

기대: 전부 통과. `npm run test` 는 이 브랜치의 모든 vitest 파일이 대상이다.

- [ ] **Step 4: 실제 화면을 눈으로 확인한다**

```bash
npm run dev
```

`http://localhost:3000` 에서:

| 확인                 | 기대                                                             |
| -------------------- | ---------------------------------------------------------------- |
| 로그아웃 상태로 접속 | 회상 카드가 **안 보인다.** 히어로 배너가 맨 위다                 |
| 로그인 후 접속       | 히어로 배너 **위**에 회상 카드가 1장 보인다                      |
| 카드 내용            | 2026-07-28 기준이면 "1년 전 이맘때…" + 『단 한 번의 삶』(김영하) |
| 새로고침 5회         | **같은 책**이 계속 나온다 (매번 바뀌면 결정론이 깨진 것)         |

⚠️ 로컬 Docker DB에는 운영 데이터가 없다. 위 책 제목은 **운영 계정**으로 접속했을 때의 기대값이다.
로컬에서는 "카드가 뜨는지 / 안 뜨는지"와 "새로고침해도 같은지"만 확인하고, 책 제목은 로컬 DB에 있는
값으로 대조한다.

⚠️ 새 라우트를 만든 게 아니라 기존 페이지를 고친 것이므로 Turbopack 캐시 문제는 없어야 하지만,
카드가 전혀 안 뜨고 원인을 못 찾겠으면 `rm -rf .next` 후 다시 띄워본다.

- [ ] **Step 5: 커밋**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-c-weekly-recap
git add apps/page0127/app/\(public\)/page.tsx
git commit -m "✨ Feat: 랜딩에 주간 회상 카드를 붙인다

로그인 사용자가 실제로 착지하는 곳이 / 라서 여기 둔다.
(/dashboard 는 /{username} 으로 가는 리다이렉트일 뿐이다)

TodayStrip 과 같이 ErrorBoundary fallback={null} 로 감싼다 —
곁들이는 섹션이라 실패해도 랜딩을 막지 않는다."
```

---

## 완료 조건

- [ ] `npm run test` 전체 통과
- [ ] `npx tsc --noEmit` 통과
- [ ] `npx eslint .` 에서 이번에 만든 파일의 새 경고가 없다
- [ ] `npm run build` 통과
- [ ] Task 6 Step 4의 수동 확인 4줄 완료
- [ ] 마이그레이션 파일을 **하나도 만들지 않았다** (`git diff --stat main...HEAD` 에
      `supabase/migrations/` 가 없다)

## 이 계획이 만들지 않는 것

스펙 § "이 스펙이 만들지 않는 것"과 같다. 착수 중 유혹이 생기면 멈추고 별도 건으로 남긴다.

- 메일 발송 · 인앱 알림 보내기 · 지난 회상 아카이브 · NEW 배지
- "남들의 반응" 카드 (좋아요·팔로우·댓글 소재가 0건이라 검증 불가)
- 평점 체계 정리 (트랙 F)
- 방문 이력 적재 (트랙 D-1, 별도 브랜치)
- **`TodayStrip` 의 중복 KST 계산 통합** — `getKstToday()` 가 `toKstDateKey` 와 같은 일을 한다.
  통합할 가치가 있지만 이 트랙의 범위가 아니고, 랜딩의 다른 섹션을 건드리게 된다.

## 병합 전 확인

- D-1(`track-d1-visits-rating`)의 마이그레이션 번호 충돌은 **이 브랜치와 무관하게 남아 있다.** 스펙
  § 부록을 볼 것. 트랙 C는 마이그레이션을 만들지 않으므로 먼저 병합해도 안전하다.
- 병합은 PR로 하고, 병합 자체는 사용자가 한다 (로컬 main 머지 금지).
