# Day 57 — useFormStatus + React 19 문법 개선

> Phase 6 시작 · Phase 5의 폼 흐름을 마무리하는 보충 Day
> 한 줄 요약: **`useFormStatus`는 제출 버튼이 부모 `<form>`의 상태를 직접 읽게 해준다.** 더불어 React 19가 `forwardRef`·`Context.Provider` 같은 보일러플레이트를 없앴다.

---

## 1. 오늘 읽을 코드

- [ReadingGoalDialog.tsx](apps/page0127/src/features/profile/ui/ReadingGoalDialog.tsx) — `useActionState` 폼 (useFormStatus 적용 대상)
- [BookSearchInput.tsx](apps/page0127/src/features/book/ui/BookSearchInput.tsx) — **ref as prop 이미 적용됨** (after 실물)
- [CurrentUserProvider.tsx](apps/page0127/src/entities/user/providers/CurrentUserProvider.tsx) — **아직 `.Provider` 사용** (before 실물)

---

## 2. `useFormStatus` — 제출 버튼이 폼 상태를 "직접" 읽는다

### 문제 상황

[ReadingGoalDialog](apps/page0127/src/features/profile/ui/ReadingGoalDialog.tsx#L133-L135)는 제출 버튼이 **폼과 같은 컴포넌트 안**에 있어서 `isPending`을 그냥 쓴다:

```tsx
const [state, formAction, isPending] = useActionState(...);
// ...
<Button type='submit' disabled={isPending}>
  {isPending ? '저장 중...' : '저장'}
</Button>
```

그런데 제출 버튼을 **재사용하려고 별도 컴포넌트로 빼면** 문제가 생긴다.
`isPending`을 일일이 prop으로 내려야 하고, 폼이 깊어지면 prop drilling이 된다.

### 해결 — `useFormStatus`

별도 컴포넌트가 **부모 `<form>`의 제출 상태를 직접** 읽는다. prop이 필요 없다.

```tsx
// SubmitButton.tsx — <form> 안에 들어갈 별도 컴포넌트
'use client';
import { useFormStatus } from 'react-dom'; // ⚠️ 'react'가 아니라 'react-dom'

export const SubmitButton = () => {
  const { pending } = useFormStatus(); // 부모 <form>의 제출 중 여부를 직접 읽음
  return (
    <Button type='submit' disabled={pending}>
      {pending ? '저장 중...' : '저장'}
    </Button>
  );
};
```

```tsx
// 부모: prop 없이 그냥 끼우기만 하면 됨
<form action={formAction}>
  ...
  <SubmitButton /> {/* isPending을 안 내려도 됨! */}
</form>
```

> **제약 2가지**
> 1. `useFormStatus`는 **`<form>`의 자식 컴포넌트 안에서만** 동작한다. 같은 컴포넌트의 form을 읽지 못한다(반드시 한 단계 아래).
> 2. import는 `react`가 아니라 **`react-dom`**.

### `useActionState`의 isPending vs useFormStatus

| | `useActionState`의 `isPending` | `useFormStatus().pending` |
|---|---|---|
| 누가 쓰나 | **폼을 선언한 컴포넌트** 본인 | 폼 **안의 자식** 컴포넌트 |
| 용도 | 폼 전체 로직과 함께 관리 | 버튼 등 조각을 분리·재사용 |

> ReadingGoalDialog처럼 버튼이 폼과 한 컴포넌트면 `isPending`으로 충분하다.
> **버튼을 공용 컴포넌트로 빼는 순간** `useFormStatus`가 빛난다.

---

## 3. React 19 문법 개선 3종 (보일러플레이트 제거)

### (A) ref as prop — `forwardRef`가 필요 없다

**page0127이 이미 적용한 부분** ([BookSearchInput.tsx](apps/page0127/src/features/book/ui/BookSearchInput.tsx)):

```tsx
// Before (React 18) — forwardRef로 감싸야 했음
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));
Input.displayName = 'Input'; // displayName도 수동

// After (React 19) — BookSearchInput가 이렇게 함: ref를 그냥 prop으로
type Props = { ref?: React.Ref<HTMLInputElement> }; // ← ref가 일반 prop으로 승격
const Input = ({ ref, ...props }: Props) => <input ref={ref} {...props} />;
```

> 실제 주석: *"React 19: ref가 일반 prop으로 승격 — forwardRef 래핑 불필요"* — [BookSearchInput.tsx:13](apps/page0127/src/features/book/ui/BookSearchInput.tsx#L13)

### (B) `<Context>` as provider — `.Provider`를 생략한다

**page0127이 아직 옛 방식인 부분** ([CurrentUserProvider.tsx](apps/page0127/src/entities/user/providers/CurrentUserProvider.tsx#L36-L38)):

```tsx
// Before (현재 page0127)
<CurrentUserContext.Provider value={{ currentUser, isLoading }}>
  {children}
</CurrentUserContext.Provider>

// After (React 19) — Context 자체를 컴포넌트로 사용, .Provider 생략
<CurrentUserContext value={{ currentUser, isLoading }}>
  {children}
</CurrentUserContext>
```

> 동작은 100% 동일. `.Provider`만 지우면 끝 → **오늘 실험에서 직접 바꿔볼 부분.**

### (C) Document Metadata — 컴포넌트에서 `<title>`/`<meta>` 직접

```tsx
// React 19: 컴포넌트 어디서 써도 React가 <head>로 끌어올려 준다
const StatsPage = () => (
  <article>
    <title>독서 통계</title>
    <meta name='description' content='나의 독서 기록' />
    {/* ... */}
  </article>
);
```

> ⚠️ 단, **Next.js App Router**에선 `export const metadata`/`generateMetadata`가 표준이라
> page0127에선 이 React 기능을 직접 쓸 일이 적다. "React 자체에도 이 기능이 생겼다"만 알아두면 된다.

---

## 4. 정리

| 기능 | Before | After | page0127 상태 |
|---|---|---|---|
| 폼 조각의 pending | prop drilling | `useFormStatus()` | 미적용 (실험 대상) |
| ref 전달 | `forwardRef` + displayName | `ref` prop | **이미 적용** ✅ |
| Context 제공 | `<Ctx.Provider>` | `<Ctx>` | 아직 `.Provider` |
| 메타데이터 | `next/head` 등 | `<title>`/`<meta>` 직접 | Next.js metadata 사용 |

> 한 줄: **React 19는 "감싸는 코드(forwardRef)·붙이는 코드(.Provider)·내리는 코드(prop)"를 걷어낸다.**

---

## 5. 오늘 실험 (2가지)

### 실험 1 — `CurrentUserProvider`에서 `.Provider` 지우기 (사본으로)

1. `<CurrentUserContext.Provider value={...}>` → `<CurrentUserContext value={...}>`로 변경.
2. 닫는 태그도 `</CurrentUserContext>`로.
3. 앱이 똑같이 동작하는지 확인 → "정말 `.Provider`만 지우면 되는가?" 검증.

### 실험 2 — `ReadingGoalDialog` 제출 버튼을 `SubmitButton`으로 분리 (사본으로)

1. `react-dom`에서 `useFormStatus`를 import.
2. `<SubmitButton />` 컴포넌트를 만들고 `const { pending } = useFormStatus();` 사용.
3. `<form>` 안에 `<SubmitButton />`을 끼우고 `isPending` prop을 **안 내려도** 동작하는지 확인.
4. 한 줄 메모: "useFormStatus가 동작하려면 버튼이 ___ 안에 있어야 한다."

---

## 6. 다음 Day 예고

**Day 58 — React 19.2 신규 API**: `<Activity>`로 탭의 숨은 영역을 미리 렌더(unmount 대신 숨김)해 전환을 빠르게 하고, `useEffectEvent`로 "Effect 안에서 최신 값은 읽되 의존성 배열엔 안 넣는" 문제를 푼다. 여기서부터 Phase 6의 **성능·동시성** 본론이 시작된다.
