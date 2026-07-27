# 트랙 B — 60초 완독 기록 + 첫 권부터 즉시 보상 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 책을 덮은 직후 화면에서 결정할 것을 3개로 줄이고, 저장하면 사용자가 쓴 문장이 결과 카드로 되돌아오게 한다.

**Architecture:** 등록 폼의 리듀서·제출 로직·저장 데이터는 그대로 두고 **JSX 순서와 접기만** 바꾼다(기본값이 이미 옳아서 필요한 입력이 0개다). 저장 후에는 라우트를 늘리지 않고 `books/add` 페이지에 세 번째 state 단계(완료)를 더한다. 결과 문구 생성만 순수 함수로 분리해 vitest 로 잠근다 — 이 저장소에는 React 컴포넌트 테스트 하네스가 없다.

**Tech Stack:** Next.js 16 (App Router, 클라이언트 컴포넌트), TypeScript, Supabase, vitest, FSD 레이어, Turborepo

## Global Constraints

- 작업 위치는 worktree `/Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-b-record-ritual`, 브랜치 `worktree-track-b-record-ritual` (베이스 `main` = `cca03be`). **원본 작업트리 `/Users/dreamfulbud/Desktop/stronger/0127` 는 절대 건드리지 않는다** — 다른 세션이 동시에 쓴다.
- 모든 npm 명령은 `apps/page0127` 에서 실행한다. **eslint 를 루트에서 실행하면 설정을 못 읽고 헛통과한다.**
- 명령: `npm test` (vitest run), `npm run lint`, `npm run lint:fix`, `npm run type-check`, `npm run build`
- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 절대 넣지 않는다.** 이 프로젝트가 금지하며, 다른 기본 지침보다 우선한다.
- 커밋은 브리프가 지정한 경로만 담는다. `git add -A` 금지. worktree 라 index 가 사설이므로 `git add <정확한 경로>` 는 안전하다. 새 파일은 `git commit -o` 가 인식하지 못하므로 먼저 `git add` 한다.
- DB 마이그레이션을 만들거나 고치지 않는다. API 라우트를 새로 만들지 않는다.
- 저장되는 데이터와 `BookFormData` 필드 구성을 바꾸지 않는다. 이 트랙은 프레젠테이션 계층만 건드린다.
- 접기는 **네이티브 `<details>`/`<summary>`** 로 한다. shadcn collapsible/accordion 은 설치돼 있지 않으므로 새로 끌어들이지 않는다. 저장소 선례: `src/features/admin-errors/ui/ErrorList.tsx:115`. 그 파일 주석의 함정도 적용된다 — **`summary` 에 직접 `flex` 를 주면 펼침 삼각형 마커가 사라지므로 안쪽 `span` 으로 정렬한다.**
- 순수 함수 + 테스트는 `src/features/<slice>/lib/<name>.ts` + `<name>.test.ts` 에 둔다(저장소 관례: `admin-errors/lib/triage.ts`, `admin-quality/lib/verdict.ts`).
- autofocus 는 `autoFocus` 속성이 아니라 `useRef` + `useEffect` 로 한다(저장소 선례: `app/(protected)/books/add/page.tsx:60-63`).
- FSD import 방향: `entities` → `features` → `widgets` → `app`. 슬라이스 밖에서는 배럴 `@/entities/book` 을 쓴다.
- `simple-import-sort` 를 쓴다. import 추가 후 정렬 경고가 나면 `npm run lint:fix`. 계획의 import 위치는 참고이고 린터 순서가 우선한다.
- 코드 스타일은 각 파일 주변을 따른다: 홑따옴표, 세미콜론, JSX 도 홑따옴표.
- 주석은 한국어로 "왜"를 적는다.

## 확정 카피 (그대로 쓴다)

