# Day 27 — useLayoutEffect

## 오늘 읽을 코드

- [NotificationList.tsx](../apps/page0127/src/features/notification/ui/NotificationList.tsx) — `ScrollArea` 안의 알림 목록
- [NotificationDropdown.tsx](../apps/page0127/src/features/notification/ui/NotificationDropdown.tsx) — 드롭다운 열림/닫힘 상태

---

## 핵심 개념

### useEffect vs useLayoutEffect

둘 다 사이드 이펙트를 처리하지만 **실행 타이밍**이 다르다.

```
렌더링 → DOM 업데이트 → [useLayoutEffect] → 브라우저 페인트 → [useEffect]
```

| | useEffect | useLayoutEffect |
|---|---|---|
| 실행 시점 | 브라우저 페인트 **후** | 브라우저 페인트 **전** |
| 사용 목적 | 데이터 패칭, 구독 | DOM 측정, 스크롤 제어 |
| 깜빡임 | 발생 가능 | 없음 |
| SSR | 안전 | 경고 발생 (클라이언트 전용) |

### 언제 useLayoutEffect인가?

DOM을 읽고 → 즉시 DOM을 변경해야 할 때. 페인트 전에 처리하지 않으면 **깜빡임**이 생긴다.

```tsx
// ❌ useEffect — 페인트 후 스크롤 → 순간 위치가 보였다가 이동하는 깜빡임
useEffect(() => {
  listRef.current?.scrollTo({ top: 0 });
}, [isOpen]);

// ✅ useLayoutEffect — 페인트 전 스크롤 → 사용자 눈에 안 보임
useLayoutEffect(() => {
  listRef.current?.scrollTo({ top: 0 });
}, [isOpen]);
```

---

## page0127 실제 코드 사례

### 현재 상황

`NotificationList`의 `ScrollArea`는 알림이 로드되면 항상 맨 위에서 시작한다.
읽지 않은 알림이 중간에 있을 때 → **자동 스크롤 없음**.

### useLayoutEffect 적용 — 첫 번째 읽지 않은 알림으로 스크롤

```tsx
'use client';

import { useLayoutEffect, useRef } from 'react';

export const NotificationList = ({ userId, onClose }: NotificationListProps) => {
  const { data: notifications, isLoading } = useNotifications({ userId, limit: 5 });
  const firstUnreadRef = useRef<HTMLDivElement>(null);

  // DOM이 업데이트된 직후(페인트 전)에 스크롤 실행
  // → 사용자 눈에 "위에서 시작했다가 내려가는" 깜빡임 없음
  useLayoutEffect(() => {
    if (!notifications || notifications.length === 0) return;
    firstUnreadRef.current?.scrollIntoView({ block: 'nearest' });
  }, [notifications]);

  // ...생략...

  return (
    <div className='flex flex-col'>
      <ScrollArea className='h-96'>
        <div className='flex flex-col'>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              // 첫 번째 읽지 않은 알림에 ref 연결
              ref={!notification.is_read ? firstUnreadRef : undefined}
            >
              <NotificationItem
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onDelete={handleDelete}
                onMarkAsRead={handleMarkAsReadSingle}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
```

### 드롭다운 열릴 때 스크롤 초기화

```tsx
// NotificationDropdown.tsx
export const NotificationDropdown = ({ userId }: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 드롭다운이 열릴 때 스크롤을 맨 위로 초기화
  // useEffect면 열리는 순간 스크롤이 내려있다가 올라오는 게 보임
  useLayoutEffect(() => {
    if (isOpen) {
      listRef.current?.scrollTo({ top: 0 });
    }
  }, [isOpen]);

  // ...
};
```

---

## 정리

> **규칙**: DOM을 읽고 즉시 바꿔야 한다면 `useLayoutEffect`. 깜빡임이 없어야 하는 스크롤/측정은 여기서.

```
DOM 측정 → 스크롤 제어 → 위치 계산  →  useLayoutEffect
데이터 패칭 → 구독 → 타이머          →  useEffect
```

---

## 오늘 실험

### 실험 1 — 깜빡임 비교

NotificationList에서 `useLayoutEffect` → `useEffect`로 바꿔본다.
알림 드롭다운을 열 때 스크롤이 순간 내려갔다가 올라오는 깜빡임이 보이는지 확인.

### 실험 2 — SSR 경고 확인

Next.js에서 `useLayoutEffect`를 Server Component에서 쓰면 어떤 경고가 나오는지 확인.

```
Warning: useLayoutEffect does nothing on the server because its effect cannot
be encoded into the server renderer's output format.
```

→ `'use client'`가 없는 컴포넌트에서 쓰면 안 되는 이유 직접 확인.

---

## 다음 Day 예고

**Day 28 — children / 컴포넌트 합성**: `BookCard`를 children 합성 방식으로 리팩토링
