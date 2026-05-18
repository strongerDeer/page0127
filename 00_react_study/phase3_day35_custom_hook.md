# Day 35 — Custom Hook

> 날짜: 2026-04-14 | 주제: 커스텀 훅으로 로직을 컴포넌트에서 분리

---

## 1. 오늘 읽을 코드

- [useBookSearch.ts](../apps/page0127/src/features/book/api/useBookSearch.ts) — 검색 로직 Custom Hook
- [useBookCRUD.ts](../apps/page0127/src/features/book/api/useBookCRUD.ts) — CRUD 로직 Custom Hook
- [BookSearchInput.tsx](../apps/page0127/src/features/book/ui/BookSearchInput.tsx) — 로직이 분리된 순수 UI 컴포넌트

---

## 2. 핵심 개념

### Custom Hook이란?

`use`로 시작하는 함수로, **React 훅을 조합해 재사용 가능한 로직 단위**를 만드는 패턴.
컴포넌트에서 로직을 꺼내면 컴포넌트는 UI만 담당하게 된다.

```
컴포넌트 (Before)           컴포넌트 (After)
┌──────────────────┐        ┌──────────────┐   ┌──────────────────┐
│ UI               │        │ UI           │   │ Custom Hook      │
│ + 상태 관리      │  →     │ (렌더만)     │ + │ (상태/로직)      │
│ + API 호출       │        └──────────────┘   └──────────────────┘
│ + 에러 처리      │
└──────────────────┘
```

### 추출 기준

| 신호 | 의미 |
| ---- | ---- |
| 컴포넌트에 상태가 3개 이상 묶여 움직인다 | 커스텀 훅으로 추출 |
| 같은 로직이 두 곳 이상에서 반복된다 | 커스텀 훅으로 추출 |
| 컴포넌트가 UI보다 로직이 더 많다 | 커스텀 훅으로 추출 |
| API 호출 + loading + error 세트 | 커스텀 훅으로 추출 |

---

## 3. page0127 실제 코드 사례

### useBookSearch — 검색 로직 분리

내부에 `useReducer`로 6개 상태를 관리하지만, **사용하는 쪽에는 단순한 인터페이스**만 노출한다.

```tsx
// 사용처: BookRegistrationForm 등
const { books, isLoading, error, search, goToPage, currentPage, totalResults } =
  useBookSearch();

// ← 컴포넌트는 이것만 알면 된다. 내부 reducer 구조는 몰라도 됨.
```

내부 구조:
```tsx
// features/book/api/useBookSearch.ts
export const useBookSearch = () => {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const search = async (query: string, page = 1) => {
    dispatch({ type: 'SEARCH_START', query, page });
    try {
      const response = await searchBooks(query, { page, maxResults: 10 });
      dispatch({ type: 'SEARCH_SUCCESS', books: response.item, totalResults: response.totalResults });
    } catch {
      dispatch({ type: 'SEARCH_ERROR' });
    }
  };

  // state를 풀어서 반환 → 사용처가 구조 변경에 영향을 덜 받는다
  return { books: state.books, isLoading: state.isLoading, error: state.error, search, ... };
};
```

### useBookCRUD — CRUD 로직 분리

API 호출마다 반복되는 `isLoading` / `error` / `finally` 패턴을 훅 안으로 가져갔다.

```tsx
// features/book/api/useBookCRUD.ts
export const useBookCRUD = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBook = async (bookData: BookInput): Promise<Book | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await bookApi.createBook(bookData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false); // 성공/실패 둘 다 loading OFF
    }
  };

  return { isLoading, error, createBook, updateBook, deleteBook, ... };
};
```

### BookSearchInput — 로직이 없는 순수 UI

```tsx
// features/book/ui/BookSearchInput.tsx
type BookSearchInputProps = {
  onSearch: (query: string) => void; // 로직은 밖에서 주입
  isLoading?: boolean;
};

export const BookSearchInput = ({ onSearch, isLoading = false }: BookSearchInputProps) => {
  const [query, setQuery] = useState(''); // 입력값만 로컬 상태로 관리

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(query); }}>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} disabled={isLoading} />
      <Button disabled={isLoading || !query.trim()}>검색</Button>
    </form>
  );
};
```

