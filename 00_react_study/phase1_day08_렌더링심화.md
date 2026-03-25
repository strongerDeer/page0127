# Day 08 — 렌더링 심화

> Phase 1 | 2026-03-28
> 연결 코드: `widgets/Header/ui/HeaderClient.tsx`, `features/notification/ui/NotificationDropdown.tsx`

---

## 핵심 질문

> **알림 드롭다운을 열면 BookList도 리렌더링될까?**

---

## 렌더링 전파 규칙

```
렌더링은 아래로만 흐른다
부모가 리렌더링 → 자식 전체 리렌더링
형제 컴포넌트는 서로 영향 없음
```

이 프로젝트 구조:

```
layout.tsx (Server)
├── Header (Server)
│   └── HeaderClient (Client)
│       └── NotificationDropdown   ← isOpen state 여기 있음
│           └── NotificationList
│               └── NotificationItem × n
│
└── {children} (Server)
    └── DashboardPage
        └── DashboardBookList      ← 여기는 영향 없음
            └── BookCard × n
```

`NotificationDropdown`의 `isOpen`이 바뀌면:
- ✅ 리렌더링: `NotificationDropdown`, `NotificationList`, `NotificationItem` (자식들)
- ❌ 리렌더링 없음: `DashboardBookList`, `BookCard` (형제/다른 트리)

---

## 실제 코드로 확인

```tsx
// NotificationDropdown.tsx
export const NotificationDropdown = ({ userId }: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false); // ← 이 state가 바뀌면

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      ...
      <NotificationList ... /> {/* ← 이 자식들만 리렌더링 */}
    </Popover>
  );
}
```

```tsx
// HeaderClient.tsx — NotificationDropdown의 부모
export const HeaderClient = ({ userId }: HeaderClientProps) => {
  // 자체 state 없음 → HeaderClient는 리렌더링 안 됨
  return <NotificationDropdown userId={userId} />;
}
```

`HeaderClient`는 state가 없고 props도 안 바뀌므로 리렌더링되지 않는다.
따라서 `NotificationDropdown`의 `isOpen` 변경은 **그 아래 트리에만** 전파된다.

---

## 부모가 리렌더링되면 자식 전체가 리렌더링된다

```tsx
// 만약 이렇게 구조가 바뀐다면?
export const HeaderClient = ({ userId }: HeaderClientProps) => {
  const [count, setCount] = useState(0); // ← HeaderClient에 state 추가

  return (
    <>
      <NotificationDropdown userId={userId} /> {/* ← 리렌더링됨 */}
      <ProfileDropdown />                       {/* ← 리렌더링됨 */}
    </>
  );
}
```

`HeaderClient`의 `count`가 바뀌면 → `NotificationDropdown`, `ProfileDropdown` 전부 리렌더링된다.
state는 **가능한 아래 컴포넌트에** 두는 게 렌더링 범위를 줄이는 방법이다.

---

## DevTools로 확인하는 법

```
1. Highlight updates 켜기 (⚙️ → Highlight updates)
2. 알림 아이콘(🔔) 클릭
3. 파란 테두리가 Header 영역에만 깜빡이는지 확인
4. BookList 영역은 변화 없는지 확인
```

Profiler로도 확인 가능:
```
Record → 알림 클릭 → Stop
→ NotificationDropdown: 주황색 (렌더링됨)
→ DashboardBookList: 회색 빗금 (렌더링 안 됨)
```

앞서 찍은 Profiler 스크린샷에서 이미 이 결과를 볼 수 있었다.

---

## 핵심 요약

```
state가 바뀌면 → 그 컴포넌트 + 아래 자식들만 리렌더링
형제 / 다른 트리 → 영향 없음

따라서 state는 필요한 곳보다 너무 위에 두지 않는다
→ 바꾸면 너무 많은 컴포넌트가 리렌더링됨
```

---

## 다음 시간

**Day 09 — Strict Mode**
`layout.tsx`에서 StrictMode 설정 확인,
개발 환경에서 컴포넌트가 두 번 실행되는 이유 이해
