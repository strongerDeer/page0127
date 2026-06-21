# Day 63 — React.memo (불필요한 리렌더 막기)

> Phase 6 · 성능 최적화 | 주제: `React.memo` 적용 + 비교 함수, Profiler로 리렌더 횟수 비교

---

## 1. 오늘 읽을 코드

- [BookCard.tsx](../apps/page0127/src/features/book/ui/BookCard.tsx) — compound component (children만 받음)
- [BookCardInfo.tsx](../apps/page0127/src/features/book/ui/BookCardInfo.tsx) — `book`, `onDelete` props 받는 `'use client'` 컴포넌트 → **memo 적용 후보**

---

## 2. 핵심 개념

### React.memo란?

> **props가 바뀌지 않으면 리렌더를 건너뛰는** 고차 컴포넌트(HOC).

부모가 리렌더되면 자식은 props가 그대로여도 **기본적으로 같이 리렌더**된다.
`React.memo`로 감싸면 React가 **이전 props와 현재 props를 얕은 비교(shallow compare)** 해서 같으면 건너뛴다.

```tsx
// 감싸기만 하면 된다 (named export 유지)
export const BookCardInfo = memo(({ book, onDelete }: BookCardInfoProps) => {
  return <div>...</div>;
});
```

### 얕은 비교의 함정 — 객체/함수는 매번 새로 생긴다

```tsx
// ❌ 부모가 리렌더될 때마다 onDelete가 "새 함수" → memo 무효화
<BookCardInfo book={book} onDelete={(id) => deleteBook(id)} />

// ✅ useCallback으로 함수 참조 고정 → memo가 실제로 작동
const handleDelete = useCallback((id: string) => deleteBook(id), []);
<BookCardInfo book={book} onDelete={handleDelete} />
```

> 핵심: `React.memo`는 **참조 안정성(useCallback/useMemo)** 과 **세트**로 써야 효과가 난다.
> 함수 props를 인라인으로 넘기면 memo를 씌워도 매번 리렌더된다.

### 비교 함수 (두 번째 인자)

얕은 비교로 부족할 때 **직접 비교 로직**을 넘긴다. `true`를 반환하면 "같음 → 리렌더 스킵".

```tsx
export const BookCardInfo = memo(
  ({ book, onDelete }: BookCardInfoProps) => { ... },
  // (prev, next) => 같으면 true
  (prev, next) =>
    prev.book.id === next.book.id &&
    prev.book.status === next.book.status &&
    prev.book.read_count === next.book.read_count &&
    prev.onDelete === next.onDelete
);
```

> ⚠️ 비교 함수의 반환값은 직관과 **반대**다.
> `true` = props 같음 = **리렌더 안 함**, `false` = 다름 = 리렌더 함.
> `shouldComponentUpdate`와 반대라 헷갈리기 쉽다.

---

## 3. page0127 실제 사례 — 전수조사 후 DashboardBookList 리팩토링

### 먼저: `children` 래퍼는 memo 효과가 없다

[BookCard.tsx](../apps/page0127/src/features/book/ui/BookCard.tsx)는 `children`만 받는다.
`children`은 매 렌더마다 **새 element 객체** → 얕은 비교가 항상 실패 → memo 무의미.
→ memo 대상은 `children` 래퍼가 아니라 **구체적 데이터를 받는 리스트 아이템**이다.

### 전수조사 결과 (memo 0곳 → 후보 탐색)

| 위치 | 아이템 분리 | 부모 리렌더 | 실익 |
| --- | --- | --- | --- |
| **DashboardBookList** | ❌ 인라인 JSX | **높음**(검색·필터·정렬) | ⭐ 구조개선 필요 |
| CommentItem | ✅ | 낮음 | 높음 |
| UserCard / NotificationItem | ✅ | 중간 | 중간 |
| ActivityFeed, FollowListModal | ✅ | 거의 없음 | 낮음 |

