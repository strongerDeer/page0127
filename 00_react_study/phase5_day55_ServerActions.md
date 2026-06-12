# Day 55 — Server Actions: 서버 함수를 클라이언트에서 직접 부르기

> Phase 5 · React 19 / Next.js
> 한 줄 요약: **`'use server'`를 붙이면 그 함수는 "클라이언트에서 호출할 수 있는 서버 함수"가 된다.** API 라우트를 따로 안 만들어도 된다.

---

## 1. 오늘 읽을 코드

- [updateReadingGoalAction.ts](apps/page0127/src/features/profile/api/updateReadingGoalAction.ts) — 실제 Server Action (`'use server'` + 서버 인증 + 서버 유효성 검사)
- [FollowButton.tsx](apps/page0127/src/features/follow/ui/FollowButton.tsx) — 같은 "데이터 바꾸기"를 React Query로 한 대조 사례

> page0127은 **폼은 Server Action, 인터랙티브 버튼은 React Query**로 나눠 쓴다. 오늘은 둘을 비교하며 "언제 Server Action을 쓰나"를 잡는다.

---

## 2. 핵심 개념

### Server Action이란

`'use server'`가 붙은 함수다. **클라이언트가 직접 호출하지만 실행은 서버에서만** 된다.
원래라면 `/api/...` 라우트를 만들고 fetch해야 할 일을, **함수 하나로** 끝낸다.

```tsx
// actions.ts
'use server';

export const followUser = async (targetId: string) => {
  // 이 코드는 서버에서만 돈다 → DB·비밀키 직접 접근 OK
  const supabase = await createClient();
  await supabase.from('follows').insert({ following_id: targetId });
};
```

```tsx
'use client';
import { followUser } from './actions';

const Btn = ({ id }) => (
  // 클라이언트에서 그냥 함수처럼 호출 → 내부적으로 서버 요청이 나간다
  <button onClick={() => followUser(id)}>팔로우</button>
);
```

### 왜 좋은가

| | 기존 (API 라우트) | Server Action |
|---|---|---|
| 만들 것 | `/api/follow` 라우트 + fetch 코드 | 함수 하나 |
| 타입 | 요청/응답 직접 맞춰야 함 | 함수 시그니처로 자동 |
| 보안 | 라우트에서 인증 재확인 | 함수 안에서 인증 확인 |

### `revalidatePath` — 바꾼 뒤 화면 갱신

Server Action으로 DB를 바꿔도 **이미 그려진 화면은 옛 데이터** 그대로다.
`revalidatePath('/경로')`를 호출하면 Next.js가 그 경로의 **서버 컴포넌트를 다시 렌더**해서 최신 데이터로 바꿔준다.

```tsx
'use server';
import { revalidatePath } from 'next/cache';

export const followUser = async (targetId: string) => {
  await supabase.from('follows').insert({ following_id: targetId });
  revalidatePath('/users'); // ← /users 화면을 최신 데이터로 다시 그림
};
```

---

## 2-1. 언제 Server Action을 쓰나 (판단 기준)

> **"클라이언트가 보낸 값을 그대로 믿으면 위험한 일"이면 Server Action.**

핵심: **브라우저 코드는 사용자가 다 보고 조작할 수 있다.** 개발자도구로 코드를 바꿔
아무 값이나 서버로 보낼 수 있다. 그래서 "믿으면 안 되는 일"은 서버에서 다시 확인해야 한다.

### 비유 — 안내문 vs 경비원

- **클라이언트 검증** = 가게 입구의 *"18세 이상만 입장"* 안내문 → 무시하고 들어갈 수 있음
- **서버 검증** = 입구에서 *신분증 검사하는 경비원* → 못 지나감

비밀번호 "8자 이상"을 클라이언트에서만 막으면 개발자도구로 우회해 1자짜리도 보낼 수 있다.
**서버에서 다시 검사**해야 진짜로 막힌다. Server Action이 그 "경비원"을 두는 자리다.

### 이런 일이면 Server Action ✅ (하나라도 해당하면)

1. **본인 확인 필요** — "내 것만 바꿀 수 있어야 함" (남의 정보 수정 차단)
2. **검증을 우회하면 안 됨** — 비밀번호 규칙, 권한, 결제 금액
3. **DB·비밀키 직접 접근** — 브라우저에 노출되면 안 되는 것
4. **DB 값과 대조** — 이메일 중복 확인 등

### 예: 회원가입 / 회원정보 수정 → 둘 다 ✅

| 기능 | 왜 Server Action인가 |
|---|---|
| **회원가입** | 이메일 중복 확인(DB 대조) + 비밀번호 규칙 검증(우회 차단) + 계정 생성(비밀키) |
| **회원정보 수정** | "내 정보만" 바꿔야 함 → `userId`를 클라가 보내면 위조 가능 → 서버가 쿠키로 본인 확인 |

> ⚠️ 위험한 안티패턴: `userId`를 prop으로 받아 `update(...).eq('id', clientUserId)` 하면
> 공격자가 **남의 ID를 넣어 다른 사람 정보를 바꿀 수 있다.** 그래서 서버가 직접 로그인 사용자를 확인한다.

