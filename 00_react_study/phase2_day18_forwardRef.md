# Day 18 — useRef + forwardRef: 외부에서 input focus 제어

## 오늘 읽을 코드

- [BookSearchInput.tsx (features/book)](../apps/page0127/src/features/book/ui/BookSearchInput.tsx)
- [BookSearchInput.tsx (features/stats)](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx)

---

## 핵심 개념

### 문제: 부모가 자식 input을 focus 시키고 싶다

```tsx
// 부모에서 이렇게 하고 싶다
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus(); // 페이지 진입 시 자동 포커스
}, []);

return <BookSearchInput ref={inputRef} />;
//                       ^^^ 이게 안 된다! 일반 컴포넌트는 ref를 받지 못함
```

일반 함수 컴포넌트는 `ref` prop을 받을 수 없다.
`forwardRef`로 감싸야 내부 DOM 요소까지 ref를 전달할 수 있다.

---

### forwardRef 패턴

```tsx
import { forwardRef } from 'react';

// forwardRef로 감싸면 두 번째 인자로 ref를 받는다
const BookSearchInput = forwardRef<HTMLInputElement, BookSearchInputProps>(
  ({ onSearch, isLoading = false }, ref) => {
    //                               ^^^ 부모가 넘긴 ref
    const [query, setQuery] = useState('');

    return (
      <form onSubmit={...}>
        <Input
          ref={ref}  // 실제 <input> DOM 노드에 연결
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
    );
  }
);

BookSearchInput.displayName = 'BookSearchInput'; // DevTools 표시용
```

---

### page0127 실제 코드 → forwardRef 적용 전/후

**현재 (features/book/BookSearchInput.tsx):**
```tsx
export const BookSearchInput = ({
  onSearch,
  isLoading = false,
}: BookSearchInputProps) => {
  // ref를 받는 방법이 없음
  return (
    <form onSubmit={handleSubmit}>
      <Input ... />  {/* 외부에서 focus 불가 */}
    </form>
  );
};
```

**forwardRef 적용 후:**
```tsx
export const BookSearchInput = forwardRef<HTMLInputElement, BookSearchInputProps>(
  ({ onSearch, isLoading = false }, ref) => {
    const [query, setQuery] = useState('');

    return (
      <form onSubmit={handleSubmit}>
        <Input
          ref={ref}  // 부모의 ref가 이 <input>에 연결된다
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
      </form>
    );
  }
);
BookSearchInput.displayName = 'BookSearchInput';
```

**부모에서 사용:**
```tsx
const searchRef = useRef<HTMLInputElement>(null);

// /search 페이지 진입 시 자동 포커스
useEffect(() => {
  searchRef.current?.focus();
}, []);

return <BookSearchInput ref={searchRef} onSearch={handleSearch} />;
```

---

### useImperativeHandle — ref로 메서드 노출하기 (심화)

DOM 노드 전체를 노출하는 대신, 특정 메서드만 노출하고 싶을 때:

```tsx
export const BookSearchInput = forwardRef<
  { focus: () => void; clear: () => void },  // 노출할 메서드 타입
  BookSearchInputProps
>(({ onSearch }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // 부모에게 이 메서드들만 보여준다 (DOM 전체 X)
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { inputRef.current!.value = ''; },
  }));

  return <Input ref={inputRef} ... />;
});
```

---

## 정리 표

| 상황 | 패턴 |
|------|------|
| 부모가 자식 DOM에 직접 접근 | `forwardRef` + `ref={ref}` |
| DOM 전체 대신 특정 동작만 노출 | `forwardRef` + `useImperativeHandle` |
| 내부에서만 DOM 접근 | 그냥 `useRef` (forwardRef 불필요) |

**규칙:** `ref`를 prop으로 넘기고 싶으면 항상 `forwardRef`로 감싸야 한다.

---

## 오늘 실험

1. **자동 포커스 구현**: `/search` 페이지에서 `forwardRef`로 감싼 `BookSearchInput`에 `useEffect`로 자동 포커스 걸기
2. **clear 메서드 노출**: `useImperativeHandle`로 `clear()` 메서드를 부모에 노출하고, 외부 버튼 클릭 시 검색어 초기화

---

## 다음 Day 예고

**Day 19 — useMemo: 비싼 계산 캐싱**
- 렌더마다 반복되는 필터/정렬 연산을 `useMemo`로 최적화
- page0127의 도서 목록 필터링에 적용
