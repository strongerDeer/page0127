# Day 33 — Context

> 날짜: 2026-04-13 | 주제: React Context API 구조와 실전 패턴

---

## 1. 오늘 읽을 코드

- [QueryProvider.tsx](../apps/page0127/src/shared/providers/QueryProvider.tsx) — shared/providers 레이어
- [StatusTabFilter.tsx](../apps/page0127/src/shared/ui/StatusTabFilter.tsx) — Compound Component + createContext 실사용
- [app/layout.tsx](../apps/page0127/app/layout.tsx) — Provider 트리 최상단 조립

---

## 2. 핵심 개념

### Context란?

Props drilling 없이 **컴포넌트 트리 전체에 값을 공급**하는 메커니즘.
`createContext` → `Provider` → `useContext` 세 단계로 구성된다.

```tsx
// 1. Context 생성
const ThemeContext = createContext<'light' | 'dark'>('light');

// 2. Provider로 감싸기 (값 공급)
<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>

// 3. 어디서든 꺼내 쓰기
const theme = useContext(ThemeContext);
```

### null 초기값 패턴

Provider 밖에서 실수로 쓰면 런타임 에러를 내주는 안전장치.

```tsx
// ✅ null로 시작 → 커스텀 훅에서 체크
const MyContext = createContext<MyContextType | null>(null);

const useMyContext = () => {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error('Provider 밖에서 사용 불가');
  return ctx; // 이후로는 null이 아님이 보장
};
```

### Provider 배치 전략

| 범위 | 위치 | 예시 |
|---|---|---|
| 앱 전체 | `app/layout.tsx` (Root Layout) | QueryProvider, ThemeProvider |
| 페이지/섹션 단위 | 해당 layout.tsx 또는 컴포넌트 내부 | StatusTabFilterContext |
| 컴포넌트 내부 | 컴포넌트 자체 | Compound Component Context |

---

## 3. page0127 실제 코드 사례

### 사례 1 — QueryProvider (전역 Provider)

```tsx
// app/layout.tsx — Server Component이지만 Client Provider를 감쌀 수 있다
const RootLayout = ({ children }) => (
  <html lang='ko-KR'>
    <body>
      <QueryProvider>   {/* 'use client' Provider */}
        {children}
        <Toaster />
      </QueryProvider>
    </body>
  </html>
);
```

- `QueryProvider` 내부에서 `useState`로 `QueryClient` 인스턴스 생성
- `useState(() => new QueryClient(...))` — **lazy initializer**: 리렌더링 시 재생성 방지

### 사례 2 — StatusTabFilter (컴포넌트 스코프 Context)

```tsx
// 컴포넌트 내부 Context → Provider 밖 사용 불가
const StatusTabFilterContext =
  createContext<StatusTabFilterContextType | null>(null);

// 커스텀 훅으로 null 체크 캡슐화
const useStatusTabFilter = () => {
  const ctx = useContext(StatusTabFilterContext);
  if (!ctx) throw new Error('StatusTabFilter.Tab은 StatusTabFilter 안에서만 사용 가능');
  return ctx;
};

// Provider = 부모 컴포넌트
export const StatusTabFilter = ({ value, onChange, isPending, children }) => (
  <StatusTabFilterContext.Provider value={{ activeValue: value, onChange, isPending }}>
    <div className='mb-6 flex flex-wrap gap-2'>{children}</div>
  </StatusTabFilterContext.Provider>
);

// Consumer = 서브 컴포넌트
const Tab = ({ value, children }) => {
  const { activeValue, onChange } = useStatusTabFilter();
  // ...
};
```

---

## 4. 정리 규칙

> **Context = 공급(createContext + Provider) + 소비(useContext).**  
> 범위가 좁을수록 컴포넌트 내부에, 범위가 넓을수록 layout.tsx 상단에 둔다.  
> null 초기값 + 커스텀 훅 조합으로 Provider 밖 오용을 컴파일 타임이 아닌 런타임에 즉시 차단한다.

---

## 5. 오늘 실험

**실험 1 — Provider 밖에서 useContext 호출해보기**

`StatusTabFilter.Tab`을 `StatusTabFilter` 밖에서 렌더링하면 어떤 에러가 나는지 확인.

```tsx
// ❌ Provider 없이 직접 렌더링
<StatusTabFilter.Tab value="all">전체</StatusTabFilter.Tab>
// → "StatusTabFilter.Tab은 StatusTabFilter 안에서만 사용 가능" 에러 확인
```

**실험 2 — QueryClient lazy initializer vs 직접 생성 차이**

```tsx
// ❌ 리렌더링마다 새 인스턴스 생성 → 캐시 초기화됨
const [queryClient] = useState(new QueryClient());

// ✅ 함수 형태: 최초 1회만 실행
const [queryClient] = useState(() => new QueryClient());
```

`useState`에 함수를 넘기면 왜 한 번만 실행되는지 React 공식 문서에서 확인.

---

## 6. 다음 Day 예고

**Day 34 — useReducer**  
`useState`로는 관리가 어려운 복잡한 상태 변경 로직을 `useReducer`로 구조화하는 패턴.  
page0127의 폼 상태 또는 필터 상태 관리에서 적용 사례를 살펴볼 예정.
