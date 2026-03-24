# Day 07 — 렌더링이 언제 일어나는가

> Phase 1 | 2026-03-27
> 연결 코드: `widgets/Header/`, `features/notification/`

---

## 핵심 개념

> **React는 state나 props가 바뀌면 렌더링한다. 부모가 렌더링되면 자식도 같이 렌더링된다.**

---

## 렌더링이 일어나는 3가지 조건

```
1. state가 바뀔 때      → 그 컴포넌트부터 아래 전체
2. props가 바뀔 때      → 그 컴포넌트부터 아래 전체
3. 부모가 렌더링될 때   → 자식도 자동으로 렌더링
```

세 번째가 헷갈리는 부분이다. **props가 안 바뀌어도** 부모가 렌더링되면 자식도 렌더링된다.

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <Child />  {/* count와 무관한데도 Parent가 렌더링되면 같이 렌더링됨 */}
    </>
  );
}
```

---

## 실제 코드 — Header 구조

```
Header (Server Component)
└── HeaderClient (Client Component) ← 'use client'
    └── NotificationDropdown
        └── NotificationList
            └── NotificationItem × N
```

알림 드롭다운을 열면 (`isOpen` state 변경):

```
NotificationDropdown → 리렌더링
└── NotificationList  → 리렌더링 (부모가 렌더링됐으니)
    └── NotificationItem × 5 → 리렌더링 (부모가 렌더링됐으니)
```

**`Header`(Server Component)는 여기에 포함되지 않는다.**
SC는 클라이언트 렌더링 사이클과 무관하다. 알림이 몇 번 열려도 `Header`는 재실행되지 않는다.

---

## 렌더링 ≠ DOM 업데이트

렌더링이 일어났다고 화면이 무조건 바뀌는 건 아니다.

```
렌더링 (함수 실행) → React가 이전 결과와 비교 (Virtual DOM diff)
                   → 실제로 바뀐 부분만 DOM 업데이트
```

`NotificationItem`이 5번 렌더링됐어도 내용이 안 바뀌었다면 DOM은 그대로다.
렌더링이 "비싼" 이유는 함수 실행 자체보다 **불필요하게 많이 실행되는 것**이다.

---

## React DevTools로 확인하는 법

브라우저에서 React DevTools → **Profiler** 탭

```
1. "Record" 버튼 클릭
2. 알림 드롭다운 열기
3. "Stop" 버튼 클릭
4. 렌더링된 컴포넌트 목록 확인
   → 어떤 컴포넌트가 왜 렌더링됐는지 표시됨
```

Profiler에서 주황색/빨간색으로 표시되는 컴포넌트가 자주/오래 렌더링된 것이다.

---

## 정리

```
렌더링 조건
├── state 변경   → 해당 컴포넌트 + 자식 전체
├── props 변경   → 해당 컴포넌트 + 자식 전체
└── 부모 렌더링  → 자식도 자동 렌더링 (props 변경 없어도)

렌더링되지 않는 것
└── Server Component → 클라이언트 렌더링 사이클에 포함 안 됨
```

---

## 오늘의 핵심

> **부모가 렌더링되면 자식도 렌더링된다. 단, 렌더링이 곧 DOM 업데이트는 아니다.**
> 불필요한 렌더링을 줄이는 방법은 Phase 6 (React.memo, useMemo)에서 다룬다.