→ 가장 실익 큰 [DashboardBookList](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx)를 골랐다.
인라인 JSX라 **컴포넌트 추출이 선행**돼야 했고, 추출 자체는 Compiler 적용 후에도 남는 자산.

### Before — 인라인 JSX (memo 불가)

```tsx
{paginatedBooks.map((book) => (
  <Link key={book.id} href={bookHref(book)}>...35줄...</Link>
))}
```

### After — [BookGridItem.tsx](../apps/page0127/src/features/stats/ui/BookGridItem.tsx) 추출 + memo

```tsx
export const BookGridItem = memo(({ book, href }: BookGridItemProps) => {
  return <Link href={href}>...</Link>;
});
BookGridItem.displayName = 'BookGridItem'; // Profiler 식별용

// 부모: map 본문이 한 줄로
{paginatedBooks.map((book) => (
  <BookGridItem key={book.id} book={book} href={bookHref(book)} />
))}
```

### memo가 실제로 작동하는 이유 (핵심)

```tsx
const filteredBooks = useMemo(() => books.filter(...).sort(...), [...]);
//                                       ↑ filter/sort는 원본 book 객체 참조를 "유지"
```

- `book` → `filter()`/`sort()`는 새 배열을 만들지만 **원소 참조는 그대로** → `prev.book === next.book`
- `href` → `string`(원시값) → 값 비교로 통과

> 만약 부모가 `book={{...book}}`(spread 복사)나 인라인 함수로 넘겼다면 참조가 매번 달라져 memo가 깨졌을 것. 지금은 둘 다 안정적이라 효과가 있다.

---

## 4. 정리

| 상황 | memo 효과 | 이유 |
| --- | --- | --- |
| `book` 등 원시값/안정적 객체 props | ✅ 큼 | 얕은 비교 통과 |
| `children` 받는 래퍼 | ❌ 없음 | element가 매번 새 객체 |
| 인라인 함수 `onClick={() => ...}` props | ❌ 무효 | 함수 참조가 매번 바뀜 |
| `useCallback` + memo 세트 | ✅ 큼 | 참조 고정 |

> **규칙 1줄**: `React.memo`는 _"props가 안정적인 리스트 아이템"_ 에만 효과 있다 — 함수는 `useCallback`, 객체는 참조 유지로 짝지어라.

---

## 5. 오늘 실험 (2가지) — 실제 리팩토링한 BookGridItem으로

### 실험 1 — Profiler로 memo 전/후 비교
1. `/dashboard` → React DevTools → **Profiler** → ⚙️ "Highlight updates when components render" 켜기
2. 검색창에 글자 한 개 입력 → 깜빡이는 영역 관찰
   - **after(현재)**: 입력칸·카운트만 깜빡, `BookGridItem`들은 안 깜빡임 ✅
   - **before 재현**: [BookGridItem.tsx](../apps/page0127/src/features/stats/ui/BookGridItem.tsx)에서 `memo(...)`를 잠깐 벗기고
     (`export const BookGridItem = ({ book, href }) => ...`) 다시 입력 → 책 카드 전부 깜빡 ❌
3. 확인 후 `memo()` 다시 씌우기

### 실험 2 — memo를 깨뜨려보기 (참조 안정성 체감)
1. 부모 map에서 `book={{ ...book }}`(spread 복사)로 바꿔본다
   → 매번 새 객체 참조 → Profiler에서 다시 전부 깜빡임 (memo 무효!)
2. 원래대로 `book={book}` 복구 → 멈추는지 확인
3. 보너스: `memo(Comp, () => true)`(항상 같음) 비교 함수를 넣으면
   → **데이터가 바뀌어도 화면이 안 바뀌는 버그** 재현 → 비교 함수의 위험성 체감

---

## 6. 다음 Day 예고

**Day 64 — React Compiler 이해**: 오늘 손으로 한 `memo`/`useCallback`을
React Compiler가 **자동으로** 해주는 범위를 파악한다. "수동 memo를 언제까지 써야 하나?"의 답.