| 자리 | 문구 |
| --- | --- |
| 한줄평 `Label` | `이 책을 한 문장으로 남긴다면?` |
| 한줄평 `placeholder` | `덮고 나서 남은 생각을 그대로 적어도 좋아요` |
| 접기 `summary` | `더 남기기` |
| 완독일 `Label` | `완독일` (별표 없음) |
| 완독일 힌트 | `비워 두면 오늘로 기록해요.` |
| 결과 — 첫 권 | `첫 번째 책이 책장에 꽂혔어요` |
| 결과 — N권째 | `N번째 책이 책장에 꽂혔어요` |
| 결과 — 재독 | `N회독을 기록했어요` |
| 결과 — 권수 조회 실패 | `책장에 꽂혔어요` |
| 결과 — 인생책 배지 | `인생책` |
| 결과 — 버튼 | `내 책장 보기` / `한 권 더 기록` |
| 취향 분석 진입 토스트 | `별점을 남긴 완독 책이 N권 더 모이면 취향 분석을 볼 수 있어요.` |

## File Structure

**생성**
- `apps/page0127/src/features/book/lib/savedBookMessage.ts` — 결과 카드 확인 문구를 만드는 순수 함수. 카피 변경이 테스트로 잠기게 하는 것이 목적이다.
- `apps/page0127/src/features/book/lib/savedBookMessage.test.ts` — 위 함수의 vitest 테스트.
- `apps/page0127/src/features/book/ui/BookSavedCard.tsx` — 저장 완료 결과 카드. 표시만 하고 데이터 조회를 하지 않는다.

**수정**
- `apps/page0127/src/features/book/ui/BookRegistrationForm.tsx` — JSX 순서 변경, 선택 필드 접기, 완독일 `required` 제거와 폴백, 한줄평 승격·포커스.
- `apps/page0127/app/(protected)/books/add/page.tsx` — 저장 후 완료 단계 추가.
- `apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx` — 취향 분석 진입 토스트 문구.

---

### Task 1: 등록 폼 승격·접기 + 완독일 `required` 제거

**Files:**
- Modify: `apps/page0127/src/features/book/ui/BookRegistrationForm.tsx`

**Interfaces:**
- Consumes: 없음 (첫 태스크). 기존 `isLifeBook` import 를 이미 쓰고 있다.
- Produces: 없음. props(`book`, `onSubmit`, `onCancel`, `isLoading`, `initialData`, `onReselectBook`)와 `BookFormData` 를 **바꾸지 않는다** — Task 3 이 이 계약에 의존한다.

- [ ] **Step 1: 한줄평 포커스용 ref 와 effect 를 추가한다**

파일 상단 import 에 `useEffect`, `useRef` 를 더한다(기존에 `useId`, `useReducer` 를 `react` 에서 가져오고 있다).

컴포넌트 본문에서 `const [state, dispatch] = useReducer(...)` 블록 **다음**에 추가:

```tsx
  // 완독 직후엔 손이 바로 문장으로 가야 한다 — 저장소 관례대로 autoFocus 속성 대신 ref 로 준다.
  // 수정 화면(initialData)에서는 포커스를 옮기지 않는다: 사용자는 다른 필드를 고치러 왔을 수 있다.
  const oneLineReviewRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (initialData) return;
    oneLineReviewRef.current?.focus();
  }, [initialData]);
```

`shared/ui/input.tsx` 의 `Input` 은 `...props` 를 그대로 `<input>` 에 펼치므로 React 19 에서 `ref` 가 그대로 전달된다.

- [ ] **Step 2: 완독일 폴백을 제출 로직에 넣는다**

`handleSubmit` 안의 완독 분기를 교체한다.

교체 전:

```ts
    // 완독: 완독일 필수
    if (status === 'completed') {
      formData.completed_date = completedDate;
    }
```

교체 후:

```ts
    // 완독일은 '더 남기기' 안에 접혀 있어 required 를 걸 수 없다.
    // 접힌 details 안의 빈 required 는 브라우저가 "not focusable" 로 제출을
    // 조용히 막는다 — 화면엔 아무 에러도 안 뜬다.
    // 기본값이 이미 오늘이므로 이 폴백은 사용자가 의도적으로 비운 경우에만 동작한다.
    if (status === 'completed') {
      formData.completed_date =
        completedDate || new Date().toISOString().split('T')[0];
    }
```

- [ ] **Step 3: 한줄평 블록을 평가 점수 위로 올린다**

현재 순서는 완독일 → 시작일 → 평가 점수 → 한줄평이다. 한줄평 블록 전체를 잘라내
**독서 상태 블록 바로 아래**로 옮기고, 라벨·placeholder·ref 를 바꾼다.