컴포넌트는 "사용자가 폼을 제출하면 `onSearch`를 호출한다"만 안다.  
검색 API 호출, 페이징, 에러 처리는 `useBookSearch`가 담당한다.

---

## 4. 훅 분리 기준

### "변경 이유"가 다르면 나눈다

기능 개수나 파일 길이가 아니라 **"이 부분이 바뀌는 이유가 다른가?"** 가 기준이다.

```
useBookSearch 안에 있는 것들
├── 검색 API 호출      ← 서버 스펙이 바뀌면 변경
├── loading / error    ← 검색 API와 항상 같이 변경  → 같은 훅
├── pagination         ← 페이지 UI 정책이 바뀌면 변경 → 커지면 분리 가능
└── 정렬 / 필터        ← 비즈니스 요구사항이 바뀌면 변경 → 커지면 분리 가능
```

### Facade 훅 패턴

잘게 나눈 훅들을 조합해 컴포넌트에 하나의 인터페이스로 제공한다.

```tsx
// 컴포넌트는 이것 하나만 호출
const { books, filter, page, search } = useBookSearch();

// useBookSearch 안에서 조합 (facade)
export const useBookSearch = () => {
  const api = useBookSearchApi();   // 서버 통신만
  const filter = useBookFilter();   // 필터/정렬 로컬 상태
  const pagination = usePagination(); // 다른 곳에서도 재사용

  return { ...api, filter, ...pagination };
};
```

### 나누면 안 되는 신호

| 신호 | 판단 |
| ---- | ---- |
| 세 훅을 항상 같이 호출한다 | 하나로 합친다 |
| 훅 A가 훅 B의 state를 직접 참조한다 | 분리가 잘못된 것 |
| 훅이 3줄짜리다 | 너무 잘게 쪼갠 것 |

**결론**: 재사용되는 게 생기거나, 변경 이유가 명확히 달라질 때 꺼낸다. 미리 나눌 필요 없다.

---

## 5. 정리

**규칙**: 컴포넌트에서 `use`훅 + API 호출이 보이면 커스텀 훅 추출을 고려한다.  
컴포넌트는 렌더링만, 훅은 로직만 담당하면 테스트와 재사용이 쉬워진다.

---

## 5. 오늘 실험

### 실험 1 — useBookCRUD를 직접 컴포넌트에 썼다면?

`useBookCRUD`가 없었다면 `BookRegistrationForm` 안이 어떻게 생겼을지 상상해본다.

```tsx
// ❌ 훅 없이 컴포넌트 안에서 직접 관리했다면
export const BookRegistrationForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: BookInput) => {
    setIsLoading(true);
    setError(null);
    try {
      await bookApi.createBook(data);
    } catch (err) {
      setError('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ... UI 렌더링
};
```

그리고 `BookEditForm`에도 같은 로직이 복사된다.  
→ `useBookCRUD`는 이 중복을 제거하기 위해 추출된 것이다.

---

### 실험 2 — useBookSearch 반환값 구조 분해해보기

```tsx
// apps/page0127/src/features/book/ui/BookRegistrationForm.tsx 또는 add/page.tsx 에서
// useBookSearch가 실제로 어떻게 쓰이는지 확인

const {
  books,          // 검색 결과 배열
  isLoading,      // 로딩 상태
  error,          // 에러 메시지
  search,         // (query, page?) => void
  goToPage,       // (page) => void
  currentPage,    // 현재 페이지
  totalResults,   // 총 결과 수
  itemsPerPage,   // 페이지당 아이템 수
} = useBookSearch();
```

각 반환값이 어느 UI 요소에 연결되는지 직접 추적해본다.

---

## 6. 다음 Day 예고

**Day 36 — Custom Hook 심화**  
`useLocalStorage`, `useDebounce` 같은 도메인에 종속되지 않는 **범용 훅**을 `shared/` 레이어에 만드는 패턴.
