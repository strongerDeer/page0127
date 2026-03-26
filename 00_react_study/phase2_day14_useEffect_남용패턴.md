# Day 14 — useEffect 남용 패턴

> 날짜: 2026-03-27
> 핵심 질문: "이걸 useEffect로 해야 할까, 아니면 다른 방법이 있을까?"

---

## 핵심 판단 기준 (복습)

```
사용자 행동이 원인  →  이벤트 핸들러
값 변화가 원인, 외부 세계와 동기화  →  useEffect
```

**남용이란**: 이벤트 핸들러나 파생 상태로 해결할 수 있는데 굳이 useEffect를 쓰는 것

---

## 남용 패턴 1 — state를 다른 state에 동기화

### ❌ 안티패턴

```tsx
const [books, setBooks] = useState([]);
const [filteredBooks, setFilteredBooks] = useState([]);

// books가 바뀔 때마다 filteredBooks를 동기화 — 불필요한 추가 렌더링 발생
useEffect(() => {
  setFilteredBooks(books.filter(b => b.status === 'reading'));
}, [books]);
```

**문제점**: `books` 변경 → 렌더링 1회 → `useEffect` 실행 → `setFilteredBooks` → 렌더링 1회 더
총 **2번 렌더링** 발생

### ✅ 올바른 방법 — 파생 상태로

```tsx
const [books, setBooks] = useState([]);

// books에서 바로 계산 — 렌더링 1회로 끝
const filteredBooks = books.filter(b => b.status === 'reading');
```

> **page0127 연결**: Day 3에서 배운 파생 상태 개념과 동일
> `DashboardBookList`의 `filteredBooks`도 이미 이 패턴으로 구현되어 있음

---

## 남용 패턴 2 — 이벤트 핸들러로 처리 가능한데 effect 사용

### ❌ 안티패턴

```tsx
const [page, setPage] = useState(1);

// 사용자가 "다음 페이지" 버튼을 눌렀을 때를 effect로 감지?
useEffect(() => {
  fetchPage(page);
}, [page]);
```

**문제점**: 버튼 클릭이 "원인"인데 effect에서 처리 → 추적하기 어렵고, 마운트 시 의도치 않게 실행됨

### ✅ 올바른 방법 — 이벤트 핸들러에서 직접

```tsx
const handleNextPage = () => {
  const nextPage = currentPage + 1;
  setCurrentPage(nextPage);
  fetchPage(nextPage); // 버튼 클릭이 원인 → 핸들러에서 처리
};
```

---

## 남용 패턴 3 — useEffect 안에서 직접 fetch (가장 흔한 안티패턴)

### ❌ 실제 코드 — DashboardContent.tsx

```tsx
// apps/page0127/src/widgets/dashboard/DashboardContent.tsx

const [calendarLoading, setCalendarLoading] = useState(false);
const [currentCalendarData, setCurrentCalendarData] = useState(calendarData);
const [currentCalendarSummary, setCurrentCalendarSummary] = useState(calendarSummary);

useEffect(() => {
  const fetchCalendarData = async () => {
    setCalendarLoading(true); // 로딩 상태 직접 관리
    try {
      const response = await fetch(`/api/books/calendar?year=${calendarYear}&month=${calendarMonth}`);
      const result = await response.json();

      if (result.success) {
        setCurrentCalendarData(result.data || []);       // 데이터 직접 관리
        setCurrentCalendarSummary(result.summary || {}); // 요약 직접 관리
      }
    } catch (error) {
      console.error('캘린더 데이터 조회 실패:', error); // 에러를 사용자에게 표시 안 함
    } finally {
      setCalendarLoading(false);
    }
  };

  if (calendarYear !== initialCalendarYear || calendarMonth !== initialCalendarMonth) {
    fetchCalendarData();
  }
}, [calendarYear, calendarMonth, initialCalendarYear, initialCalendarMonth]);
```

**문제점 정리**:
| 문제 | 설명 |
|---|---|
| useState 3개 | loading / data / summary 직접 관리 |
| 에러 처리 없음 | console.error만 → 사용자는 에러 모름 |
| 캐싱 없음 | 같은 월 다시 이동해도 매번 fetch |
| 경쟁 조건 | 빠르게 월 이동 시 이전 응답이 덮어쓸 수 있음 |
| 초기 조건 분기 | `if (year !== initialYear ...)` 같은 복잡한 조건 필요 |

