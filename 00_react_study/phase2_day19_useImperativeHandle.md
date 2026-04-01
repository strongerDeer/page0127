# Day 19 — useImperativeHandle: 컴포넌트가 노출할 API를 직접 설계

## 오늘 읽을 코드

- [stats/BookSearchInput.tsx](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx) — useImperativeHandle 적용 완료
- [widgets/Header/ui/Header.tsx](../apps/page0127/src/widgets/Header/ui/Header.tsx) — Server Component 구조 확인
- [widgets/Header/ui/HeaderClient.tsx](../apps/page0127/src/widgets/Header/ui/HeaderClient.tsx) — Client 분리 패턴

---

## 핵심 개념

### ref as prop vs useImperativeHandle

```
ref as prop           →  부모가 DOM 노드를 통째로 가져감
                         부모: ref.current.value, ref.current.style 등 다 접근 가능
                         → 캡슐화 없음

useImperativeHandle   →  컴포넌트가 "이것만 써라" 라고 API를 정의
                         부모: ref.current.focus(), ref.current.clear() 만 가능
                         → 내부 DOM은 숨겨짐
```

### useImperativeHandle 구조 (React 19)

```tsx
export type BookSearchInputHandle = {
  focus: () => void;
  clear: () => void;
};

export const BookSearchInput = ({
  onSearchChange,
  ref,                              // React 19: forwardRef 없이 prop으로
}: Props & { ref?: React.Ref<BookSearchInputHandle> }) => {

  const inputRef = useRef<HTMLInputElement>(null); // 내부 전용

  useImperativeHandle(ref, () => ({
    // 부모에게 노출할 메서드만 여기에 정의
    focus: () => inputRef.current?.focus(),
    clear: () => { setInputValue(''); onSearchChange(''); },
  }));

  return <Input ref={inputRef} ... />; // inputRef는 외부 미노출
};
```

---

## page0127 실제 사례: Header 단축키로 검색창 제어

### 왜 Header에서 바로 못 하는가?

```
Header (Server Component)          books/add/page.tsx (Client Component)
┌────────────────────────┐         ┌──────────────────────────┐
│ async function Header()│         │ const searchRef = useRef │
│                        │   ???   │                          │
│ // useRef 못 씀        │ ──────▶ │ <BookSearchInput         │
│ // useEffect 못 씀     │         │   ref={searchRef} />     │
│ // 이벤트 핸들러 못 씀 │         └──────────────────────────┘
└────────────────────────┘
Server Component는 브라우저 API에 접근 불가
```

### 해결: HeaderClient에 단축키 로직 추가

Header 내부의 Client Component 부분(`HeaderClient`)에서 키보드 이벤트를 처리하되,
ref는 페이지 컴포넌트에서 직접 관리한다.

```
HeaderClient (Client)              books/add/page.tsx (Client)
useEffect → keydown '/' 감지       searchRef = useRef<BookSearchInputHandle>()
→ router.push('/books/add?focus=1') → useEffect: ?focus=1이면 searchRef.current.focus()
```

---

### 실제 구현 — books/add 페이지에서 `/` 단축키로 포커스

`books/add/page.tsx`에서 `useImperativeHandle`이 노출한 `focus()`를 키보드 이벤트로 호출:

```tsx
// books/add/page.tsx (Client Component)
const searchRef = useRef<HTMLInputElement>(null);

// 자동 포커스 (페이지 진입 시)
useEffect(() => {
  searchRef.current?.focus();
}, []);

// 단축키: '/' 누르면 검색창 포커스
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // input/textarea 안에서는 무시
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === '/') {
      e.preventDefault();
      searchRef.current?.focus(); // useImperativeHandle이 노출한 메서드
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

return <BookSearchInput ref={searchRef} onSearch={search} isLoading={isSearching} />;
```

`searchRef.current.focus()`를 호출하는 쪽은 DOM이 어떻게 생겼는지 모른다.
`BookSearchInput` 내부가 리팩토링돼도 `focus()` 계약만 지키면 부모는 바뀔 게 없다.

---

## 정리

| | ref as prop | useImperativeHandle |
|--|-------------|---------------------|
| 부모가 접근 가능한 것 | DOM 노드 전체 | 정의한 메서드만 |
| 캡슐화 | 없음 | 있음 |
| 사용 시점 | 단순 DOM 접근 (focus, scroll) | 복잡한 내부 로직을 추상화할 때 |
| React 19 변경 | forwardRef 불필요 | 동일 (forwardRef만 제거) |

**규칙:** DOM을 직접 줘도 되면 `ref as prop`, 내부를 숨기고 싶으면 `useImperativeHandle`.

---

## 오늘 실험

1. **`/` 단축키 포커스**: `books/add/page.tsx`에서 `/` 키 입력 시 `searchRef.current.focus()` 호출
2. **`Escape` 단축키 초기화**: `stats/DashboardBookList`에서 `Escape` 키 입력 시 `searchRef.current.clear()` 호출

---

## 다음 Day 예고

**Day 20 — useReducer: 교체 기준**
- `useState` 여러 개가 함께 바뀌는 상황 → `useReducer`로 전환
- 책장 필터 상태 (`SET_TAB / SET_SORT / SET_GENRE / RESET`) 리팩토링