옮긴 뒤의 블록:

```tsx
          {/* 이 책을 한 문장으로 — 완독 기록의 핵심이라 가장 위에 둔다 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label htmlFor={ids.oneLineReview}>
                이 책을 한 문장으로 남긴다면?
              </Label>
              <Input
                id={ids.oneLineReview}
                ref={oneLineReviewRef}
                type='text'
                value={oneLineReview}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_ONE_LINE_REVIEW',
                    value: e.target.value,
                  })
                }
                placeholder='덮고 나서 남은 생각을 그대로 적어도 좋아요'
                maxLength={100}
              />
            </div>
          )}
```

placeholder 를 지시문("남겨주세요")에서 허락형으로 바꾸는 것이 요점이다 — 잘 쓸 필요가
없다는 신호를 줘야 손이 움직인다.

평가 점수 블록은 위치만 그대로 두면 자연히 한줄평 다음이 된다. **평가 점수 블록 내부는
한 글자도 바꾸지 않는다.**

- [ ] **Step 4: 선택 필드를 `<details>` 로 감싼다**

완독일·시작일·나만의 메모·태그·공개 설정 다섯 블록을 잘라내, 평가 점수 블록 **다음**,
버튼 블록 **앞**에 아래 구조로 넣는다. 다섯 블록의 내용은 완독일을 뺀 넷은 그대로다.

```tsx
          {/* 선택 항목은 접어 둔다 — 완독 기록에 필요한 입력은 사실 0개다
              (상태·완독일·공개 여부 모두 기본값이 옳다) */}
          <details
            open={!!initialData}
            className='rounded-lg border border-line p-4'
          >
            {/* summary 자체에 flex 를 주면 펼침 삼각형 마커가 사라진다. 안쪽 span 으로 정렬한다 */}
            <summary className='cursor-pointer text-sm font-semibold'>
              <span className='inline-flex items-center gap-2 align-middle'>
                더 남기기
              </span>
            </summary>

            <div className='mt-4 space-y-6'>
              {/* 완독일 - 완독 상태일 때만 표시 */}
              {status === 'completed' && (
                <div className='space-y-2'>
                  <Label htmlFor={ids.completedDate}>완독일</Label>
                  <Input
                    id={ids.completedDate}
                    type='date'
                    value={completedDate}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_COMPLETED_DATE',
                        date: e.target.value,
                      })
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    비워 두면 오늘로 기록해요.
                  </p>
                </div>
              )}

              {/* 아래 네 블록을 기존 파일에서 잘라내 이 순서대로 붙인다 (Step 4 설명 참고) */}
            </div>
          </details>
```

완독일에서 `required` 와 `Label` 의 `*` 가 사라진 것이 이 단계의 핵심이다.
`open={!!initialData}` 로 신규 등록은 접힘, 수정 화면은 펼침으로 시작한다.

**옮길 네 블록은 새로 쓰지 말고 기존 코드를 그대로 잘라 붙인다.** 편집 전 파일 기준
위치(주석으로 찾는 것이 안전하다):

| 블록 | 찾는 주석 | 편집 전 대략 위치 |
| --- | --- | --- |
| 시작일 | `{/* 시작일 - 완독 or 읽는중일 때만 표시 */}` | 314–346 |
| 나만의 메모 | `{/* 나만의 메모 */}` | 410–422 |
| 태그 | `{/* 태그 */}` | 424–445 |
| 공개/비공개 설정 | `{/* 공개/비공개 설정 */}` | 447–471 |

네 블록 모두 **내용을 한 글자도 바꾸지 않는다.** 들여쓰기만 `<div className='mt-4 space-y-6'>`
안쪽에 맞춘다. 순서는 위 표 그대로(시작일 → 메모 → 태그 → 공개 설정)이고, 완독일 블록이
그 앞에 온다.

