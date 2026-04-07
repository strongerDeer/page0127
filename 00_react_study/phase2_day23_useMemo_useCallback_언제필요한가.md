# Day 23 — useMemo / useCallback, 언제 필요한가?

> React 19 Compiler 시대에 memoization이 진짜 필요한 경우와 불필요한 경우를 구분한다.

---

## 1. 오늘 읽을 코드

- [CommentSection.tsx](../apps/page0127/src/features/comment/ui/CommentSection.tsx) — `totalCount` useMemo (과도한 사례)
- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — `filteredBooks` useMemo (적절한 사례)
- [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — `completedBooksInYear` useMemo

---

## 2. 핵심 개념

### React 19 Compiler가 바꾼 것

React 19에서는 **React Compiler**가 컴포넌트를 자동으로 memoize한다.
즉, 개발자가 직접 `useMemo` / `useCallback`을 쓰지 않아도 컴파일러가 처리한다.

```
React Compiler = 자동 useMemo + 자동 useCallback
```

→ 앞으로는 **"기본적으로 안 쓰고, 필요할 때만 쓰는"** 방향이 맞다.

---

### 언제 useMemo가 필요한가?

| 상황 | 필요 여부 | 이유 |
|------|-----------|------|
| 복잡한 filter + sort (O(n) 이상) | ✅ 필요 | 렌더링마다 재계산 비용이 크다 |
| 파생 값이 다른 useMemo/useEffect의 의존성 | ✅ 필요 | 참조 동일성이 중요 |
| 단순 사칙연산, 짧은 배열 reduce | ❌ 불필요 | 계산 비용이 캐싱 비용보다 작다 |
| 상수값, 렌더링마다 같은 결과 | ❌ 불필요 | 그냥 변수로 써도 된다 |

### 언제 useCallback이 필요한가?

| 상황 | 필요 여부 | 이유 |
|------|-----------|------|
| `React.memo`로 감싼 자식 컴포넌트에 전달 | ✅ 필요 | 참조가 바뀌면 자식도 리렌더 |
| `useEffect` 의존성 배열 안에 포함 | ✅ 필요 | 렌더마다 새 함수 → 무한 effect |
| 이벤트 핸들러, 자식 없이 그냥 사용 | ❌ 불필요 | 참조 동일성 필요 없음 |

---

## 3. page0127 실제 코드 사례

### ✅ 적절한 useMemo — `filteredBooks`

```tsx
// DashboardBookList.tsx:140
const filteredBooks = useMemo(
  () =>
    books
      .filter((book) => {
        // 상태 / 월 / 카테고리 / 평점 / 검색어 5가지 조건 필터
        ...
      })
      .sort((a, b) => { ... }),
  [books, statusFilter, selectedMonth, selectedCategory, selectedRating, searchQuery, sortOption]
);
```

**왜 적절한가?**
- `books` 배열이 수백 개일 수 있다 (O(n) filter + sort)
- 페이지 이동, 캘린더 클릭 등 **무관한 상태 변경** 때마다 재계산을 막아야 한다

---

### ❌ 과도한 useMemo — `totalCount`

```tsx
// CommentSection.tsx:44
// useMemo: isExpanded 토글 시 comments가 바뀌지 않으면 재계산 없이 캐시 반환
const totalCount = useMemo(
  () =>
    comments.reduce(
      (count, comment) => count + 1 + (comment.replies?.length || 0),
      0
    ),
  [comments]
);
```

**왜 과도한가?**
- `comments` 배열이 바뀔 때만 재계산 → 어차피 바뀌면 계산해야 한다
- `reduce`는 댓글 수십 개 수준에서 **무시할 수 있는 연산**
- `useMemo` 자체도 메모리 + 비교 비용이 있다 → 오히려 손해

**리팩토링 (제거가 맞다):**
```tsx
// useMemo 없이 그냥 변수로
const totalCount = comments.reduce(
  (count, comment) => count + 1 + (comment.replies?.length || 0),
  0
);
```

---

## 4. 판단 규칙 1줄

> **"비싼 계산이거나, 참조 동일성이 필요할 때만 memoize한다."**

실전 체크리스트:
- [ ] 이 계산이 100ms 이상 걸리나? → useMemo
- [ ] 이 함수가 자식 컴포넌트(memo) 또는 useEffect 의존성에 들어가나? → useCallback
- [ ] 아니라면 → 그냥 변수 / 인라인 함수

---

## 5. 오늘 실험

### 실험 1 — `totalCount` useMemo 제거

`CommentSection.tsx`에서 `useMemo`를 제거하고 일반 변수로 교체한다.

```tsx
// Before
const totalCount = useMemo(
  () => comments.reduce(...),
  [comments]
);

// After (제거)
const totalCount = comments.reduce(
  (count, comment) => count + 1 + (comment.replies?.length || 0),
  0
);
```

→ 동작이 동일한지 확인. React DevTools Profiler로 렌더 횟수 변화 없는지 체크.

### 실험 2 — React DevTools Profiler로 비교

1. Profiler 탭 열기
2. 댓글 토글 버튼 클릭 (isExpanded 변경)
3. `CommentSection` 리렌더 원인이 `isExpanded` state 변경인지 확인
4. `totalCount` 재계산이 필요 없었음을 확인

---

## 6. 다음 Day 예고

**Day 24 — useContext: 전역 상태의 시작**
- Context API로 로그인 유저 정보 전달
- `useContext` + Provider 패턴
- Context re-render 문제와 최적화
