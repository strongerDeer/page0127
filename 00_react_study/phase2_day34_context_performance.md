# Day 34 — Context 성능 고려

> 날짜: 2026-04-14 | 주제: Context 분리로 불필요한 리렌더링 방지

---

## 1. 오늘 읽을 코드

- [CurrentUserProvider.tsx](../apps/page0127/src/features/auth/providers/CurrentUserProvider.tsx) — 인증 Context 실사용
- [useCurrentUser.ts](../apps/page0127/src/entities/user/hooks/useCurrentUser.ts) — React Query 기반 사용자 조회
- [app/layout.tsx](../apps/page0127/app/layout.tsx) — Provider 중첩 구조 확인

---

## 2. 핵심 개념

### Context와 리렌더링의 관계

Context는 편리하지만 **value가 바뀌면 useContext를 구독한 모든 컴포넌트가 리렌더**된다.
객체를 value로 넘기면 렌더링마다 새 참조가 생겨 불필요한 리렌더를 유발한다.

```tsx
// ❌ 매 렌더마다 새 객체 → 모든 구독자 리렌더
<MyContext.Provider value={{ user, theme, isModalOpen }}>

// ✅ Context를 역할별로 분리 → 변경된 Context 구독자만 리렌더
<AuthContext.Provider value={{ user, isLoading }}>
  <UIContext.Provider value={{ isModalOpen, setIsModalOpen }}>
    {children}
  </UIContext.Provider>
</AuthContext.Provider>
```

### Context 분리 원칙

**변경 빈도**가 다른 값끼리 같은 Context에 묶지 않는다.

| Context       | 담는 값                   | 변경 빈도 |
| ------------- | ------------------------- | --------- |
| `AuthContext` | 로그인 유저, isLoading    | 낮음      |
| `UIContext`   | 모달 열림/닫힘, 탭 상태   | 높음      |
| `ThemeContext`| 다크/라이트 모드          | 매우 낮음 |

`UIContext`가 변해도 `AuthContext` 구독자는 리렌더되지 않는다.

### memo + Context 조합

Context 값이 자주 바뀌더라도, **Context를 쓰지 않는 자식은 memo로 리렌더 차단** 가능.

```tsx
// Context를 구독하지 않는 순수 UI 컴포넌트
const HeavyChart = memo(({ data }: { data: ChartData[] }) => {
  return <Chart data={data} />;
});

// Context 변경 시 HeavyChart는 data props가 같으면 리렌더 안 됨
```

---

## 3. page0127 실제 코드 사례

### CurrentUserProvider — 인증 Context

```tsx
// apps/page0127/src/features/auth/providers/CurrentUserProvider.tsx
const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

export const CurrentUserProvider = ({ children }: CurrentUserProviderProps) => {
  const { data: currentUser, isLoading } = useCurrentUser();

  return (
    // value 객체: currentUser가 변할 때만 참조가 바뀜
    // → React Query가 캐싱을 관리하므로 불필요한 리렌더 최소화
    <CurrentUserContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </CurrentUserContext.Provider>
  );
};
```

**핵심**: `useCurrentUser`는 React Query 훅이다.  
React Query는 동일한 데이터라면 **같은 참조를 유지**하므로,  
`currentUser`가 실제로 바뀌지 않으면 Context value도 바뀌지 않는다.

### Provider 중첩 구조 — app/layout.tsx

```tsx
// apps/page0127/app/layout.tsx
<QueryProvider>           {/* React Query 캐시 관리 */}
  <CurrentUserProvider>   {/* 인증 정보 공급 */}
    {children}
    <Toaster />
  </CurrentUserProvider>
</QueryProvider>
```

현재 구조의 장점: `QueryProvider`와 `CurrentUserProvider`가 명확히 분리되어 있다.  
`CurrentUserProvider`가 현재 하나의 역할(인증)만 담당하므로 성능 이슈 없음.

---

## 4. 정리

| 규칙 | 이유 |
| ---- | ---- |
| Context는 역할별로 분리 | 변경 빈도가 다른 값을 묶으면 불필요한 리렌더 발생 |
| value에 객체 넣을 때 주의 | 매 렌더마다 새 참조 → useMemo로 메모이제이션 검토 |
| React Query + Context 조합 | 캐싱으로 참조 안정성 확보, 직접 상태 관리보다 유리 |

---

## 5. 오늘 실험

### 실험 1 — Context 분리해서 리렌더 확인

`CurrentUserProvider` 안에 UI 상태를 추가해 리렌더가 퍼지는지 확인한다.

```tsx
// apps/page0127/src/features/auth/providers/CurrentUserProvider.tsx

// ① 기존 value에 카운터 추가 (분리 전)
const [count, setCount] = useState(0);

<CurrentUserContext.Provider value={{ currentUser, isLoading, count }}>
  <button onClick={() => setCount(c => c + 1)}>count++</button>
  {children}
</CurrentUserContext.Provider>
```

버튼 클릭 시 `useCurrentUserContext()`를 쓰는 **모든 컴포넌트가 리렌더**되는지  
React DevTools Profiler로 확인한다.

```tsx
// ② UIContext로 분리 (분리 후)
const UIContext = createContext<{ count: number; setCount: ... } | null>(null);

<CurrentUserContext.Provider value={{ currentUser, isLoading }}>
  <UIContext.Provider value={{ count, setCount }}>
    {children}
  </UIContext.Provider>
</CurrentUserContext.Provider>
```

count 변경 시 `useCurrentUserContext` 구독자는 리렌더되지 않아야 한다.

---

### 실험 2 — useMemo로 value 안정화

같은 데이터인데도 리렌더가 일어난다면 `useMemo`로 value 참조를 안정화한다.

```tsx
// apps/page0127/src/features/auth/providers/CurrentUserProvider.tsx
import { createContext, useContext, useMemo } from 'react';

export const CurrentUserProvider = ({ children }: CurrentUserProviderProps) => {
  const { data: currentUser, isLoading } = useCurrentUser();

  // currentUser, isLoading이 실제로 바뀔 때만 새 객체 생성
  const value = useMemo(
    () => ({ currentUser, isLoading }),
    [currentUser, isLoading]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
};
```

React DevTools로 메모이제이션 전/후 리렌더 횟수를 비교한다.

---

## 6. 다음 Day 예고

**Day 35 — useReducer**  
useState가 복잡해질 때 useReducer로 상태 전환 로직을 정리하는 패턴.  
`action.type`으로 상태 변경을 명시적으로 표현하는 방법을 배운다.