- [ ] **Step 5: 린트·타입·테스트를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run lint && npm run type-check && npm test
```

Expected: 셋 다 exit 0. 테스트는 95개가 그대로 통과한다(이 태스크는 테스트를 더하지 않는다).
import 정렬 경고가 나면 `npm run lint:fix` 로 정리한다.

- [ ] **Step 6: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-b-record-ritual
git commit -o apps/page0127/src/features/book/ui/BookRegistrationForm.tsx -m "feat(book): 완독 기록을 한 문장 중심으로 재배치하고 선택 항목을 접는다

완독 등록에 실제로 필요한 입력은 0개다(상태·완독일·공개 여부 기본값이 옳다).
그런데 사용자는 8개 필드가 늘어선 긴 폼을 만난다. 한줄평을 6번째에서 3번째로
올리고 나머지 선택 항목을 '더 남기기'로 접어 결정할 것을 3개로 줄인다.

완독일의 required 를 제거했다. 접힌 details 안의 빈 required 는 브라우저가
'not focusable' 로 제출을 조용히 막는다 — 화면엔 에러가 안 뜬다.
대신 제출 시 빈 값이면 오늘로 채운다."
```

---

### Task 2: 결과 문구 순수 함수 (TDD)

컴포넌트에서 문구 생성을 분리해 카피 변경이 테스트로 잠기게 한다. 이 저장소에는 React
컴포넌트 테스트 하네스가 없으므로, 검증 가능한 유일한 조각이 이 함수다.

**Files:**
- Create: `apps/page0127/src/features/book/lib/savedBookMessage.ts`
- Test: `apps/page0127/src/features/book/lib/savedBookMessage.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `savedBookMessage(completedCount: number | null, readCount: number): string` — Task 3 의 `BookSavedCard` 가 이 함수를 쓴다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

Create `apps/page0127/src/features/book/lib/savedBookMessage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { savedBookMessage } from './savedBookMessage';