### ✅ TanStack Query로 대체하면

```tsx
// 이렇게 바꾸면 위 문제가 모두 해결됨
const { data, isLoading } = useQuery({
  queryKey: ['calendar', calendarYear, calendarMonth],
  queryFn: () => fetchCalendarData(calendarYear, calendarMonth),
  // calendarYear, calendarMonth가 바뀌면 자동으로 새 fetch
  // 같은 키면 캐시에서 즉시 반환
  // 에러 상태도 isError로 관리
  // 경쟁 조건도 자동 처리
});
```

> **핵심**: TanStack Query는 "값이 바뀌면 외부(서버)와 동기화" — useEffect의 역할을 대신 해줌

---

## 올바른 useEffect 사용 — page0127 실제 코드

### 1. Debounce — BookSearchInput.tsx ✅

```tsx
// inputValue 라는 "state 값"이 바뀐 결과를
// 300ms 뒤 부모 함수 호출로 연결 (타이밍 제어 필요 → useEffect)
useEffect(() => {
  const timer = setTimeout(() => {
    onSearchChange(inputValue);
  }, 300);
  return () => clearTimeout(timer); // 클린업으로 이전 타이머 제거
}, [inputValue, onSearchChange]);
```

### 2. IntersectionObserver (DOM API) — ActivityFeed.tsx ✅

```tsx
// DOM 외부 API 구독 → 마운트 시 설정, 언마운트 시 해제
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });
  if (observerRef.current) observer.observe(observerRef.current);
  return () => observer.disconnect(); // 클린업
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

### 3. BroadcastChannel (외부 이벤트 구독) — FollowStats.tsx ✅

```tsx
// 다른 탭에서 발생한 이벤트를 구독 → 외부 세계 연결
useEffect(() => {
  const unsubscribe = followBroadcast.onFollowEvent(() => {
    queryClient.invalidateQueries({ queryKey: ['follow'] });
  });
  return () => unsubscribe(); // 클린업
}, [queryClient]);
```

---

## 경계 케이스 — window 객체 접근

### ProfileSettingsForm.tsx

```tsx
const [profileUrl, setProfileUrl] = useState('');

// window.location은 브라우저에만 존재 → SSR에서 접근 불가
// hydration 에러 방지를 위해 마운트 후 실행
useEffect(() => {
  setProfileUrl(`${window.location.origin}/${profile.username}`);
}, [profile.username]);
```

**이건 괜찮은가?**: 허용되는 케이스
`window`는 브라우저에서만 존재하는 외부 환경 → 마운트 후에 접근하는 것이 맞음

> 단, lazy initialization으로 대체 가능한지 확인
> `window.location`은 SSR에서 에러를 던지기 때문에 useEffect가 더 안전

---

## 정리 — useEffect를 쓰기 전 체크리스트

```
□ 이벤트 핸들러로 처리할 수 있는가?  →  핸들러에서 직접 처리
□ 다른 state에서 계산 가능한가?       →  파생 상태로 (useMemo 혹은 인라인 계산)
□ 데이터 fetch인가?                   →  TanStack Query 사용
□ 외부 API 구독 / DOM 접근 / 타이밍?  →  useEffect가 맞음
```

**useEffect가 진짜 필요한 것**: 외부 세계(DOM, 브라우저 API, 서버, 타이머)와 동기화

---

## 오늘 확인한 것

- **DashboardContent.tsx** `useEffect + fetch` → 남용 패턴 (TanStack Query로 대체 가능)
- **BookSearchInput.tsx** `useEffect + setTimeout` → 올바른 사용 (타이밍 제어)
- **ActivityFeed.tsx, NotificationPage.tsx** `useEffect + IntersectionObserver` → 올바른 사용 (DOM API)
- **FollowStats.tsx** `useEffect + BroadcastChannel` → 올바른 사용 (외부 구독)
- **ProfileSettingsForm.tsx** `useEffect + window.location` → 허용되는 케이스 (SSR 대응)
