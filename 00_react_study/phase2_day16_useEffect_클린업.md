# Day 16 — useEffect: 클린업

> 클린업 함수가 없으면 컴포넌트가 사라져도 타이머·구독·옵저버가 계속 살아있다.
> page0127 실제 코드 4가지로 클린업 패턴을 이해한다.

---

## 오늘 읽을 코드

- [BookSearchInput.tsx](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx) — `clearTimeout` (타이머)
- [useNotificationRealtime.ts](../apps/page0127/src/entities/notification/lib/hooks/useNotificationRealtime.ts) — `removeChannel` (WebSocket)
- [ActivityFeed.tsx](../apps/page0127/src/features/activity/ui/ActivityFeed.tsx) — `observer.disconnect()` (IntersectionObserver)
- [FollowStats.tsx](../apps/page0127/src/features/follow/ui/FollowStats.tsx) — `unsubscribe()` (BroadcastChannel)

---

## 클린업이란

useEffect는 **반환 함수**를 클린업 함수로 사용한다.

```tsx
useEffect(() => {
  // effect: 외부 세계에 연결
  const timer = setTimeout(() => {}, 300);

  return () => {
    // cleanup: 연결 해제
    clearTimeout(timer);
  };
}, [deps]);
```

**클린업이 실행되는 시점 2가지:**

```
1. 다음 effect가 실행되기 직전 (deps가 바뀌어 재실행될 때)
2. 컴포넌트가 언마운트될 때 (화면에서 사라질 때)
```

---

## 클린업이 없으면 어떤 일이 생기나

| 종류 | 클린업 없으면 |
|------|-------------|
| `setTimeout` | 빠른 입력 시 타이머가 쌓여 여러 번 실행됨 |
| WebSocket 구독 | 페이지 이동 후에도 연결이 살아있음 (메모리 누수) |
| IntersectionObserver | 컴포넌트 사라진 뒤에도 DOM 감시 지속 |
| 이벤트 리스너 | 핸들러가 누적되어 같은 이벤트에 여러 번 반응 |

---

## page0127 실제 코드 4가지

### 1. BookSearchInput — `clearTimeout` (타이머)

[BookSearchInput.tsx:37-44](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx#L37)

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    onSearchChange(inputValue);
  }, 300);

  return () => clearTimeout(timer); // ← 이전 타이머 취소
}, [inputValue, onSearchChange]);
```

**왜 필요한가?**

```
"ㄱ" 입력 → timer 시작
"가" 입력 → 이전 timer 취소 → 새 timer 시작
"가나" 입력 → 이전 timer 취소 → 새 timer 시작
300ms 후 → onSearchChange("가나") 1회만 실행
```

클린업 없으면: 타이머가 쌓여서 "ㄱ", "가", "가나" 세 번 모두 검색 실행.

---

### 2. useNotificationRealtime — `removeChannel` (WebSocket)

[useNotificationRealtime.ts:29-68](../apps/page0127/src/entities/notification/lib/hooks/useNotificationRealtime.ts#L29)

```tsx
useEffect(() => {
  if (!userId) return;

  const supabase = createClient();
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', { ... }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel); // ← WebSocket 구독 해제
  };
}, [userId, queryClient]);
```

**왜 필요한가?**

```
userId가 바뀌면:
1. 클린업 실행 → 이전 userId 채널 해제
2. 새 effect 실행 → 새 userId 채널 구독

클린업 없으면:
→ 이전 채널도 살아있음
→ 두 채널 동시에 구독 → 알림 중복 처리
→ 페이지 이동 후에도 WebSocket 연결 유지 (메모리 누수)
```

---

### 3. ActivityFeed — `observer.disconnect()` (IntersectionObserver)

[ActivityFeed.tsx:43-58](../apps/page0127/src/features/activity/ui/ActivityFeed.tsx#L43)

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    },
    { threshold: 0.1 }
  );

  if (observerRef.current) {
    observer.observe(observerRef.current);
  }

  return () => observer.disconnect(); // ← DOM 감시 해제
}, [fetchNextPage, hasNextPage, isFetchingNextPage]);
```

**왜 필요한가?**

deps가 바뀔 때마다 새 `IntersectionObserver`를 만든다.
클린업 없으면 → 이전 observer가 계속 살아 동일한 DOM을 여러 observer가 감시 → 스크롤마다 `fetchNextPage` 중복 호출.

---

### 4. FollowStats — `unsubscribe()` (BroadcastChannel 이벤트)

[FollowStats.tsx:39-46](../apps/page0127/src/features/follow/ui/FollowStats.tsx#L39)

```tsx
useEffect(() => {
  const unsubscribe = followBroadcast.onFollowEvent(() => {
    queryClient.invalidateQueries({ queryKey: ['follow'] });
  });

  return unsubscribe; // ← 이벤트 리스너 제거
}, [queryClient]);
```

`followBroadcast.onFollowEvent`의 내부 구현 ([broadcastChannel.ts:42-55](../apps/page0127/src/shared/lib/broadcastChannel.ts#L42)):

```ts
onFollowEvent(callback) {
  const handler = (event) => callback(event.data);
  this.channel.addEventListener('message', handler);

  // 구독 해제 함수를 반환 → useEffect 클린업으로 그대로 사용
  return () => {
    this.channel?.removeEventListener('message', handler);
  };
}
```

이 패턴이 깔끔한 이유:
- `onFollowEvent`가 반환한 함수를 `return unsubscribe`로 그대로 넘김
- useEffect의 클린업 = addEventListener와 쌍을 이루는 removeEventListener

---

## 클린업 패턴 요약

```tsx
// 타이머
useEffect(() => {
  const id = setTimeout(fn, delay);
  return () => clearTimeout(id);
}, [deps]);

// 인터벌
useEffect(() => {
  const id = setInterval(fn, interval);
  return () => clearInterval(id);
}, [deps]);

// 이벤트 리스너
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// 외부 구독 (패턴: subscribe → cleanup)
useEffect(() => {
  const unsubscribe = someService.subscribe(handler);
  return unsubscribe; // 구독 해제 함수를 그대로 반환
}, [deps]);
```

---

## 정리

> useEffect에서 외부 세계에 연결했으면 **항상** 클린업으로 끊어야 한다.
>
> 연결 종류별 클린업 쌍:
> - `setTimeout` → `clearTimeout`
> - `setInterval` → `clearInterval`
> - `addEventListener` → `removeEventListener`
> - WebSocket 구독 → 구독 해제
> - IntersectionObserver → `disconnect()`

---

## 오늘 실험

1. [ActivityFeed.tsx:57](../apps/page0127/src/features/activity/ui/ActivityFeed.tsx#L57)에서 `return () => observer.disconnect()`를 제거하면?
   → `hasNextPage`가 바뀔 때마다 새 observer 추가 → 같은 DOM을 N개 observer가 감시 → 스크롤 1회에 fetchNextPage N번 호출

2. [BookSearchInput.tsx:43](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx#L43)에서 `return () => clearTimeout(timer)`를 제거하면?
   → 빠르게 타이핑 시 모든 타이머 만료 → 각 입력마다 검색 실행 → 불필요한 API 호출 폭발

---

## 다음 Day 17

useRef — 렌더링과 무관한 값 저장 (이전 탭 값 기억, 리렌더 없이)