describe('savedBookMessage', () => {
  it('첫 권은 순서 대신 "첫 번째"로 부른다', () => {
    expect(savedBookMessage(1, 1)).toBe('첫 번째 책이 책장에 꽂혔어요');
  });

  it('두 번째부터는 몇 번째인지 알려준다', () => {
    expect(savedBookMessage(3, 1)).toBe('3번째 책이 책장에 꽂혔어요');
  });

  it('재독은 권수보다 회독을 먼저 말한다', () => {
    // 5권째이면서 2회독이면 "2회독"이 더 정확한 사건이다
    expect(savedBookMessage(5, 2)).toBe('2회독을 기록했어요');
  });

  it('권수를 못 가져와도 카드는 뜬다', () => {
    // 통계 조회가 실패해도 저장은 성공했다 — 숫자만 빼고 확인은 해준다
    expect(savedBookMessage(null, 1)).toBe('책장에 꽂혔어요');
  });

  it('권수가 0으로 와도 첫 권으로 취급한다', () => {
    // 방어: 통계가 방금 저장분을 아직 세지 않은 경우
    expect(savedBookMessage(0, 1)).toBe('첫 번째 책이 책장에 꽂혔어요');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```bash
cd apps/page0127 && npm test -- src/features/book/lib/savedBookMessage.test.ts
```

Expected: FAIL — `Failed to resolve import "./savedBookMessage"` (파일이 아직 없다)

- [ ] **Step 3: 최소 구현을 작성한다**

Create `apps/page0127/src/features/book/lib/savedBookMessage.ts`:

```ts
/**
 * 저장 직후 결과 카드에 띄울 확인 문구를 만든다.
 *
 * 컴포넌트에서 분리한 이유: 이 저장소에는 React 컴포넌트 테스트 하네스가 없어서,
 * 문구가 조용히 바뀌는 것을 잡을 방법이 이 함수의 단위 테스트뿐이다.
 *
 * @param completedCount 사용자의 완독 권수. 통계 조회에 실패하면 null
 * @param readCount 이 책을 몇 번째로 읽었는지 (재독이면 2 이상)
 */
export const savedBookMessage = (
  completedCount: number | null,
  readCount: number
): string => {
  // 재독은 "몇 권째"보다 "몇 회독"이 사용자에게 더 정확한 사건이다
  if (readCount > 1) return `${readCount}회독을 기록했어요`;

  // 통계를 못 가져와도 저장은 성공했다 — 숫자만 빼고 확인은 해준다
  if (completedCount === null) return '책장에 꽂혔어요';

  // 0은 통계가 방금 저장분을 아직 세지 않은 경우 — 첫 권으로 본다
  if (completedCount <= 1) return '첫 번째 책이 책장에 꽂혔어요';

  return `${completedCount}번째 책이 책장에 꽂혔어요`;
};
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```bash
cd apps/page0127 && npm test -- src/features/book/lib/savedBookMessage.test.ts
```

Expected: PASS — 5 tests passed

- [ ] **Step 5: 린트와 타입 검사를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run lint && npm run type-check
```

Expected: 둘 다 exit 0

- [ ] **Step 6: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-b-record-ritual
git add apps/page0127/src/features/book/lib/savedBookMessage.ts \
        apps/page0127/src/features/book/lib/savedBookMessage.test.ts
git commit -m "feat(book): 저장 결과 확인 문구를 순수 함수로 분리

컴포넌트 테스트 하네스가 없어서 문구가 조용히 바뀌는 것을 잡을 방법이
단위 테스트뿐이다. 재독 우선, 통계 조회 실패, 권수 0 방어까지 잠근다."
```

---

### Task 3: 결과 카드 + 저장 후 완료 단계

**Files:**
- Create: `apps/page0127/src/features/book/ui/BookSavedCard.tsx`
- Modify: `apps/page0127/app/(protected)/books/add/page.tsx`

**Interfaces:**
- Consumes:
  - Task 2 의 `savedBookMessage(completedCount: number | null, readCount: number): string`
  - 트랙 A 가 만든 `isLifeBook(rating: number | null): boolean` — 배럴 `@/entities/book`
  - 기존 `bookApi.getBookStats(): Promise<BookStats>` — 배럴 `@/entities/book`. `BookStats.totalCompletedBooks` 가 전체 기간 완독 권수다(`/api/books/stats` 가 연도 인자 없이 `getBookStats(user.id)` 를 부르므로 연도 범위가 걸리지 않는다)

**스펙과 다른 점(의도된 개선):** 스펙은 "`count: 'exact', head: true` 쿼리 한 개"라고 적었지만, 계획을 쓰며 확인해 보니 `bookApi.getBookStats()` 와 `/api/books/stats` 가 이미 있고 `totalCompletedBooks` 를 그대로 준다. 스펙이 지킨 제약("새 API 라우트를 만들지 않는다")은 그대로 만족하면서 새 조회 함수도 안 만든다. 대가는 count 대신 사용자 책 목록을 한 번 가져오는 것인데, 저장 후 1회만 도는 호출이고 타깃 사용자의 권수가 적어 수용한다.
- Produces: `BookSavedCard` 컴포넌트. props 는 아래 Step 1 참고

- [ ] **Step 1: 결과 카드 컴포넌트를 만든다**

Create `apps/page0127/src/features/book/ui/BookSavedCard.tsx`:

```tsx
'use client';

import Image from 'next/image';

import { isLifeBook } from '@/entities/book';

import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

import { savedBookMessage } from '../lib/savedBookMessage';

import type { BookRating } from '@/entities/book';

type BookSavedCardProps = {
  title: string;
  coverImage: string | null;
  /** 사용자가 남긴 한 문장. 없으면 인용 블록을 숨긴다 */
  oneLineReview: string | null;
  rating: BookRating | null;
  /** 완독 권수. 통계 조회 실패 시 null */
  completedCount: number | null;
  /** 이 책을 몇 번째로 읽었는지 */
  readCount: number;
  onGoToLibrary: () => void;
  onRecordAnother: () => void;
};

/**
 * 저장 직후 보여주는 결과 카드.
 *
 * 이 트랙의 핵심은 "사용자가 방금 쓴 문장을 되돌려주는 것"이다 —
 * 저장하고 목록으로 사라지면 기록했다는 감각이 남지 않는다.
 * 표시만 하고 데이터 조회는 하지 않는다(호출부가 다 넘겨준다).
 */
export const BookSavedCard = ({
  title,
  coverImage,
  oneLineReview,
  rating,
  completedCount,
  readCount,
  onGoToLibrary,
  onRecordAnother,
}: BookSavedCardProps) => (
  <Card>
    <CardContent className='space-y-6 py-8'>
      <div className='flex flex-col items-center gap-4 text-center'>
        {coverImage && (
          <Image
            src={coverImage}
            alt=''
            width={120}
            height={174}
            className='book-cover h-auto w-[120px]'
          />
        )}

        <div className='space-y-1'>
          <p className='heading-2 text-text-strong'>
            {savedBookMessage(completedCount, readCount)}
          </p>
          <p className='text-sm text-text-subtle'>{title}</p>
        </div>

        {isLifeBook(rating) && (
          <span className='rounded-full bg-chart-3/15 px-3 py-1 text-sm font-semibold text-chart-3'>
            인생책
          </span>
        )}
      </div>

      {/* 사용자가 쓴 문장을 그대로 되돌려준다 — 이 카드의 존재 이유다 */}
      {oneLineReview && (
        <blockquote className='rounded-lg bg-sunken px-4 py-3 text-center text-text-body'>
          {oneLineReview}
        </blockquote>
      )}

      <div className='flex gap-3'>
        <Button onClick={onGoToLibrary} className='flex-1'>
          내 책장 보기
        </Button>
        <Button variant='outline' onClick={onRecordAnother} className='flex-1'>
          한 권 더 기록
        </Button>
      </div>
    </CardContent>
  </Card>
);
```

- [ ] **Step 2: 저장 페이지에 완료 단계 state 를 추가한다**

`apps/page0127/app/(protected)/books/add/page.tsx` 의 import 에 더한다:

```tsx
import { bookApi } from '@/entities/book';

import { BookSavedCard } from '@/features/book/ui/BookSavedCard';
```

`const [isLoadingDetail, setIsLoadingDetail] = useState(false);` 아래에 추가:

```tsx
  // 저장 완료 단계 — 검색/폼과 같은 방식으로 state 전환한다(라우트를 늘리지 않는다).
  // 완독일 때만 채워진다. 읽고싶어요·읽는 중은 예전처럼 서재로 보낸다.
  const [saved, setSaved] = useState<{
    book: Book;
    completedCount: number | null;
    readCount: number;
  } | null>(null);
```

- [ ] **Step 3: `handleSubmit` 의 성공 분기를 교체한다**

교체 전:

```tsx
    if (result) {
      const message =
        readCount > 1
          ? `${readCount}회독 도서가 등록되었습니다!`
          : '도서가 등록되었습니다!';
      toast.success(message);

      // 상태 초기화
      setExistingBook(null);

      router.push('/books'); // 도서 목록 페이지로 이동

      // 책등 이미지 존재 여부 확인 — 등록을 막지 않도록 결과를 기다리지 않는다
      validateSpineImageUrl(selectedBook.cover, selectedBook.isbn13).then(
        (spineImage) => updateBook(result.id, { spine_image: spineImage })
      );
    } else {
      toast.error('도서 등록에 실패했습니다.');
    }
```

교체 후:

```tsx
    if (result) {
      // 상태 초기화
      setExistingBook(null);

      // 책등 이미지 존재 여부 확인 — 등록을 막지 않도록 결과를 기다리지 않는다
      validateSpineImageUrl(selectedBook.cover, selectedBook.isbn13).then(
        (spineImage) => updateBook(result.id, { spine_image: spineImage })
      );

      // 완독이 아니면 "책장에 꽂혔어요"가 거짓이 된다 — 예전 흐름 그대로 서재로 보낸다
      if (formData.status !== 'completed') {
        toast.success('도서가 등록되었습니다!');
        router.push('/books');
        return;
      }

      // 완독 권수는 결과 문구에만 쓴다. 실패해도 카드는 떠야 하므로 막지 않는다.
      // (Supabase 클라이언트에 Database 제네릭이 없어 런타임 error 가 유일한 신호다)
      let completedCount: number | null = null;
      try {
        const stats = await bookApi.getBookStats();
        completedCount = stats.totalCompletedBooks;
      } catch (err) {
        console.warn('완독 권수 조회 실패:', err);
      }

      setSaved({ book: result, completedCount, readCount });
    } else {
      toast.error('도서 등록에 실패했습니다.');
    }
```

완독일 때 `toast.success` 를 없앤 것은 의도다 — 결과 카드가 같은 확인을 더 잘 한다.

- [ ] **Step 4: 완료 단계 핸들러와 렌더 분기를 추가한다**

`handleCancel` 아래에 추가:

```tsx
  const handleRecordAnother = () => {
    setSaved(null);
    setSelectedBook(null);
  };
```

렌더 부분에서 기존 `{!selectedBook ? ( … ) : ( … )}` 삼항을 완료 단계가 먼저 오도록 바꾼다.
`<h1>` 바로 아래의 조건부 전체를 아래로 교체한다:

```tsx
        {saved ? (
          <BookSavedCard
            title={saved.book.title}
            coverImage={saved.book.cover_image}
            oneLineReview={saved.book.one_line_review}
            rating={saved.book.rating}
            completedCount={saved.completedCount}
            readCount={saved.readCount}
            onGoToLibrary={() => router.push('/books')}
            onRecordAnother={handleRecordAnother}
          />
        ) : !selectedBook ? (
          … 기존 검색 UI 블록(`<div className='space-y-6'>` … `</div>`)을 그대로 …
        ) : (
          … 기존 등록 폼 블록(`<>` … `</>`)을 그대로 …
        )}
```

**기존 두 블록은 새로 쓰지 말고 그대로 둔다.** 편집 전 파일에서 검색 UI 는 205–252행
(`{/* 검색 입력 */}` 로 시작), 등록 폼은 255–268행(`{isLoadingDetail ? …}`)이다.
이 단계가 하는 일은 **기존 삼항 앞에 `saved ?` 분기 하나를 추가하는 것뿐**이고, 두 블록의
내용은 한 글자도 바뀌지 않는다.

- [ ] **Step 5: 린트·타입·테스트·빌드를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run lint && npm run type-check && npm test && npm run build
```

Expected: 넷 다 exit 0. 빌드는 새 컴포넌트가 서버/클라이언트 경계를 어기지 않았는지까지
확인해 준다.

- [ ] **Step 6: 커밋한다**

`BookSavedCard.tsx` 는 새 파일이라 `git commit -o` 가 인식하지 못한다. 두 경로를 함께
`git add` 한 뒤 커밋한다.

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-b-record-ritual
git add apps/page0127/src/features/book/ui/BookSavedCard.tsx \
        "apps/page0127/app/(protected)/books/add/page.tsx"
git commit -m "feat(book): 완독 저장 후 결과 카드를 보여준다

저장하면 toast 하나 띄우고 목록으로 보내서, 방금 쓴 문장이 화면에서 사라졌다.
'떠오른 생각을 잃기 전에 남긴다'는 약속의 증거가 없었던 셈이다.

라우트 대신 페이지 내 state 단계를 더했다(검색/폼과 같은 방식).
공유 링크가 필요해지는 시점은 트랙 E 이고, 그때 라우트로 올린다.
완독일 때만 띄운다 — 읽고싶어요에는 '책장에 꽂혔어요'가 거짓이다."
```

---

### Task 4: 취향 분석 진입 토스트 문구

**Files:**
- Modify: `apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx`

**Interfaces:**
- Consumes: 이 컴포넌트가 이미 prop 으로 받는 `analyzableBookCount: number`
- Produces: 없음

- [ ] **Step 1: 진입 토스트를 긍정형으로 바꾼다**

`handleAnalyzeTaste` 의 첫 분기를 교체한다.

교체 전:

```tsx
    if (analyzableBookCount < 5) {
      toast.error(
        '취향 분석을 위해 최소 5권의 완독한 책(별점 포함)이 필요합니다.'
      );
      return;
    }
```

교체 후:

```tsx
    if (analyzableBookCount < 5) {
      // "필요합니다"(요건)가 아니라 "볼 수 있어요"(가까워진 보상)로 말한다.
      // 5권 게이트 자체는 AI 비용과 묶인 제품 결정이라 그대로 둔다.
      toast.info(
        `별점을 남긴 완독 책이 ${5 - analyzableBookCount}권 더 모이면 취향 분석을 볼 수 있어요.`
      );
      return;
    }
```

`toast.error` → `toast.info` 로 바꾸는 것도 의도다. 사용자가 잘못한 것이 아니다.

재분석 토스트(`newBooksSinceLastAnalysis` 분기)는 이미 남은 양을 알려주는 긍정형이므로
**손대지 않는다.**

- [ ] **Step 2: 린트와 타입 검사를 통과하는지 확인한다**

```bash
cd apps/page0127 && npm run lint && npm run type-check
```

Expected: 둘 다 exit 0

- [ ] **Step 3: 커밋한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-b-record-ritual
git commit -o apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx \
  -m "fix(taste): 취향 분석 진입 문구를 남은 권수 안내로 바꾼다

'최소 5권이 필요합니다'는 요건 통보라 첫 보상이 멀게 느껴진다.
몇 권 남았는지 알려주고, 사용자가 잘못한 게 아니므로 error 대신 info 로 띄운다.
5권 게이트 자체는 AI 비용과 묶인 제품 결정이라 유지한다."
```

---

### Task 5: 전체 검증

**Files:** 없음 (검증만)

**Interfaces:**
- Consumes: Task 1~4 의 모든 변경
- Produces: 없음

- [ ] **Step 1: 전체 자동 검사를 실행한다**

```bash
cd apps/page0127 && npm test && npm run lint && npm run type-check && npm run build
```

Expected: 넷 다 exit 0. 테스트는 100개(기존 95 + `savedBookMessage` 5).

- [ ] **Step 2: 커밋되지 않은 변경이 없는지 확인한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-b-record-ritual
git status --short
```

Expected: 비어 있다. `.env.local` 은 gitignore 대상이라 나타나지 않는다.

- [ ] **Step 3: 커밋 4개가 트레일러 없이 쌓였는지 확인한다**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127/.claude/worktrees/track-b-record-ritual
git log --oneline main..HEAD | cat
git log main..HEAD --format='%B' | grep -i 'co-authored-by' && echo '위반 발견' || echo '트레일러 없음'
```

Expected: 커밋 6개 — 스펙, 계획, Task 1, Task 2, Task 3, Task 4. 그리고 `트레일러 없음`.

---

## 수동 검증 (사용자 단계)

로컬 Supabase 가 필요하다. 형제 worktree 가 같은 로컬 DB 를 공유하므로 로컬 스키마가
main 과 다를 수 있다는 점을 감안한다.

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127
npx supabase start
cd .claude/worktrees/track-b-record-ritual/apps/page0127 && PORT=3100 npm run dev
```

| 확인 | 기대 |
| --- | --- |
| 신규 등록에서 완독 선택 | 보이는 결정이 3개 (상태 · 한 문장 · 평가) |
| 페이지 열자마자 | 커서가 "이 책을 한 문장으로 남긴다면?" 입력란에 있다 |
| `더 남기기` 를 펼치지 않고 저장 | 정상 저장된다 |
| **완독일을 지우고 접은 채 저장** | **조용히 막히지 않고 오늘로 저장된다** (`required` 회귀 검사) |
| 저장 후 | 결과 카드가 뜨고 내가 쓴 한줄평이 인용된다 |
| 인생책으로 저장 | 결과 카드에 `인생책` 배지 |
| `한 권 더 기록` | 검색 단계로 돌아간다 |
| 읽고싶어요로 저장 | 결과 카드 없이 서재로 이동 |
| 수정 화면 진입 | `더 남기기` 가 펼쳐진 상태, 포커스가 튀지 않는다 |
| 완독 4권인 계정에서 취향 분석 클릭 | `1권 더 모이면 …` 토스트 |

## 이번 범위에서 제외

- 카테고리 "결" 표시 — 신규 결 판정에 조회가 더 필요하고 문구가 거짓이 될 수 있다
- 공유 카드 이미지·사용자별 동적 OG — 트랙 E
- 활성화·재방문 이벤트 계측 — 트랙 D
- 주간 회상 메일·알림 — 트랙 C
- 취향 분석 5권 게이트 조정 — 제품 결정, 유지
- 등록 폼을 신규·수정 두 컴포넌트로 분리 — prop 한 개로 해결되므로 불필요
