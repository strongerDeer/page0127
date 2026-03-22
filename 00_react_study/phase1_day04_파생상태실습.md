# Day 04 — 파생 상태 실습

> Phase 1 | 2026-03-24
> 연결 코드: `features/stats/ui/DashboardBookList.tsx`

---

## 오늘 할 일

`DashboardBookList.tsx`를 직접 읽고, 아래 두 가지를 찾는다.
1. 어떤 값이 state이고 어떤 값이 파생인지 분류한다
2. 파생 값들이 어떤 state를 재료로 계산되는지 확인한다

---

## 코드 읽기 — 80~156번 줄

```tsx
// ✅ state — 사용자가 직접 선택
const [currentPage, setCurrentPage] = useState(1);
const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');
const [sortOption, setSortOption]     = useState<string>('created_at-desc');

// ✅ 파생 — 여러 state + props로 계산
const filteredBooks = books
  .filter((book) => {
    if (statusFilter !== 'all' && book.status !== statusFilter) return false; // state 사용
    if (selectedMonth !== null && book.completed_date) {                      // props 사용
      const bookMonth = new Date(book.completed_date).getMonth() + 1;
      if (bookMonth !== selectedMonth) return false;
    }
    if (selectedCategory !== null) { ... }  // props 사용
    if (selectedRating !== null)   { ... }  // props 사용
    if (searchQuery.trim())        { ... }  // props 사용
    return true;
  })
  .sort(...); // state(sortOption) 사용

// ✅ 파생의 파생 — filteredBooks로 계산
const totalPages     = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
const startIndex     = (currentPage - 1) * BOOKS_PER_PAGE;
const paginatedBooks = filteredBooks.slice(startIndex, startIndex + BOOKS_PER_PAGE);
```

---

## 파생 관계 정리

```
[state]                    [props]
currentPage                books (서버 데이터)
statusFilter               selectedMonth
sortOption                 selectedCategory
                           selectedRating
                           searchQuery
       ↓ 재료로 계산
   filteredBooks  (파생)
       ↓ 재료로 계산
   totalPages     (파생의 파생)
   paginatedBooks (파생의 파생)
```

파생이 또 다른 파생의 재료가 될 수 있다. 계산 결과를 이어서 계산하면 된다.

---

## entities/book/ 에는 모델 함수가 없다

```
entities/book/
├── api/       ← 서버 호출
├── model/     ← queryKeys.ts 만 있음 (필터 함수 없음)
└── types.ts   ← Book, BookStatus, BookRating 타입
```

현재는 필터 로직이 `DashboardBookList.tsx` 컴포넌트 안에 있다.
규모가 커지면 `entities/book/model/` 아래에 순수 함수로 뽑아낼 수 있다.

```ts
// 예시 — 이렇게 뽑아낼 수 있다 (지금 당장 안 해도 됨)
// entities/book/model/filterBooks.ts
export function filterBooks(books: Book[], filters: BookFilters): Book[] {
  return books.filter((book) => { ... });
}
```

지금은 컴포넌트 안에 있어도 충분하다. **필터 함수가 여러 컴포넌트에서 재사용될 때** model로 분리하는 게 맞다.

---

## 확인 문제

코드를 보면서 스스로 답해보자.

**Q1.** `totalPages`가 `useState`가 아닌 이유는?

**Q2.** `paginatedBooks`의 재료가 되는 값들은 무엇인가?

**Q3.** `sortOption`이 바뀌면 `filteredBooks`도 바뀌는 이유는?

<details>
<summary>정답 확인</summary>

**A1.** `filteredBooks.length`로 계산 가능하기 때문. 계산할 수 있으면 state가 아니다.

**A2.** `filteredBooks` (파생) + `currentPage` (state). 파생이 또 다른 파생의 재료가 된다.

**A3.** `filteredBooks`는 렌더링마다 새로 계산된다. `sortOption`이 state이므로 바뀌면 리렌더링 → `filteredBooks` 재계산 → 자동으로 정렬된 목록이 나온다.

</details>

---

## 오늘의 핵심

> **파생은 체인처럼 연결된다.**
> state → 파생 → 파생의 파생 → 화면 렌더링
> 어느 하나가 바뀌면 아래 체인 전체가 자동으로 다시 계산된다.
