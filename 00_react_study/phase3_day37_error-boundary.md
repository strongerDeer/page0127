# Day 37 — Error Boundary

## 오늘 읽을 코드

- [ErrorBoundary.tsx](../apps/page0127/src/shared/ui/ErrorBoundary.tsx)
- [layout.tsx](../apps/page0127/app/layout.tsx)

---

## 핵심 개념

### Error Boundary란?

하위 컴포넌트 트리에서 발생한 JS 에러를 **캐치해서 fallback UI를 보여주는** 컴포넌트.

```
App
 └── ErrorBoundary  ← 여기서 에러 캐치
       └── BookList  ← 여기서 에러 발생
```

에러가 없으면 children 그대로 렌더링. 에러가 나면 fallback UI 표시.

---

### 왜 Class Component인가?

Error Boundary는 두 가지 생명주기 메서드를 사용한다:

| 메서드 | 역할 | 함수형 대체 |
|---|---|---|
| `getDerivedStateFromError` | 에러 발생 → 상태 업데이트 | ❌ 없음 |
| `componentDidCatch` | 에러 로깅 | ❌ 없음 |

→ **2024년 현재도 Class Component로만 구현 가능**. (`react-error-boundary` 라이브러리가 이를 wrapping해줌)

---

### page0127 기존 구현

```typescript
// shared/ui/ErrorBoundary.tsx:42-44
static getDerivedStateFromError(error: Error): ErrorBoundaryState {
  return { hasError: true, error };
}
// 에러 발생 순간 state.hasError = true → 다음 렌더에서 fallback UI 표시
```

```typescript
// shared/ui/ErrorBoundary.tsx:52-54
handleReset = () => {
  this.setState({ hasError: false, error: null });
};
// "다시 시도" 버튼 → 에러 상태 초기화 → children 다시 렌더링 시도
```

---

### 문제: 현재 아무 데도 사용 안 됨

`ErrorBoundary`가 `shared/ui/`에 있지만 **app/layout.tsx에서 감싸지 않음**.
즉 Supabase API 실패나 렌더링 에러가 나면 흰 화면(White Screen of Death)이 뜸.

---

### 개선 방향: layout.tsx에 추가

```typescript
// app/layout.tsx — 개선 예시
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

const RootLayout = ({ children }) => {
  return (
    <html lang='ko-KR'>
      <body>
        <QueryProvider>
          <CurrentUserProvider>
            <ErrorBoundary>  {/* ← 여기 추가 */}
              {children}
              <Toaster />
            </ErrorBoundary>
          </CurrentUserProvider>
        </QueryProvider>
      </body>
    </html>
  );
};
```

> **주의**: `ErrorBoundary`는 `'use client'`다. Server Component인 RootLayout에서 import해도 되는가?  
> → 된다. SC는 CC를 children으로 쓸 수 있다.  
> → 단, ErrorBoundary 자체가 SC가 되는 건 아니다 — CC 경계가 유지된다.

---

### Next.js의 error.tsx와 차이

| | `ErrorBoundary` (수동) | `error.tsx` (Next.js 내장) |
|---|---|---|
| 범위 | 감싼 subtree | 해당 route segment |
| 설정 | 직접 배치 | 파일 생성으로 자동 |
| 세분화 | 컴포넌트 단위 | 페이지/레이아웃 단위 |
| 서버 에러 | ❌ 캐치 불가 | ✅ 캐치 가능 |

**규칙**: 페이지 수준 → `error.tsx`, 컴포넌트 수준 → `ErrorBoundary`

---

## 오늘 실험

### 실험 1 — ErrorBoundary 직접 터뜨리기

테스트용 컴포넌트를 만들어서 에러를 강제로 발생시킨다:

```typescript
// 아무 페이지에 임시로 추가
const BrokenComponent = () => {
  throw new Error('의도적으로 발생시킨 에러입니다');
  return <div>이 줄은 실행 안 됨</div>;
};
```

`ErrorBoundary`로 감싸기 전/후 화면을 비교한다.

### 실험 2 — Next.js error.tsx 만들기

```bash
touch apps/page0127/app/error.tsx
```

```typescript
'use client'; // error.tsx는 반드시 Client Component

type ErrorProps = {
  error: Error;
  reset: () => void;
};

export const Error = ({ error, reset }: ErrorProps) => {
  return (
    <div>
      <h2>페이지 오류: {error.message}</h2>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
};

export default Error;
```

`BrokenComponent`를 `ErrorBoundary` 없이 렌더링했을 때 `error.tsx`가 뜨는지 확인.

---

## 다음 Day 예고

**Day 38 — 상태 구조 설계: flat vs nested**
- 클라이언트 상태를 어떻게 구조화할지 결정하는 기준
- Zustand 도입 여부 결정 (vs TanStack Query로 통일)
- page0127에서 현재 상태 관리 방식 점검
