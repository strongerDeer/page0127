# Day 50 — `useActionState` 개요 (React 19)

> Phase 5 시작. 폼 제출을 `useState` 여러 개로 수동 관리하던 방식을 React 19의 `useActionState` + Server Action으로 바꾸는 기본 패턴을 익힌다.

## 🪧 한 줄 정의

- **`useActionState`** — 폼의 **입력값·로딩(`isPending`)·결과(`state`)를 한 훅으로 묶어주는** React 19 훅. ("`useState` 여러 개 + `handleSubmit`"의 보일러플레이트 대체)
- **Server Action** — 클라이언트에서 부르지만 **실제 실행은 서버에서** 일어나는 async 함수. (`fetch`/API Route 없이 DB·인증 같은 서버 자원에 직접 접근)

> 둘은 자주 짝지어 쓰여서 한 묶음처럼 보이지만 **독립적인 도구**다. 자세한 건 [§ Server Action은 필수가 아니다](#server-action은-필수가-아니다) 참고.

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

### 무엇이 묶이는가 — 기존 4개 → `[state, action, isPending]` 하나로

폼 한 사이클(**입력 → 제출 → 로딩 → 결과**)에 필요했던 모든 걸 한 훅으로 패키징한다.

| 기존 (따로따로 4개) | `useActionState` (통합) |
| --- | --- |
| 입력값 `useState` | `FormData`로 자동 수집 (사실 **사라짐**) |
| 제출 이벤트 `handleSubmit` + `e.preventDefault()` | `action` 함수 |
| 로딩 `isSubmitting` `useState` | `isPending` (자동) |
| 결과/에러 `useState` | `state` (action의 반환값) |

> 핵심: `onChange` 같은 **입력 이벤트는 묶이는 게 아니라 아예 안 써도 된다** (`name` 속성 + `defaultValue`로 충분). 묶이는 유일한 이벤트는 **`onSubmit` 하나**.

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

### Server Action은 왜 생겼나 — 간단한 진화사

```
PHP/Rails 시절       →   <form action="/save">       페이지 통째로 리로드
       ↓
SPA + REST API       →   fetch + 백엔드 엔드포인트   두 군데 코딩, 잡일 많음
       ↓
Server Action        →   그냥 함수 호출              한 군데, 자동 처리
```

**SPA + REST 시대의 불편함 (지금까지 우리가 한 방식)**

1. **같은 일을 두 군데** — 프론트 `fetch` + 백엔드 엔드포인트 둘 다 만들어야
2. **잡일을 직접** — `JSON.stringify`, 메서드, 헤더, 인증 토큰 ...
3. **타입 안전성 끊김** — 보내는 모양과 받는 모양을 따로 맞춰야
4. **로딩·에러 수동** — `isLoading` `useState`, `try/catch` ...
5. **JS 꺼지면 폼 작동 X** — `fetch`는 자바스크립트 필수

**Server Action이 해결한 것**

엔드포인트를 안 만든다. 함수 하나 + `'use server'` 한 줄이면:

- 클라이언트가 함수를 부르면 React/Next가 자동으로 서버 요청을 만듦
- 인자·반환값 자동 직렬화/역직렬화
- 인증 쿠키 자동 첨부
- `<form action={formAction}>`에 꽂으면 **JS 꺼져도 폼 동작**

> **본질:** "신뢰할 수 없는 환경(브라우저)에서 신뢰할 수 있는 환경(서버)으로 코드를 옮긴 것." 옛날 PHP 폼의 단순함 + SPA의 동적 UI를 합쳤다.

### Server Action과의 결합 (`'use server'`)

action 함수 맨 위에 `'use server'`를 붙이면 **서버에서 실행**된다. 클라이언트는 폼만 보내고, 검증·DB 작업은 서버에서.

```typescript
'use server';
export const updateProfileAction = async (prevState, formData) => {
  // 이 코드는 서버에서만 돈다 (DB 직접 접근 OK)
};
```

### Server Action은 필수가 아니다

`useActionState`가 요구하는 건 **`(prevState, formData) => Promise<nextState>` 시그니처의 async 함수 하나**. 그게 서버에서 도는지 클라이언트에서 도는지는 신경 안 쓴다.

```typescript
// 'use server' 없는 그냥 클라이언트 함수도 완벽히 동작
const submitInquiry = async (prevState, formData) => {
  const res = await fetch('/api/inquiry', { method: 'POST', body: formData });
  return res.ok ? { status: 'success' } : { status: 'error' };
};
const [state, formAction, isPending] = useActionState(submitInquiry, initial);
```

| 이득 | `useActionState`만 (클라 action) | + Server Action |
| --- | --- | --- |
| `useState`·`isPending`·FormData 자동화 | ✅ | ✅ |
| 서버에서 인증 직접 확인 (userId prop 제거) | ❌ | ✅ |
| 검증을 서버로 (클라 우회 불가) | ❌ | ✅ |
| JS 비활성에서도 폼 제출 작동 | ❌ | ✅ |

> 정리: **`useActionState`는 "폼 보일러플레이트"를 줄이고, Server Action은 "데이터 흐름의 신뢰 경계"를 옮긴다.** 둘은 자주 같이 쓰일 뿐, 독립적으로 도입할 수 있다. 기존 mutation·fetch를 그대로 두고 `useActionState`만 얹는 부분 적용도 가능.

### Server Action 셋팅 — 사실상 별로 없다

**Next.js 14+ App Router**라면 추가 셋팅 없이 바로 쓸 수 있다. page0127(Next.js 16)도 셋팅 한 줄 안 만지고 그대로 도입했다.

**환경 조건**

| 환경 | 셋팅 |
| --- | --- |
| Next.js 14+ App Router | 기본 활성. 아무 셋팅 불필요 ✅ |
| Next.js 13 (구버전) | `next.config.js`에 `experimental: { serverActions: true }` |
| Pages Router | ❌ 지원 안 함 |

**코드 레벨 규칙 4가지**

```typescript
'use server';                   // ① 파일 맨 위(또는 함수 안)에 지시문 — 필수
export const action = async (   // ② 반드시 async
  prevState: State,             // ③ useActionState와 쓸 땐: (prevState, formData)
  formData: FormData
): Promise<State> => {
  // ④ 인자·반환값은 직렬화 가능해야 함 (문자열·숫자·객체·FormData OK / 함수·클래스 NO)
};
```

**서버 자원(DB·인증) 접근용 클라이언트**

Server Action 자체는 셋팅이 없어도 동작하지만, **DB·인증에 접근하려면 서버용 클라이언트가 필요**하다. page0127엔 이미 준비돼 있다:

- [supabase/server.ts](../apps/page0127/src/shared/config/supabase/server.ts) — `cookies()` 기반 서버 Supabase 클라이언트
- [supabase/middleware.ts](../apps/page0127/src/shared/config/supabase/middleware.ts) — 요청 쿠키 갱신 (인증 세션 유지)

**자주 같이 쓰는 보조 도구 (선택)**

| 도구 | 언제 |
| --- | --- |
| `revalidatePath('/dashboard')` | Action 후 해당 경로 캐시 갱신 |
| `revalidateTag('books')` | 태그 기반 캐시 갱신 |
| `redirect('/...')` | Action 후 다른 페이지로 이동 |
| `router.refresh()` (클라) | 우리가 `onSuccess`에서 쓴 방식 |

> **한 줄 정리:** Next.js 14+ App Router + `'use server'` + async 함수. 끝.

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

## 4. 언제 어느 도구를 쓸까 — 의사결정 가이드

### Server Action이 잘 맞는 / 안 맞는 시나리오

| ✅ 잘 맞음 | 🔴 안 맞음 |
| --- | --- |
| 단순 CRUD 폼 (회원가입, 게시글·댓글) | 실시간 대시보드 (WebSocket·polling) |
| 결제·주문 등 **보안 민감 작업** | 낙관적 UI가 핵심인 곳 (좋아요 즉시 반응) |
| 콘텐츠 사이트 (블로그·CMS·커머스) | 그리기 도구·복잡한 인터랙티브 차트 |
| JS 비활성 대응(점진적 향상)이 중요 | React Native 등 다른 플랫폼과 코드 공유 |
| 풀스택 작은~중간 프로젝트 | 이미 분리된 백엔드 서버가 있음 |

### 처음부터 도입? vs 기존 스택 유지?

| 🟢 Server Action 우선 | 🟢 TanStack Query + axios 우선 |
| --- | --- |
| 신규 Next.js App Router 프로젝트 | 별도 백엔드 서버가 이미 있음 |
| 풀스택으로 가는 프로젝트 | 대시보드·실시간이 핵심 |
| 콘텐츠 중심 | 다른 플랫폼과 클라이언트 로직 공유 |
| RSC 패턴에 익숙한 팀 | TanStack Query로 아키텍처 안정 (← page0127) |

### 실무 정답 — 거의 항상 **혼합**

```
읽기 (조회)     → Server Component + fetch  (페이지 진입 시 데이터)
실시간·캐싱    → TanStack Query              (낙관적·재요청·캐시 관리)
쓰기 (변경)    → Server Action               (보안·검증·간결함)
```

### page0127 권장

| 상황 | 추천 |
| --- | --- |
| 기존 mutation (좋아요·댓글·책 추가) | **그대로 유지** — TanStack Query 잘 작동 중 |
| 새 폼 중 단순 CRUD | **Server Action 시도** |
| 실시간·낙관적이 중요한 곳 | TanStack Query 유지 |
| 보안 민감 (인증·권한) | **Server Action 강력 추천** ← ReadingGoal이 이 케이스 |

### REST API 백엔드가 있는 실무 환경에선? (BFF 패턴)

이미 NestJS/Spring/FastAPI 같은 **별도 백엔드 서버**가 있는 프로젝트에서도 Server Action을 도입할 수 있다. 단 **백엔드를 대체하지 않고, 백엔드 API를 호출하는 얇은 어댑터 레이어(BFF)** 가 된다.

```
[기존 SPA]
브라우저 ──fetch──▶ REST API 서버 ──▶ DB

[Server Action 도입 시]
브라우저 ──action──▶ Next.js 서버 ──fetch──▶ REST API 서버 ──▶ DB
                     ↑↑↑
                   BFF 레이어
```

**Server Action 안에서 백엔드 호출 예시**

```typescript
'use server';

export const updateProfileAction = async (prevState, formData) => {
  // ① 서버 쿠키에서 토큰 꺼냄 (브라우저에 노출 X)
  const token = (await cookies()).get('access_token')?.value;

  // ② 기존 백엔드 REST API 그대로 호출
  const res = await fetch(`${process.env.API_URL}/users/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nickname: formData.get('nickname') }),
  });

  // ③ 결과를 클라이언트로
  return res.ok
    ? { status: 'success', message: '저장됨' }
    : { status: 'error', message: '실패' };
};
```

**비즈니스 로직(검증·DB·도메인 규칙)은 여전히 백엔드에 있다.** Server Action은 그걸 호출하는 통로일 뿐.

> "프론트가 너무 많이 책임지나?" → **본질적 책임은 안 늘어남. 위치만 "브라우저 → Next 서버"로 이동.** 비즈니스 로직은 그대로 백엔드.

**장단점**

| ✅ 장점 | ❌ 단점/우려 |
| --- | --- |
| 토큰을 HTTP-only 쿠키에 두면 XSS 안전 | 네트워크 한 단계 추가 (지연 약간↑) |
| 백엔드 URL 클라이언트에 노출 X | Next.js 서버 운영 부담 (Node.js 호스팅 비용) |
| 인증·에러·로깅을 한 곳에 통합 | 인증 흐름 설계 추가 (토큰 릴레이) |
| JS 비활성에서도 폼 동작 | 디버깅 경로 길어짐 |
| 함수 호출이라 타입 안전 | 이미 잘 도는 SPA면 도입 이득 작음 |

**실무 도입 판단**

| 상황 | 추천 |
| --- | --- |
| 이미 Next.js 쓰고, 보안·UX 개선 필요 | **점진적 도입** (로그인·결제 같은 보안 민감 작업부터) |
| 정적 호스팅 SPA + REST 백엔드 | 굳이 안 도입. SPA 유지 |
| 회사에 BFF 레이어가 따로 있음 | 거기 두고 Server Action은 신중히 |
| 마이크로프론트엔드·다른 플랫폼 연동 | TanStack Query + REST가 호환성↑ |

> **REST 환경 한 줄 결론:** **도입은 가능, 대체가 아니라 어댑터.** 가장 흔한 도입은 **보안 민감 작업부터 점진적으로** 옮기는 방식.

### 한 줄 결론 (전체)

> "둘 중 하나를 고르는 게 아니라, 작업 단위마다 적합한 도구를 고른다." 점진적 혼합이 정석.

---

## 5. 정리

| 항목 | 기존 (`useState`) | `useActionState` |
| --- | --- | --- |
| 입력값 | `value` + `onChange` 일일이 | `name` + `FormData` 자동 |
| 제출 중 | `isSubmitting` 수동 | `isPending` 자동 |
| 폼 핸들러 | `onSubmit` + `preventDefault` | `action={formAction}` |
| 결과/에러 | `useState` + 분기 | action `return` → `state` |

**한 줄 규칙:** `useActionState`는 "입력값 + pending + 결과"를 한 훅으로 묶고, `<form action={...}>`에 연결해 보일러플레이트를 없앤다.

---

## 6. 오늘 실험 (2가지)

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

## 7. 다음 Day 예고

**Day 51 — `useActionState` 실습**: 에러/pending 상태 처리 + 유효성 검사. `state`에 에러 메시지를 담아 폼에 표시하는 패턴을 직접 구현한다.