### 반대로 안 써도 되는 경우 ❌

- **좋아요·팔로우 토글** → 보안 민감도 낮고 *즉각 반응*이 중요 → React Query
- **단순 읽기** → 서버 컴포넌트에서 그냥 `await`

---

## 3. page0127 실제 코드 사례

### (A) 진짜 Server Action — `updateReadingGoalAction`

```ts
'use server'; // ← 이 함수 전체가 서버에서만 실행

export const updateReadingGoalAction = async (
  _prevState: ReadingGoalActionState,
  formData: FormData // ← <input name="...">을 자동 수집
): Promise<ReadingGoalActionState> => {
  const target = Number(formData.get('target'));

  // ① 유효성 검사를 "서버에서" → 클라이언트 우회 불가
  if (!target || target < 1) {
    return { status: 'error', message: '목표는 최소 1권 이상이어야 합니다.' };
  }

  const supabase = await createClient();
  // ② userId를 클라이언트에서 안 받고, 쿠키로 직접 확인 (보안 핵심)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: '로그인이 필요합니다.' };

  // ③ DB 직접 접근
  await supabase.from('profiles').update({ reading_goal: { year, target } }).eq('id', user.id);
  return { status: 'success', message: '독서 목표가 설정되었습니다! 🎯' };
};
```

**왜 Server Action이 보안에 유리한가** — `userId`를 클라이언트가 보내면 위조할 수 있다.
서버 함수 안에서 `auth.getUser()`로 직접 확인하니 **"남의 목표를 바꾸는" 우회가 불가능**하다. 유효성 검사도 마찬가지.

> 이 액션은 `useActionState`와 짝이다 (Day 50~51). 시그니처 `(이전 상태, FormData) => 다음 상태`가 그래서 나온 것.

### (B) 대조군 — `FollowButton`은 React Query로 했다

연결 포인트는 "팔로우를 Server Action으로"였지만, **실제 page0127의 팔로우는 Server Action이 아니다.** React Query로 구현돼 있다:

```tsx
'use client';
const followMutation = useMutation({
  mutationFn: () => followApi.followUser({ following_id: userId }), // axios API 호출
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: followKeys.all }); // ← 갱신 방식
    followBroadcast.sendFollowEvent('follow', userId); // 다른 탭에도 전파
  },
});
```

**갱신 방식이 다르다**: Server Action은 서버에서 `revalidatePath`로 서버 컴포넌트를 다시 그리고,
React Query는 클라이언트에서 `invalidateQueries`로 쿼리를 다시 가져온다.

---

## 4. 그래서 언제 무엇을? (page0127의 실제 선택)

| 상황 | page0127의 선택 | 이유 |
|---|---|---|
| **폼 제출** (독서 목표, 프로필) | Server Action + `useActionState` | FormData·서버 검증·보안이 자연스러움 |
| **버튼 토글** (팔로우, 좋아요) | React Query `useMutation` | 낙관적 업데이트·다중 탭 동기화·캐시 관리가 강력 |

> 규칙: **"폼처럼 제출하고 끝"이면 Server Action, "버튼처럼 즉각 반응·캐시 동기화"가 중요하면 React Query.** 둘 다 mutation이지만 결이 다르다.

(참고) page0127엔 `revalidatePath`가 **한 군데도 없다.** 폼 액션은 `useActionState` 상태로 toast를 띄우고 `router.refresh()`로 갱신, 버튼은 `invalidateQueries`로 갱신하기 때문. `revalidatePath`는 "Server Action만으로 화면까지 갱신"할 때 쓰는 선택지로 알아두면 된다.

---

## 5. 오늘 실험 (2가지)

### 실험 1 — "이 mutation은 어느 쪽?" 분류

1. 비밀번호 변경 폼 → ?
2. 게시글 좋아요 하트 토글 → ?
3. 댓글 작성 후 목록 갱신 → ?

> 가이드: 1) Server Action(폼+서버검증) 2) React Query(즉각 토글) 3) 둘 다 가능 — 폼이면 Server Action+revalidatePath, 인터랙티브면 React Query

### 실험 2 — `updateReadingGoalAction`에 `revalidatePath` 끼워보기 (사본으로)

1. 액션 마지막 `return` 직전에 `revalidatePath('/dashboard')`를 추가하면?
2. 지금은 클라이언트가 `router.refresh()`로 갱신하는데, `revalidatePath`로 바꾸면 **클라이언트 코드에서 갱신 호출을 지울 수 있는지** 따져보기.
3. 한 줄 메모: "router.refresh()와 revalidatePath의 차이는 ___ (누가 호출하나)."

---

## 6. 다음 Day 예고

**Day 56 — Phase 5 복습**: `useActionState`·`useOptimistic`·`use()`·Server Actions를 적용하기 전/후 코드를 diff로 비교한다. "React 19 기능으로 어떤 코드가 얼마나 단순해졌는지"를 정리하며 Phase 5를 마무리한다.
