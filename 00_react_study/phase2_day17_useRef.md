# Day 17 — useRef: 렌더링과 무관한 값

## 오늘 읽을 코드

- [ActivityFeed.tsx](../apps/page0127/src/features/activity/ui/ActivityFeed.tsx)
- [NotificationPage.tsx](../apps/page0127/src/features/notification/ui/NotificationPage.tsx)
- [AvatarUpload.tsx](../apps/page0127/src/features/profile/ui/AvatarUpload.tsx)

---

## 핵심 개념

### useRef는 두 가지 용도로 쓰인다

```ts
// 1. DOM 요소에 직접 접근
const divRef = useRef<HTMLDivElement>(null);
// → divRef.current = 실제 DOM 노드

// 2. 리렌더 없이 값을 보관 (렌더 사이에 살아있는 변수)
const prevTabRef = useRef<string>('all');
// → prevTabRef.current 변경해도 리렌더 안 일어남
```

### useState vs useRef

| 구분 | useState | useRef |
|------|----------|--------|
| 변경 시 리렌더 | O | X |
| 렌더 사이 값 유지 | O | O |
| 주요 용도 | UI에 표시할 값 | DOM 접근, 내부 추적 값 |

---

## page0127 실제 코드 사례

### 패턴 1 — DOM 접근 (Intersection Observer 트리거)

[ActivityFeed.tsx:21-57](../apps/page0127/src/features/activity/ui/ActivityFeed.tsx#L21-L57)

```tsx
const observerRef = useRef<HTMLDivElement>(null); // 스크롤 감지용 div

useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    // div가 화면에 들어오면 다음 페이지 로드
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, { threshold: 0.1 });

  if (observerRef.current) {
    observer.observe(observerRef.current); // ref로 DOM 연결
  }

  return () => observer.disconnect(); // 클린업
}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

// JSX에서 ref 연결
<div ref={observerRef} className='py-4'>...</div>
```

**핵심**: `observerRef.current`가 바뀌어도 리렌더 없음 → 관찰만 하면 되는 곳에 적합

---

### 패턴 2 — DOM 접근 (숨겨진 input 프로그래밍 방식 클릭)

[AvatarUpload.tsx:28-37](../apps/page0127/src/features/profile/ui/AvatarUpload.tsx#L28-L37)

```tsx
const fileInputRef = useRef<HTMLInputElement>(null);

const handleButtonClick = () => {
  fileInputRef.current?.click(); // 버튼 클릭 → 숨겨진 input 클릭
};

// JSX
<Button onClick={handleButtonClick}>이미지 선택</Button>
<input ref={fileInputRef} type='file' className='hidden' />
```

**핵심**: 파일 선택 UI를 커스텀하기 위해 숨겨진 `<input>` 을 ref로 직접 조작

---

### 패턴 3 — 값 추적 (리렌더 없이 이전 값 보관)

실제로 이렇게 활용할 수 있다 (NotificationPage의 필터를 예시로):

```tsx
// 현재 필터는 state (UI 반영 필요)
const [filter, setFilter] = useState<'all' | 'unread'>('all');

// 이전 필터는 ref (UI에 표시 안 해도 됨, 방향 결정에만 필요)
const prevFilterRef = useRef<'all' | 'unread'>('all');

const handleFilterChange = (next: 'all' | 'unread') => {
  prevFilterRef.current = filter; // 바꾸기 전 값 저장 (리렌더 없음)
  setFilter(next);
};

// 탭 전환 방향 결정
const direction = filter === 'unread' && prevFilterRef.current === 'all'
  ? 'left'   // all → unread: 왼쪽으로
  : 'right';  // unread → all: 오른쪽으로
```

---

## 정리 규칙

> **UI에 보여줘야 하면 `useState`, 내부에서만 추적하면 `useRef`**

---

## 오늘 실험

1. **NotificationPage** 필터 버튼에 `prevFilterRef`를 추가하고, 전환 방향을 `console.log`로 찍어보기
   - `all → unread`, `unread → all` 둘 다 테스트
   - 콘솔만 찍히고 리렌더는 일어나지 않는지 확인

2. **AvatarUpload** 에서 `fileInputRef.current?.click()` 대신 `fileInputRef.current?.value = ''` (초기화)가 왜 필요한지 확인
   - 같은 파일 두 번 선택 시 `onChange`가 안 불리는 이유 → 초기화 없으면 이벤트 안 발생

---

## 다음 Day 예고

**Day 18 — useMemo: 비싼 계산 캐싱**
- 언제 써야 하고 언제 쓰면 오히려 독인지
- 렌더 최적화의 첫 번째 도구
