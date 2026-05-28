# Day 50 — `useActionState` 개요 (React 19)

> Phase 5 시작. 폼 제출을 `useState` 여러 개로 수동 관리하던 방식을 React 19의 `useActionState` + Server Action으로 바꾸는 기본 패턴을 익힌다.

---

## 1. 오늘 읽을 코드

- [ProfileSettingsForm.tsx](../apps/page0127/src/features/profile/ui/ProfileSettingsForm.tsx) — 현재 "수동 관리" 클라이언트 폼 (오늘의 Before 사례)
- (page0127엔 아직 `useActionState`/`'use server'` 코드 없음 → 신규 패턴 학습)

---

## 2. 핵심 개념

### `useActionState`가 푸는 문제

폼을 제출하면 보통 **3가지 상태**를 직접 관리해야 한다: ① 입력값 ② 제출 중(pending) ③ 결과/에러. 지금까지는 `useState`를 그만큼 만들었다.

`useActionState`는 이 셋을 **하나의 훅**으로 묶어준다.

```typescript
const [state, formAction, isPending] = useActionState(action, initialState);
//      │       │            │
//      │       │            └─ 제출 중 여부 (자동 관리)
//      │       └─ <form action={formAction}>에 그대로 연결
//      └─ action이 반환한 값 (결과/에러 메시지 등)
```

| 반환값 | 의미 |
| --- | --- |
| `state` | `action` 함수가 `return`한 값 (직전 결과) |
| `formAction` | `<form action={...}>`에 넣는 제출 핸들러 |
| `isPending` | 제출 진행 중이면 `true` (로딩 버튼에 활용) |

### action 함수의 시그니처

```typescript
// 첫 인자: 이전 state, 둘째 인자: FormData (폼 입력값 자동 수집)
const action = async (prevState, formData) => {
  const nickname = formData.get('nickname'); // name 속성으로 값 꺼냄
  // ... 처리 ...
  return { message: '저장 완료' };            // 이 반환값이 다음 state
};
```

> `useState`로 입력값을 일일이 잡지 않아도, `<input name="nickname">`처럼 **`name`만 주면 `FormData`가 자동 수집**한다.

### Server Action과의 결합 (`'use server'`)

action 함수 맨 위에 `'use server'`를 붙이면 **서버에서 실행**된다. 클라이언트는 폼만 보내고, 검증·DB 작업은 서버에서.

```typescript
'use server';
export const updateProfileAction = async (prevState, formData) => {
  // 이 코드는 서버에서만 돈다 (DB 직접 접근 OK)
};
```

---

## 3. page0127 사례 — Before(현재) vs After(가능한 모습)

### Before — [ProfileSettingsForm.tsx](../apps/page0127/src/features/profile/ui/ProfileSettingsForm.tsx) (현재 방식)

`useState`가 5개, `handleSubmit`에서 pending·에러를 전부 수동 관리:

```typescript
const [nickname, setNickname] = useState(profile.nickname || '');
const [bio, setBio] = useState(profile.bio || '');
const [isSubmitting, setIsSubmitting] = useState(false); // ← pending 수동
// ...
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);            // ← 시작 시 켜고
  try {
    const success = await updateProfile(profile.id, updateData);
    if (success) toast.success(...);
    else toast.error(...);          // ← 에러도 수동 분기
  } finally {
    setIsSubmitting(false);         // ← 끝나면 끄고
  }
};

<input value={nickname} onChange={(e) => setNickname(e.target.value)} />
<Button disabled={isSubmitting}>{isSubmitting ? '저장 중...' : '저장'}</Button>
```

### After — `useActionState`로 바꾼 모습 (개념)

```tsx
'use client';
import { useActionState } from 'react';
import { updateProfileAction } from './actions'; // 'use server' 함수

export const ProfileSettingsForm = ({ profile }) => {
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    { message: '' }
  );

  return (
    <form action={formAction}>            {/* onSubmit/preventDefault 불필요 */}
      <input name='nickname' defaultValue={profile.nickname ?? ''} />
      {/* value/onChange 불필요 → name으로 FormData 자동 수집 */}

      <Button disabled={isPending}>       {/* isSubmitting 직접 안 만듦 */}
        {isPending ? '저장 중...' : '저장'}
      </Button>

      {state.message && <p>{state.message}</p>} {/* action 반환값 표시 */}
    </form>
  );
};
```

> 핵심 변화: `useState` 5개 → 0개. `value/onChange` → `name`. `isSubmitting` 수동 → `isPending` 자동. `e.preventDefault()` → 불필요.

---

## 4. 정리

| 항목 | 기존 (`useState`) | `useActionState` |
| --- | --- | --- |
| 입력값 | `value` + `onChange` 일일이 | `name` + `FormData` 자동 |
| 제출 중 | `isSubmitting` 수동 | `isPending` 자동 |
| 폼 핸들러 | `onSubmit` + `preventDefault` | `action={formAction}` |
| 결과/에러 | `useState` + 분기 | action `return` → `state` |

**한 줄 규칙:** `useActionState`는 "입력값 + pending + 결과"를 한 훅으로 묶고, `<form action={...}>`에 연결해 보일러플레이트를 없앤다.

---

## 5. 오늘 실험 (2가지)

1. **반환값 3개의 이름을 직접 매핑해보기**
   `const [state, formAction, isPending] = useActionState(...)` 에서 각 값이 위 Before 코드의 어느 `useState`를 대체하는지 종이/주석에 1:1로 적어본다. (예: `isPending` ← `isSubmitting`)

2. **`FormData.get()` 감 잡기**
   아주 작은 폼으로 손코딩:
   ```tsx
   const action = async (_prev: unknown, formData: FormData) => {
     const name = formData.get('name'); // input의 name 속성과 매칭
     return { message: `안녕, ${name}!` };
   };
   ```
   `<input name='name' />`의 `name`과 `formData.get('name')`이 어떻게 연결되는지 확인한다.

---

## 6. 다음 Day 예고

**Day 51 — `useActionState` 실습**: 에러/pending 상태 처리 + 유효성 검사. `state`에 에러 메시지를 담아 폼에 표시하는 패턴을 직접 구현한다.
