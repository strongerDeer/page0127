# Day 40 — App Router 라우트 구조 재파악

> page0127의 `app/` 디렉토리를 한 장의 트리로 도식화하고, **Route Group `(auth)` / `(public)` / `(protected)`** 가 어떻게 인증 분기와 레이아웃 분리를 동시에 처리하는지 확인한다.

---

## 1. 오늘 읽을 코드

- [apps/page0127/app/layout.tsx](apps/page0127/app/layout.tsx) — Root Layout (모든 페이지 공통)
- [apps/page0127/app/(auth)/layout.tsx](apps/page0127/app/(auth)/layout.tsx) — 로그인된 사용자 차단
- [apps/page0127/app/(public)/layout.tsx](apps/page0127/app/(public)/layout.tsx) — 누구나 접근 가능
- [apps/page0127/app/(protected)/layout.tsx](apps/page0127/app/(protected)/layout.tsx) — 로그인 필수

---

## 2. 핵심 개념

### 2-1. Route Group `( )` 의 정체

폴더 이름을 `(이름)` 으로 감싸면 **URL 경로에 포함되지 않는다.**

```
app/(auth)/login/page.tsx      →  /login         ✅ (auth)는 URL에서 사라짐
app/(protected)/books/page.tsx →  /books
app/(public)/page.tsx          →  /
```

→ URL은 그대로 두고 **레이아웃·접근 제어만 묶고 싶을 때** 쓴다.

### 2-2. 왜 묶는가? — 2가지 동시에 해결

| 묶는 효과            | 구체적 행동                                  |
| -------------------- | -------------------------------------------- |
| **공통 Layout 적용** | 헤더 유무, Provider 추가 등을 그룹 단위로    |
| **공통 접근 제어**   | 그룹의 `layout.tsx`에서 `redirect()` 한 번만 |

세 그룹의 책임이 명확히 다르다 ↓

| 그룹            | 인증 상태        | 동작                            | 헤더 |
| --------------- | ---------------- | ------------------------------- | ---- |
| **(auth)**      | 비로그인 전용    | 로그인된 사용자 → `/dashboard`  | ❌    |
| **(public)**    | 누구나           | 차단 없음                       | ✅    |
| **(protected)** | 로그인 필수      | 비로그인 → `/login`             | ✅    |

### 2-3. Layout 중첩 — 트리로 보기

```
RootLayout (html/body, QueryProvider, CurrentUserProvider)
├── (auth)/layout          → 로그인된 유저 차단
│   └── login/page
├── (public)/layout        → 헤더 + 통과
│   ├── page               (/)
│   ├── [username]/page    (/:username)
│   └── test-tokens/page
├── (protected)/layout     → 비로그인 차단 + 헤더
│   ├── dashboard/page
│   ├── books/page, [id]/page, add, all, info, edit
│   ├── feed/page, [activityId]
│   ├── search, settings, notifications
│   └── dashboard/taste-analysis/page
├── auth/callback/route.ts (OAuth 콜백 — 그룹 밖)
├── api/...                (Route Handlers — 그룹 밖)
├── error.tsx              (전역 에러 바운더리)
└── not-found.tsx          (전역 404)
```

> ⚠️ Route Group은 **URL을 바꾸지 않으므로** 같은 path가 두 그룹에 동시에 있으면 충돌난다. (예: `(auth)/page.tsx` 와 `(public)/page.tsx` 가 둘 다 `/` 가 되어 빌드 에러)

---

## 3. page0127 실제 코드 사례

### 3-1. `(protected)/layout.tsx` — 인증 게이트 + 헤더

[apps/page0127/app/(protected)/layout.tsx](apps/page0127/app/(protected)/layout.tsx)

```tsx
const ProtectedLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인하지 않은 사용자는 로그인 페이지로 리디렉션
  if (!user) {
    redirect('/login');
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
};
```

✅ **포인트**
- `async` Server Component → Supabase 세션을 서버에서 검증
- 이 한 번의 redirect로 `/books`, `/dashboard`, `/feed` 등 **모든 하위 페이지가 자동 보호된다**
- 각 page.tsx에서 인증 체크를 **반복하지 않아도 된다**

### 3-2. `(auth)/layout.tsx` — 반대 방향 가드

[apps/page0127/app/(auth)/layout.tsx](apps/page0127/app/(auth)/layout.tsx)

```tsx
if (user) {
  redirect('/dashboard');
}
```

이미 로그인한 사용자가 `/login`에 들어오는 걸 차단. UX적으로 중요.

### 3-3. `(public)/layout.tsx` — 가드 없음, 헤더만

[apps/page0127/app/(public)/layout.tsx](apps/page0127/app/(public)/layout.tsx)

가장 단순. 인증 분기 없이 `Header` 만 붙인다. `'use client'` 없음 → Server Component.

### 3-4. Root Layout — 모든 그룹의 부모

[apps/page0127/app/layout.tsx](apps/page0127/app/layout.tsx)

```tsx
<QueryProvider>
  <CurrentUserProvider>
    {children}
    <Toaster />
  </CurrentUserProvider>
</QueryProvider>
```

→ TanStack Query, 현재 사용자 컨텍스트, Toast는 **그룹 위쪽**(Root)에 둬서 모든 그룹에서 공유.

---

## 4. 정리 표

| 질문                                             | page0127의 답                                            |
| ------------------------------------------------ | -------------------------------------------------------- |
| URL에 영향 없이 묶고 싶을 때?                    | `(그룹명)` 폴더                                          |
| 인증 가드는 어디에?                              | 그룹 `layout.tsx` 에서 `redirect()`                      |
| 같은 path가 두 그룹에 있으면?                    | 빌드 에러 (URL 충돌)                                     |
| Provider는 어디에 두는 게 맞나?                  | Root Layout (모든 그룹의 공통 부모)                      |
| 로그인 후 `/login` 진입 막기?                    | `(auth)/layout.tsx` 에서 `if (user) redirect('/dashboard')` |

**한 줄 규칙**: *접근 제어는 페이지가 아니라 그룹 `layout.tsx`에서 단 한 번.*

---

## 5. 오늘 실험

### 실험 1 — Route Group이 URL에 안 나오는지 직접 확인

dev 서버를 띄우고 브라우저 주소창에서:

```
http://localhost:3000/books       ← (protected)/books/page.tsx
http://localhost:3000/(protected)/books  ← ???
```

두 번째 URL은 어떻게 되는가? (직접 입력해 보고 결과 확인 → 404가 떠야 정상)

### 실험 2 — 가드를 우회해서 직접 페이지에 들어가면?

1. 로그아웃 상태에서 브라우저 주소창에 `http://localhost:3000/dashboard` 입력
2. 어떤 일이 일어나는가? → `(protected)/layout.tsx` 의 `redirect('/login')` 이 발동되는지 네트워크 탭에서 확인
3. **Bonus**: `(protected)/layout.tsx` 에서 redirect 라인을 잠깐 주석 처리하면, 하위 page들은 어떻게 동작하나? (각 page.tsx에 인증 체크가 없으므로 그대로 노출됨 → 그룹 가드의 필요성 체감)

---

## 6. 다음 Day 예고

**Day 41 — Server Component 최적화**: page0127에서 *불필요하게* `'use client'` 가 붙은 컴포넌트를 찾아본다. 인터랙션·훅 없이 단순 렌더링만 하는 컴포넌트는 SC로 되돌릴 수 있다. 데이터 패칭 로직이 클라이언트에 있는 곳도 함께 점검.
