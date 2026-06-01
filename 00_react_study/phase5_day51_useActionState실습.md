# Phase 5 · Day 51 — useActionState 실습 (에러 / pending / 유효성 검사)

> Day 50에서 `useActionState`의 **기본 패턴**을 봤다면, 오늘은 실전에서 꼭 필요한
> **에러 처리 · pending 상태 · 서버 유효성 검사**를 코드로 확인한다.

---

## 1. 오늘 읽을 코드

- [updateReadingGoalAction.ts](../apps/page0127/src/features/profile/api/updateReadingGoalAction.ts) — Server Action (검증 + DB 저장)
- [ReadingGoalDialog.tsx](../apps/page0127/src/features/profile/ui/ReadingGoalDialog.tsx) — 폼 + 상태 표시 UI

---

## 2. 핵심 개념

### (1) Action State는 "status로 분기"하는 게 핵심

`useActionState`가 관리하는 상태를 단순 문자열이 아니라 **status 필드를 가진 객체**로
설계하면, 클라이언트에서 성공/실패를 깔끔하게 분기할 수 있다.

```typescript
export type ReadingGoalActionState = {
  status: 'idle' | 'success' | 'error'; // ← 이 값으로 toast 분기
  message: string;                       // ← 사용자에게 보여줄 문구
};
```

> `idle`(제출 전) → `success` / `error`(제출 후). 3가지 상태를 명시하면
> "처음 렌더"와 "검증 실패"를 헷갈리지 않는다.

### (2) 유효성 검사는 **서버에서** 한다

`'use server'` 함수 안에서 검증하면 클라이언트가 우회할 수 없다.
검증 실패 시 throw가 아니라 **state를 return** 하는 게 포인트다.

```typescript
if (!target || target < 1) {
  // 에러를 던지지 않고, 상태로 "돌려준다" → 폼이 그대로 유지됨
  return { status: 'error', message: '목표는 최소 1권 이상이어야 합니다.' };
}
```

> throw하면 에러 바운더리로 튀지만, return하면 **같은 폼에서 메시지만 갱신**된다.

### (3) pending은 React가 자동으로 준다

```typescript
const [state, formAction, isPending] = useActionState(action, initialState);
//      ↑상태    ↑form에 연결   ↑제출 중이면 true (수동 isLoading 불필요)
```

- `state` : action이 마지막에 return한 값
- `formAction` : `<form action={formAction}>`에 그대로 연결
- `isPending` : 제출~응답 사이 `true` → 버튼 disabled / 로딩 텍스트에 사용

---

## 3. page0127 실제 코드 사례

### 서버: 검증 → 인증 → 저장, 모두 상태로 응답

[updateReadingGoalAction.ts](../apps/page0127/src/features/profile/api/updateReadingGoalAction.ts)

```typescript
export const updateReadingGoalAction = async (
  _prevState: ReadingGoalActionState, // 이전 상태 (여기선 안 씀 → _ 접두사)
  formData: FormData                   // <input name>이 자동 수집된 데이터
): Promise<ReadingGoalActionState> => {
  const target = Number(formData.get('target')); // FormData 값은 항상 string

  // ① 유효성 검사 (실패 시 error 상태 return)
  if (!target || target < 1) {
    return { status: 'error', message: '목표는 최소 1권 이상이어야 합니다.' };
  }

  // ② 인증 — 클라이언트가 보낸 id를 믿지 않고 쿠키로 직접 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: '로그인이 필요합니다.' };

  // ③ DB 에러도 error 상태로 변환
  const { error } = await supabase.from('profiles').update({ ... });
  if (error) return { status: 'error', message: '독서 목표 설정에 실패했습니다.' };

  return { status: 'success', message: '독서 목표가 설정되었습니다! 🎯' };
};
```

> **3단계 모두** throw 없이 `{ status, message }`로 돌려준다 → UI는 한 곳에서만 분기.

### 클라이언트: state 변화를 useEffect로 후처리

[ReadingGoalDialog.tsx](../apps/page0127/src/features/profile/ui/ReadingGoalDialog.tsx)

```tsx
const [state, formAction, isPending] = useActionState(
  updateReadingGoalAction,
  { status: 'idle', message: '' } // initialState
);

// action이 새 state를 return하면 → 그에 맞춰 toast / 콜백 실행
useEffect(() => {
  if (state.status === 'success') {
    toast.success(state.message);
    onSuccess();
    onClose();
  } else if (state.status === 'error') {
    toast.error(state.message); // 폼은 닫지 않고 메시지만 표시
  }
}, [state, onSuccess, onClose]);

return (
  <form action={formAction}>            {/* onSubmit/preventDefault 불필요 */}
    <Input name='year' type='number' defaultValue={...} />   {/* value/onChange ✗ */}
    <Input name='target' type='number' defaultValue={...} /> {/* name이 곧 FormData key */}
    <Button type='submit' disabled={isPending}>
      {isPending ? '저장 중...' : '저장'} {/* pending 자동 반영 */}
    </Button>
  </form>
);
```

> **왜 useEffect인가?** action의 return값은 state일 뿐, toast를 띄우진 않는다.
> "state가 바뀌면 → 부수효과 실행"이라는 React의 정석 흐름을 그대로 쓴다.

---

## 4. 정리

| 관심사       | 옛날 방식 (useState)        | useActionState 방식           |
| ------------ | --------------------------- | ----------------------------- |
| 입력값 수집  | `value` + `onChange`        | `name` + `defaultValue`       |
| 제출         | `onSubmit` + `preventDefault` | `<form action={formAction}>`  |
| 로딩         | `isLoading` 수동 toggle     | `isPending` 자동              |
| 에러         | `catch` → `setError`        | action이 `error` 상태 return  |
| 후처리       | 핸들러 안에서 직접          | `state` 변화 → `useEffect`    |

> **규칙 1줄**: 검증·에러는 서버에서 throw하지 말고 `{ status, message }` 상태로 **돌려주고**, 클라이언트는 그 상태를 `useEffect`로 후처리한다.

---

## 5. 오늘 실험 (2가지)

1. **검증 분기 추가** — `updateReadingGoalAction.ts`에 "목표가 짝수가 아니면 error"
   같은 임의 규칙을 하나 더 넣어보고, 다이얼로그에서 toast 메시지가 바뀌는지 확인.
   (서버 검증 → 상태 return → useEffect toast 흐름 체감)

2. **pending 늦추기** — action 맨 위에 `await new Promise(r => setTimeout(r, 2000))`를
   잠깐 넣어 2초 지연을 만든 뒤, 저장 버튼이 `저장 중...` + disabled로 바뀌는지 관찰.
   (확인 후 코드 원복)

---

## 6. 다음 Day 예고

**Day 52 — useOptimistic**: 좋아요 버튼처럼 서버 응답을 **기다리지 않고 즉시 UI를 반영**하는
낙관적 업데이트를 다룬다. 오늘의 "응답 후 상태 반영"과 대비해서 보면 좋다.
