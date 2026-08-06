# 카카오 로그인 1단계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 외에 카카오로도 로그인할 수 있게 하고, 그 과정에서 코드 전반의 "이메일은 항상 있다"는 가정을 걷어낸다.

**Architecture:** 프로바이더 이름이 박혀 있던 훅·버튼을 `provider` 를 인자로 받는 하나로 합친다. 아이디 생성은 이메일 전용 함수에서 "이메일 → 닉네임 → `reader`" 순으로 떨어지는 시드 함수로 바꾼다. 로그인 실패 사유 판정은 `isBannedRedirect` 와 같은 자리에 순수 함수로 둔다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Supabase Auth (`@supabase/ssr`) · vitest · Tailwind + `@repo/ui` 디자인 시스템

**설계 문서:** [2026-08-06-social-login-expansion-design.md](../specs/2026-08-06-social-login-expansion-design.md)

## Global Constraints

- **패키지 매니저는 npm 이다.** `pnpm` 이 아니다 — 워크스페이스 명령은 전부 아래 형태를 쓴다.
  ```
  npm run test  --workspace=page0127
  npm run lint  --workspace=page0127
  npm run build --workspace=page0127
  ```
- **모든 코드는 TypeScript.** `any` 금지 → `unknown` + 타입 가드. `type` 사용, `interface` 금지.
- **`console.log` 금지.** `console.warn` / `console.error` 만.
- **컴포넌트에는 `type XxxProps = {...}` 를 바로 위에 선언.**
- **import 순서:** React → Next.js → 외부 라이브러리 → 내부 alias(`@/*`) → 상대 경로 → 타입 → 스타일. 그룹 사이 빈 줄.
- **Prettier:** `singleQuote: true`, JSX 도 홑따옴표, `printWidth: 80`, `semi: true`.
- **Server Component 우선.** `'use client'` 는 상태·이벤트 핸들러가 필요할 때만.
- **커밋 메시지는 `{이모지} {타입}: {제목}`** (명령조, 마침표 없음). **`Co-Authored-By` 트레일러 절대 금지.**
- **커밋·푸시는 사용자 승인 후에만.** 각 Task 의 커밋 단계는 사용자가 명시적으로 요청했을 때만 실행한다.
- **테스트는 대상 파일 옆에** `*.test.ts` 로 둔다 (`username.ts` ↔ `username.test.ts`).
- **eslint autofix 는 바꾼 파일에만.** `eslint . --fix` 전체 실행 금지.

## ⚠️ 아이콘은 `@repo/icons` 를 쓰지 않는다

작업 중에 발견한 것이다. `@repo/icons` 의 `Icons` 는 `@iconify/react` 로 아이콘을
**런타임에 `api.iconify.design` 에서 받아온다.** 그런데 이 앱의 CSP
(`apps/page0127/next.config.ts:144`) 의 `connect-src` 에 그 호스트가 없다.

즉 **운영 로그인 화면의 구글 아이콘은 지금까지 렌더되지 않고 있었다.** 실패가
조용해서 아무도 몰랐다.

아이콘 두 개 때문에 모든 페이지에 서드파티 연결을 여는 것은 남는 장사가 아니므로,
**브랜드 마크는 `features/auth/model/providers.tsx` 에 인라인 SVG 로 둔다.**
`@repo/icons` 자체를 고치는 것(번들에 컬렉션을 담기)은 별개 과제다 — 이 계획의
범위 밖이고, `Icons.tsx` 에 경고 주석을 남겨 두었다.

---

## 이미 끝난 것 (검증 완료 · 미커밋)

`npm run test --workspace=page0127` → **42 파일 317 테스트 전부 통과** (2026-08-06 확인).

### ✅ 아이디 생성에서 이메일 의존 제거

- `entities/profile/model/username.ts` — `generateUsernameFromEmail(email)` 을
  **삭제**하고 `generateUsernameSeed(source)` 로 교체했다.

  ```ts
  generateUsernameSeed(source: {
    email?: string | null;
    nickname?: string | null;
  }): string
  ```

  이메일 로컬파트 → 닉네임 → `USERNAME_FALLBACK_SEED`(`'reader'`) 순으로 시도하고,
  각 후보를 `validateUsername` 으로 걸러 통과하는 첫 값을 돌려준다.

  **공급자 metadata 키를 여기서 알지 않는 것이 이 설계의 핵심이다** — 닉네임 추출은
  `toIdentityDefaults` 의 일이고, 호출하는 쪽이 이미 뽑아서 넘긴다. 카카오가 다른
  키를 쓰더라도 고칠 곳은 `identityDefaults.ts` 하나다.

- `entities/profile/api/getProfile.ts` — `generateUniqueUsername({ email, nickname })`,
  `upsertProfile(userId, email: string | null, metadata?)`,
  `ensureProfile(userId, email: string | null, metadata?)` 로 넓혔다.
  `toIdentityDefaults(metadata)` 를 함수 앞에서 한 번만 부르고 아이디 재료와
  프로필 초기값에 함께 쓴다.

- `app/auth/callback/route.ts`, `app/(auth)/layout.tsx` — `user.email!` 의 `!` 를 지우고
  `?? null` 로 바꿨다.

- `entities/profile/model/username.test.ts` — `generateUsernameSeed` 기준으로 다시 썼다
  (이메일 우선순위, 닉네임 폴백, 한글 닉네임 → `reader`, 예약어 건너뛰기 포함).

### ✅ 프로바이더 정의

- `features/auth/model/providers.tsx` **신규**. 아래를 export 한다:

  ```ts
  type OAuthProvider = 'google' | 'kakao'
  OAUTH_PROVIDERS: Record<OAuthProvider, {
    label: string;
    className: string;
    mark: React.ReactNode;
  }>
  LOGIN_PROVIDER_ORDER: OAuthProvider[]   // ['kakao', 'google']
  ```

  구글·카카오 브랜드 마크가 인라인 SVG 로 들어 있다. 카카오 버튼 색
  (`bg-[#FEE500] text-[#191600]`)은 카카오 디자인 가이드가 강제하는 값이고,
  왜 토큰 밖 색을 박는지 파일에 주석으로 적혀 있다.

- `packages/icons/src/Icons.tsx` — 위의 CSP 함정을 경고 주석으로 남겼다. 매핑은
  건드리지 않았다 (카카오 키를 넣어 봐야 렌더되지 않으므로).

### 남은 것

Task 3 → 4 → 5 → 6 순으로 진행한다. 아래 각 Task 는 독립적으로 리뷰 가능하다.

---

### Task 3: 탈퇴 확인을 이메일에서 아이디로 바꾼다

**Files:**
- Modify: `apps/page0127/src/features/auth/ui/DeleteAccountDialog.tsx`
- Modify: `apps/page0127/src/features/profile/ui/ProfileSettingsForm.tsx:37, 137, 143, 305`

**Interfaces:**
- Consumes: 없음
- Produces: `<DeleteAccountDialog username={string} />`, `<ProfileSettingsForm.DangerZone username={string} />`

**이건 UX 개선이 아니라 결함 수정이다.** 지금은 `emailInput === userEmail` 인데
`ProfileSettingsForm` 이 `profile.email || ''` 를 넘긴다. 이메일 없는 사용자는
양쪽이 `''` 라 **아무것도 입력하지 않아도 삭제 버튼이 활성화된다.**
이메일 의존을 걷어낸 순간 이 사용자가 실제로 생기므로, 카카오를 켜기 전에 고쳐야 한다.

`username` 은 DB 가 항상 보장한다 (`profiles.username` 유니크 + CHECK).

- [ ] **Step 1: `DeleteAccountDialog` 를 아이디 기준으로 바꾼다**

`apps/page0127/src/features/auth/ui/DeleteAccountDialog.tsx` 에서 아래 조각들을 교체한다.

props 타입 (14~16행):

```tsx
type DeleteAccountDialogProps = {
  /**
   * 확인 문구로 입력받을 값.
   *
   * 예전에는 이메일이었다. 그런데 카카오 로그인은 이메일을 주지 않을 수 있고,
   * 그때 부모가 '' 를 넘기면 빈 입력이 그대로 일치해 **아무것도 치지 않아도
   * 삭제 버튼이 켜졌다.** username 은 DB 가 항상 보장한다.
   */
  username: string;
};
```

주석 블록(21~25행)의 "2단계 확인: 버튼 클릭 + 이메일 입력" 을
"2단계 확인: 버튼 클릭 + 아이디 입력" 으로 고친다.

컴포넌트 시작과 상태 (27~38행):

```tsx
export const DeleteAccountDialog = ({ username }: DeleteAccountDialogProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 입력된 아이디 확인용 상태
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 아이디가 일치하는지 확인
  const isConfirmed = confirmInput === username;
```

핸들러 앞부분 (41~45행):

```tsx
  const handleDeleteAccount = async () => {
    if (!isConfirmed) {
      toast.error('아이디가 일치하지 않습니다.');
      return;
    }
```

확인 입력 영역 (110~121행):

```tsx
              <div className='space-y-2 mt-4'>
                <p className='text-sm font-medium'>
                  계속하려면 아이디 <strong>{username}</strong>를 입력하세요:
                </p>
                <Input
                  type='text'
                  placeholder={username}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className='font-mono'
                />
              </div>
```

푸터 (126~133행):

```tsx
          <AlertDialogCancel onClick={() => setConfirmInput('')}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={!isConfirmed || isDeleting}
            className='bg-destructive hover:bg-destructive/90 focus:ring-destructive'
          >
```

- [ ] **Step 2: `ProfileSettingsForm` 의 prop 을 맞춘다**

`apps/page0127/src/features/profile/ui/ProfileSettingsForm.tsx` 네 곳:

- 37행 근처 `ProfileSettingsFormDangerZoneProps` 의 `userEmail: string;` → `username: string;`
- 137행 근처 구조 분해 `({ userEmail })` → `({ username })`
- 143행 `<DeleteAccountDialog userEmail={userEmail} />` → `<DeleteAccountDialog username={username} />`
- 305행 `<ProfileSettingsForm.DangerZone userEmail={profile.email || ''} />`
  → `<ProfileSettingsForm.DangerZone username={profile.username} />`

⚠️ **`profile.email || ''` 를 그대로 두고 prop 이름만 바꾸지 말 것.** 값 자체를
`profile.username` 으로 바꿔야 이 Task 의 의미가 있다.

- [ ] **Step 3: 남은 참조가 없는지 확인한다**

```
grep -rn "userEmail" apps/page0127/src
```

기대: 결과 없음 (0건).

- [ ] **Step 4: 타입 검사·린트·테스트**

```
npm run lint --workspace=page0127
npm run test --workspace=page0127
```

기대: 둘 다 통과 (테스트 317건 유지).

- [ ] **Step 5: 화면에서 확인한다**

```
npm run dev --workspace=page0127
```

`/settings` → 계정 삭제 → 다이얼로그를 연다.

- 아무것도 입력하지 않았을 때 **삭제 버튼이 비활성**인지 ← 이 Task 의 핵심
- 자기 아이디를 정확히 쳤을 때만 활성화되는지
- **삭제 버튼은 실제로 누르지 않는다** — 되돌릴 수 없다

- [ ] **Step 6: 커밋** — 사용자 승인 후에만

```bash
git add apps/page0127/src/features/auth/ui/DeleteAccountDialog.tsx apps/page0127/src/features/profile/ui/ProfileSettingsForm.tsx
git commit -m "🐛 Fix: 탈퇴 확인을 이메일 대신 아이디로 받는다

이메일이 없는 계정은 빈 입력이 빈 이메일과 일치해
아무것도 치지 않아도 삭제 버튼이 활성화됐다.
username 은 DB 가 항상 보장한다."
```

---

### Task 4: OAuth 훅·버튼을 프로바이더 중립으로 만들고 로그인 화면에 붙인다

**Files:**
- Create: `apps/page0127/src/features/auth/api/useOAuthLogin.ts`
- Create: `apps/page0127/src/features/auth/ui/OAuthLoginButton.tsx`
- Delete: `apps/page0127/src/features/auth/api/useGoogleLogin.ts`
- Delete: `apps/page0127/src/features/auth/ui/LoginWithGoogleButton.tsx`
- Modify: `apps/page0127/app/(auth)/login/page.tsx`
- (이미 있음: `apps/page0127/src/features/auth/model/providers.tsx`)

**Interfaces:**
- Consumes:
  - `createClient` (`@/shared/config/supabase/client`)
  - `toSafeRedirect` (`@/shared/lib/auth/safeRedirect`)
  - `Button`, `cn` (`@repo/ui`)
  - `OAUTH_PROVIDERS`, `LOGIN_PROVIDER_ORDER`, `type OAuthProvider` (`../model/providers`)
- Produces:
  - `useOAuthLogin(provider: OAuthProvider): { login: (next?: string | null) => Promise<void>; isLoading: boolean; error: string | null }`
  - `<OAuthLoginButton provider={OAuthProvider} next={string | null} />`

호출처가 `login/page.tsx` 한 곳뿐이라 옛 이름을 래퍼로 남기지 않고 삭제한다.

⚠️ **파일 삭제는 `git rm` 으로 한다.** bash `rm` 은 `/rewind` 로 복구되지 않는다.

- [ ] **Step 1: 훅을 만든다**

`apps/page0127/src/features/auth/api/useOAuthLogin.ts`:

```ts
'use client';

import { useState } from 'react';

import { createClient } from '@/shared/config/supabase/client';
import { toSafeRedirect } from '@/shared/lib/auth/safeRedirect';

import type { OAuthProvider } from '../model/providers';

/**
 * OAuth 로그인 Custom Hook (공급자 중립)
 *
 * @description
 * - Supabase 의 signInWithOAuth 로 로그인을 시작한다
 * - 공급자를 인자로 받아 구글·카카오가 같은 코드를 쓴다.
 *   예전에는 useGoogleLogin 하나였고, 카카오를 붙이려면 파일을 복사해야 해서
 *   리디렉션 URL 조립 로직이 두 벌이 될 참이었다.
 *
 * @example
 * ```tsx
 * const { login, isLoading, error } = useOAuthLogin('kakao');
 * ```
 */
export const useOAuthLogin = (provider: OAuthProvider) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** @param next 로그인 후 돌아갈 내부 경로. 없으면 콜백이 본인 서재로 보낸다 */
  const login = async (next?: string | null) => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // OAuth 리디렉션 URL 설정
    // - 항상 "지금 접속 중인 브라우저 도메인"(location.origin)을 우선한다.
    //   → 로컬은 localhost:3000, 프로덕션은 배포 도메인이 자동으로 잡힘.
    // - NEXT_PUBLIC_* 는 빌드 타임에 값이 박혀서, localhost로 빌드하면
    //   프로덕션에서도 localhost로 돌아오는 문제가 있었음 → 환경변수는 폴백으로만.
    const siteUrl = location.origin || process.env.NEXT_PUBLIC_SITE_URL;

    // 로그인 뒤 돌아갈 곳을 콜백까지 들려 보낸다.
    // 여기서 한 번 걸러도 콜백에서 다시 검증한다 — 콜백 URL 은 사용자가 직접
    // 만들어 열 수 있어서 클라이언트 검증만으로는 못 막는다.
    const safeNext = toSafeRedirect(next);
    const callbackUrl = safeNext
      ? `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`
      : `${siteUrl}/auth/callback`;

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });

    // 성공하면 브라우저가 공급자 페이지로 떠나므로 아래 줄은 실행되지 않는다.
    // 여기 도달했다는 것 자체가 "시작조차 못 했다"는 뜻이다.
    if (authError) {
      console.error(`${provider} 로그인 오류:`, authError.message);
      setError('로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};
```

⚠️ `setIsLoading(false)` 를 **에러일 때만** 부르는 것이 의도다. 성공하면 페이지가
공급자로 떠나는 중인데 버튼을 되살리면, 떠나기 직전 한 순간 버튼이 다시 눌리는
상태가 된다.

- [ ] **Step 2: 버튼을 만든다**

`apps/page0127/src/features/auth/ui/OAuthLoginButton.tsx`:

```tsx
'use client';

import { Button, cn } from '@repo/ui';

import { useOAuthLogin } from '../api/useOAuthLogin';
import { OAUTH_PROVIDERS, type OAuthProvider } from '../model/providers';

type OAuthLoginButtonProps = {
  provider: OAuthProvider;
  /** 로그인 후 돌아갈 내부 경로. 로그인 페이지가 ?redirect= 에서 받아 넘긴다 */
  next?: string | null;
};

/**
 * 소셜 로그인 버튼
 *
 * 표시 정보(문구·브랜드 마크·색)는 전부 providers.tsx 가 갖는다.
 * 여기는 "누르면 로그인이 시작되고, 실패하면 보인다"만 책임진다.
 *
 * @example
 * <OAuthLoginButton provider='kakao' next={redirect} />
 */
export const OAuthLoginButton = ({ provider, next }: OAuthLoginButtonProps) => {
  const { login, isLoading, error } = useOAuthLogin(provider);
  const { label, className, mark } = OAUTH_PROVIDERS[provider];

  return (
    <div>
      <Button
        type='button'
        onClick={() => login(next)}
        disabled={isLoading}
        size='lg'
        // variant 를 주지 않는다 — 브랜드 색을 providers 가 통째로 지정하므로
        // 디자인 시스템 기본 배경이 깔리면 그 위에 덧칠하는 꼴이 된다
        variant='ghost'
        className={cn('w-full gap-2', className)}
      >
        {mark}
        {isLoading ? '이동 중…' : label}
      </Button>

      {/* role='alert' 이라야 스크린리더가 에러를 읽는다 — 버튼 아래 조용히
          텍스트만 두면 화면을 못 보는 사용자에게는 아무 일도 안 일어난 것과 같다 */}
      {error && (
        <p role='alert' className='mt-2 text-sm text-destructive'>
          {error}
        </p>
      )}
    </div>
  );
};
```

- [ ] **Step 3: 로그인 페이지에 버튼을 세운다**

`apps/page0127/app/(auth)/login/page.tsx` 의 import 를 바꾸고:

```tsx
import { LOGIN_PROVIDER_ORDER } from '@/features/auth/model/providers';
import { OAuthLoginButton } from '@/features/auth/ui/OAuthLoginButton';
```

`CardContent` 안의 `<LoginWithGoogleButton next={redirect} />` 를 아래로 바꾼다:

```tsx
          <div className='flex flex-col gap-2'>
            {LOGIN_PROVIDER_ORDER.map((provider) => (
              <OAuthLoginButton
                key={provider}
                provider={provider}
                next={redirect}
              />
            ))}
          </div>
```

`key` 는 `provider` 문자열을 쓴다 (index 금지 — 프로젝트 규칙).
순서는 `providers.tsx` 의 `LOGIN_PROVIDER_ORDER` 가 정한다 (카카오가 먼저).

- [ ] **Step 4: 옛 파일을 지운다**

```bash
git rm apps/page0127/src/features/auth/api/useGoogleLogin.ts apps/page0127/src/features/auth/ui/LoginWithGoogleButton.tsx
```

- [ ] **Step 5: 남은 참조가 없는지 확인한다**

```
grep -rn "useGoogleLogin\|LoginWithGoogleButton" apps packages
```

기대: 결과 없음 (0건).

- [ ] **Step 6: 타입 검사·린트·테스트**

```
npm run lint --workspace=page0127
npm run test --workspace=page0127
```

기대: 전부 통과.

- [ ] **Step 7: 화면에서 확인한다**

`/login` 을 연다.

- 카카오 버튼이 **노란 배경 + 검정 말풍선 심볼**로 보이는지
- 구글 버튼에 **4색 G 마크가 실제로 보이는지** ← Iconify 를 걷어낸 효과.
  예전에는 여기가 비어 있었다
- 카카오가 위, 구글이 아래인지
- **구글 로그인이 끝까지 되는지** (회귀 확인)
- 카카오는 아직 Supabase 설정 전이라 실패한다. 이 단계에서는 "버튼이 보이고
  눌린다"까지만 본다

- [ ] **Step 8: 커밋** — 사용자 승인 후에만

```bash
git add apps/page0127/src/features/auth "apps/page0127/app/(auth)/login/page.tsx"
git commit -m "✨ Feat: 카카오 로그인 버튼을 추가한다

공급자 이름이 박혀 있던 useGoogleLogin·LoginWithGoogleButton 을
provider 를 인자로 받는 useOAuthLogin·OAuthLoginButton 으로 합쳤다.
버튼에 로딩·에러 상태를 붙여 실패가 화면에 보이게 했다.
브랜드 마크는 인라인 SVG 로 둔다 — Iconify 는 CSP 에 막혀
구글 아이콘이 렌더되지 않고 있었다."
```

---

### Task 5: 로그인 실패 사유를 구분해서 안내한다

**Files:**
- Create: `apps/page0127/src/shared/lib/auth/authErrorReason.ts`
- Create: `apps/page0127/src/shared/lib/auth/authErrorReason.test.ts`
- Modify: `apps/page0127/app/auth/callback/route.ts` (마지막 리디렉션)
- Modify: `apps/page0127/app/auth/auth-code-error/page.tsx`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `type AuthErrorReason = 'cancelled' | 'expired' | 'unknown'`
  - `toAuthErrorReason(params: URLSearchParams): AuthErrorReason`

지금 콜백은 정지(ban)만 구분하고 나머지는 전부 같은 페이지로 보낸다. 프로바이더가
쿼리로 알려 주는 사유를 버리고 있어서, 사용자가 스스로 창을 닫아도 "인증 오류"라는
말을 듣는다.

**'동의 거부'는 따로 두지 않는다.** 프로바이더는 창을 닫은 것과 필수 항목 동의를
거부한 것을 **똑같이 `error=access_denied`** 로 돌려준다. 구분할 정보가 오지 않는데
구분하는 척하면, 그냥 창을 닫은 사람에게 "동의를 거부하셨습니다"라고 틀린 말을 한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`apps/page0127/src/shared/lib/auth/authErrorReason.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { toAuthErrorReason } from './authErrorReason';

describe('toAuthErrorReason', () => {
  it('access_denied면 cancelled (창을 닫았거나 동의를 거부했거나)', () => {
    expect(
      toAuthErrorReason(
        new URLSearchParams(
          'error=access_denied&error_description=User+denied+access'
        )
      )
    ).toBe('cancelled');
  });

  it('flow_state_expired면 expired', () => {
    expect(
      toAuthErrorReason(
        new URLSearchParams(
          'error=invalid_request&error_code=flow_state_expired'
        )
      )
    ).toBe('expired');
  });

  it('flow_state_not_found면 expired', () => {
    // 뒤로가기로 오래된 콜백 URL 을 다시 여는 경우 — 사용자에게는 '만료'와 같다
    expect(
      toAuthErrorReason(new URLSearchParams('error_code=flow_state_not_found'))
    ).toBe('expired');
  });

  it('otp_expired면 expired', () => {
    expect(
      toAuthErrorReason(new URLSearchParams('error_code=otp_expired'))
    ).toBe('expired');
  });

  it('만료 코드가 access_denied보다 우선한다', () => {
    // 둘 다 실려 오면 더 구체적인 쪽을 택한다
    expect(
      toAuthErrorReason(
        new URLSearchParams('error=access_denied&error_code=flow_state_expired')
      )
    ).toBe('expired');
  });

  it('모르는 error_code면 unknown', () => {
    expect(
      toAuthErrorReason(
        new URLSearchParams('error=server_error&error_code=unexpected_failure')
      )
    ).toBe('unknown');
  });

  it('빈 파라미터면 unknown', () => {
    expect(toAuthErrorReason(new URLSearchParams(''))).toBe('unknown');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

```
npm run test --workspace=page0127 -- authErrorReason
```

기대: FAIL — `./authErrorReason` 모듈을 찾을 수 없다.

- [ ] **Step 3: 판정 함수를 구현한다**

`apps/page0127/src/shared/lib/auth/authErrorReason.ts`:

```ts
/**
 * OAuth 콜백이 왜 실패했는지 판정한다.
 *
 * Supabase(GoTrue)와 공급자는 실패를 쿼리로 돌려보낸다:
 *   /auth/callback?error=access_denied&error_description=...
 *   /auth/callback?error=invalid_request&error_code=flow_state_expired
 *
 * ⚠️ **취소와 '동의 거부'는 구분할 수 없다.** 사용자가 로그인 창을 그냥 닫은
 *    경우와 필수 동의 항목을 거부한 경우 모두 `error=access_denied` 로 온다.
 *    구분할 정보가 없는데 구분하는 척하면, 창을 닫았을 뿐인 사람에게
 *    "동의를 거부하셨습니다"라고 틀린 말을 하게 된다. 그래서 하나로 합쳤다.
 *
 * 정지(ban)는 여기서 다루지 않는다 — isBannedRedirect 가 먼저 걸러 낸다.
 */

export type AuthErrorReason = 'cancelled' | 'expired' | 'unknown';

/** 시간이 지나 흐름이 끊긴 경우들. 사용자가 할 일은 "다시 시도"로 같다 */
const EXPIRED_CODES = new Set([
  'flow_state_expired',
  'flow_state_not_found',
  'otp_expired',
]);

export function toAuthErrorReason(params: URLSearchParams): AuthErrorReason {
  const code = params.get('error_code');

  // 만료를 먼저 본다 — access_denied 와 함께 실려 오는 경우가 있고,
  // 그때는 더 구체적인 쪽이 사용자에게 유용하다
  if (code && EXPIRED_CODES.has(code)) return 'expired';

  if (params.get('error') === 'access_denied') return 'cancelled';

  return 'unknown';
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

```
npm run test --workspace=page0127 -- authErrorReason
```

기대: PASS (7건).

- [ ] **Step 5: 콜백이 사유를 넘기게 한다**

`apps/page0127/app/auth/callback/route.ts` 의 import 에 추가한다
(`isBannedRedirect` 바로 위 — alias import 그룹 안에서 알파벳 순):

```ts
import { toAuthErrorReason } from '@/shared/lib/auth/authErrorReason';
```

마지막 리디렉션(파일 끝 두 줄)을 바꾼다:

```ts
  // 그 밖의 실패는 사유를 실어 안내 페이지로 보낸다.
  // 사유를 버리면 사용자가 스스로 취소한 경우에도 '오류'라고 말하게 된다.
  const reason = toAuthErrorReason(searchParams);
  return NextResponse.redirect(
    `${origin}/auth/auth-code-error?reason=${reason}`
  );
```

- [ ] **Step 6: 에러 페이지가 사유별 문구를 고르게 한다**

`apps/page0127/app/auth/auth-code-error/page.tsx` 를 통째로 바꾼다:

```tsx
import Link from 'next/link';

import type { AuthErrorReason } from '@/shared/lib/auth/authErrorReason';

/**
 * 인증 실패 안내 페이지
 *
 * - 콜백이 ?reason= 으로 실어 준 사유에 맞는 문구를 고른다
 *
 * 학습 포인트: searchParams 를 Server Component 에서 직접 읽는다.
 * 로그인 페이지가 ?redirect= 를 다루는 방식과 같다 — 클라이언트에서
 * useSearchParams 로 읽으면 Suspense 경계가 필요해진다.
 */

const MESSAGES: Record<AuthErrorReason, string> = {
  cancelled: '로그인을 완료하지 않았어요. 다시 시도해 주세요.',
  expired: '로그인 요청이 만료됐어요. 다시 시도해 주세요.',
  unknown: '로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
};

/** 쿼리는 사용자가 손으로 고칠 수 있다 — 아는 값만 통과시킨다 */
const toReason = (raw: string | undefined): AuthErrorReason =>
  raw === 'cancelled' || raw === 'expired' ? raw : 'unknown';

type AuthCodeErrorPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

const AuthCodeErrorPage = async ({ searchParams }: AuthCodeErrorPageProps) => {
  const { reason } = await searchParams;

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='heading-1 mb-4'>로그인하지 못했어요</h1>
        <p className='mb-6 text-muted-foreground'>
          {MESSAGES[toReason(reason)]}
        </p>
        <Link
          href='/login'
          className='rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default AuthCodeErrorPage;
```

제목도 "인증 오류"에서 바꾼다 — 사용자가 취소한 경우 '오류'가 아니기 때문이다.

- [ ] **Step 7: 전체 검사**

```
npm run test --workspace=page0127
npm run lint --workspace=page0127
```

기대: 전부 통과 (테스트 324건 = 317 + 7).

- [ ] **Step 8: 화면에서 확인한다**

주소창에 직접 넣어 세 가지 문구를 본다:

```
http://localhost:3000/auth/auth-code-error?reason=cancelled
http://localhost:3000/auth/auth-code-error?reason=expired
http://localhost:3000/auth/auth-code-error?reason=nonsense
```

마지막은 `unknown` 문구가 나와야 한다 (모르는 값을 그대로 쓰지 않는지 확인).

- [ ] **Step 9: 커밋** — 사용자 승인 후에만

```bash
git add apps/page0127/src/shared/lib/auth apps/page0127/app/auth
git commit -m "🎨 UI/UX: 로그인 실패 사유를 구분해 안내한다

공급자가 쿼리로 주는 사유를 버리고 모두 '인증 오류'로 보내고 있었다.
취소와 만료를 구분해 문구를 고른다.
'동의 거부'는 공급자가 취소와 같은 코드로 주므로 합쳤다."
```

---

### Task 6: Supabase 카카오 설정과 통합 검증

**Files:**
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: Task 3~5 의 모든 산출물
- Produces: 실제로 동작하는 카카오 로그인

이 Task 는 **코드보다 설정이 대부분**이고, 상당 부분은 사람이 직접 해야 한다.

- [ ] **Step 1: 카카오 디벨로퍼스를 설정한다** (사용자가 직접)

앱은 이미 만들어져 있다 — `page0127` (앱 ID `1534955`).

⚠️ **콘솔 UI 가 개편돼서 예전 블로그 글의 경로(`앱 키`, `카카오 로그인 > 보안`)는
더 이상 없다.** 아래는 2026-08-06 기준 공식 문서로 확인한 경로다.

**(a) `앱 > 플랫폼 키 > REST API 키`** — 여기 한 화면에 세 가지가 다 있다:

| 항목 | 쓰임 |
| --- | --- |
| **REST API 키** | `client_id` 로 쓴다 |
| **클라이언트 시크릿** | 발급 + **활성화 ON** → `secret` 으로 쓴다 |
| **리다이렉트 URI** | 아래 3개를 전부 등록 |

```
https://sjngwxtykqhlsvxcyqah.supabase.co/auth/v1/callback   (운영)
https://uglagvujxbgdozsucxgp.supabase.co/auth/v1/callback   (개발)
http://127.0.0.1:54321/auth/v1/callback                     (로컬)
```

⚠️ **`앱 > 어드민 키` 는 쓰지 않는다.** 사이드바에 나란히 있어 헷갈리기 쉽다.
어드민 키는 서버에서 카카오 API 를 관리자 권한으로 부를 때 쓰는 별개 키다.

**(b) `카카오 로그인 > 사용 설정`** — ON 으로 바꾼다.

이게 꺼져 있으면 카카오가 `KOE004` 로 거절한다. 2026-08-06 확인 시점에 꺼져 있었다.
켠 뒤 아래 한 줄로 확인할 수 있다 (브라우저 없이 된다):

```
curl -s -L "https://kauth.kakao.com/oauth/authorize?client_id=<REST API 키>&redirect_uri=http%3A%2F%2F127.0.0.1%3A54321%2Fauth%2Fv1%2Fcallback&response_type=code&scope=account_email+profile_image+profile_nickname" | grep -o "KOE[0-9]*"
```

`KOE` 가 하나도 안 나오면 통과다. 나오면 아래 표를 본다.

| 코드 | 뜻 | 할 일 |
| --- | --- | --- |
| `KOE004` | 카카오 로그인 사용 설정 OFF | 이 단계를 다시 한다 |
| `KOE006` | 리다이렉트 URI 미등록 | (a) 의 URI 3개를 다시 확인 |
| `KOE205` | 권한 없는 동의항목을 요청 | **아래 미해결 항목 참조** |

**(c) `카카오 로그인 > 동의항목 > 개인정보`**:
- 닉네임(`profile_nickname`) → **필수 동의**
- 프로필 사진(`profile_image`) → **필수 동의**
- 카카오계정 이메일(`account_email`) → **손댈 수 없다.** 아래 참조

동의 목적란은 실제 서비스와 달라도 안 된다(콘솔이 API 거부 사유라고 경고한다).
코드에서 실제로 하는 일만 적는다:

| 항목 | 동의 목적 |
| --- | --- |
| 닉네임 | 회원가입 시 서비스 프로필 이름의 초기값으로 저장하며, 내 서재·피드·댓글에서 작성자 표시에 사용합니다. 이메일 미동의 시 서비스 아이디 생성에도 활용합니다. |
| 프로필 사진 | 회원가입 시 서비스 프로필 이미지의 초기값으로 저장하며, 내 서재·피드·댓글에서 작성자 표시에 사용합니다. |

### ⚠️ 이메일은 선택 동의로도 받을 수 없다 (2026-08-06 콘솔 확인)

`account_email` 의 상태가 **"권한 없음"** 이고 설정 버튼이 비활성이다. 풀려면
비즈 앱 전환 + 비즈니스 정보 심사(영업일 3~5일) 후 `앱 > 추가 기능 신청 >
개인정보 동의항목` 을 통과해야 한다.

**심사를 받지 않는다.** 이메일 없이 돌아가게 만드는 것이 이 작업의 목적이었다.

대신 아래가 "예외 처리"에서 "기본 동작"으로 승격된다:

- `email_optional = true` 가 **없으면 카카오 로그인이 아예 안 된다**
- 카카오 가입자는 **전원** 닉네임에서 아이디를 만든다. 한국어 닉네임이 대부분이라
  상당수가 `reader_xxxxxx` 가 된다 → **3단계 온보딩이 시급해졌다**
- Task 3 의 탈퇴 확인 결함이 카카오 가입자 **전원**에게 해당된다
- Supabase 의 이메일 기반 자동 계정 연동이 **절대 일어나지 않는다**
  → **2단계(계정 연동)가 선택이 아니라 필수**

- [ ] **Step 2: Supabase 대시보드에서 카카오를 켠다** (사용자가 직접)

**개발·운영 프로젝트 둘 다** 한다. 이 레포는 개발 프로젝트가 조용히 뒤처진 적이 있다.

Authentication → Providers → Kakao:
- Enable Sign in with Kakao: ON
- REST API Key / Client Secret 입력
- **"이메일 없는 사용자 허용" 옵션 ON**
  ← 이걸 빠뜨리면 이메일 동의를 거부한 사용자를 **Supabase 가 먼저 거부한다.**
  우리 코드를 아무리 고쳐도 그 코드에 도달하지 못한다.

- [ ] **Step 3: `supabase/config.toml` 에 카카오 블록을 추가한다**

기존 `[auth.external.google]` 블록 **바로 아래**에 넣는다:

```toml
# 로컬 개발용 Kakao OAuth. client_id/secret은 supabase/.env.local(git 미추적)에서 주입한다.
[auth.external.kakao]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_KAKAO_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_KAKAO_SECRET)"
# 카카오는 이메일이 선택 동의 항목이라 주지 않을 수 있다.
# 이 값이 false(기본값)면 이메일 없는 사용자의 로그인을 Supabase 가 거부한다.
email_optional = true
```

`skip_nonce_check` 는 넣지 않는다 — 그건 로컬 Google 로그인 전용 우회다.

- [ ] **Step 4: 로컬 환경변수를 넣고 재시작한다** (사용자가 직접)

⚠️ **`apps/page0127/.env.local` 이 아니다.** 앱 env 와 로컬 Supabase env 는 다른
파일이고, 로컬 Supabase 는 앱 쪽 파일을 읽지 않는다. 구글 키가 들어 있는
`supabase/.env.local` **같은 파일**에 넣는다. 넣은 뒤
`npx supabase status` 가 `environment variable is unset` 경고를 내지 않아야 한다.

`supabase/.env.local` (git 미추적) 에 두 줄 추가:

```
SUPABASE_AUTH_EXTERNAL_KAKAO_CLIENT_ID=<REST API 키>
SUPABASE_AUTH_EXTERNAL_KAKAO_SECRET=<Client Secret>
```

```bash
npx supabase stop && npx supabase start
```

⚠️ `config.toml` 변경은 재시작해야 반영된다.

### 🚧 차단: `KOE205` — 비즈 앱 전환이 필요하다 (2026-08-06 확인)

**카카오 로그인은 지금 상태로는 완료되지 않는다.** 실제 계정으로 시도하면
동의 화면 대신 `잘못된 요청 (KOE205)` 이 뜬다.

Supabase 의 카카오 프로바이더가 scope 에 `account_email` 을 **기본값으로 박아
보내는데**(`account_email profile_image profile_nickname`), 우리 앱은 그 항목이
"권한 없음"이다. `KOE205` = "앱에 설정하지 않은 동의항목을 포함해 요청".

#### ⚠️ 검증할 때 주의: 로그인하지 않은 요청으로는 이 오류를 볼 수 없다

`curl` 로 authorize URL 을 때리면 `accounts.kakao.com/login` 까지 **정상 도달한다.**
카카오는 **로그인을 마친 뒤 동의 화면 단계에서** scope 를 검사하기 때문이다.
한 번 이걸 "통과"로 잘못 읽었다. **KOE205 판정은 실제 카카오 계정 로그인으로만
가능하다.**

#### scope 를 빼는 방법은 없다 (둘 다 실측)

1. `signInWithOAuth` 의 `options.scopes` 는 기본값을 **교체하지 않고 덧붙인다**:
   `…profile_nickname+profile_nickname+profile_image` 처럼 중복만 생기고
   `account_email` 은 남는다.
2. `config.toml` 의 `[auth.external.kakao]` 에 `scopes` 를 넣으면 CLI 가 거부한다:
   `'auth.external[kakao]' has invalid keys: scopes`

→ **콘솔의 동의항목 설정이 유일한 조절 장치다.**

#### ✅ 해결됨 (2026-08-06) — 비즈 앱 전환 + 이메일 필수 동의

아래 경로대로 진행해서 동의 화면까지 도달했다. 화면에 `닉네임, 프로필 사진,
카카오계정(이메일)` 이 **필수**로 표시된다.

같이 밟은 함정 두 개:

- **`KOE006`** — 리다이렉트 URI 를 `앱 > 플랫폼 키` 의 **"비즈니스 인증 리다이렉트
  URI"** 상자에 넣었다. 그건 비즈니스 인증 API 용이고 카카오 로그인은 보지 않는다.
  같은 페이지 위쪽, `REST API 키` 아래의 **"리다이렉트 URI"** 상자가 맞다.
  이름이 겹치고 한 페이지에 같이 있어서 놓치기 쉽다.
- 한 입력칸에 URI 두 개를 공백으로 이어 붙이면 안 된다. 한 칸에 하나씩.

**이메일을 필수 동의로 두기로 했다.** 선택 동의도 가능했지만 필수를 골랐다 —
카카오가 항상 이메일을 주면 Supabase 가 같은 이메일의 기존 계정에 identity 를
자동으로 붙여서, **구글로 쓰던 사람이 카카오를 눌러도 같은 서재로 들어간다.**
계정이 갈라지는 것이 이 설계의 가장 큰 위험이었는데 그게 사라진다.
구글도 어차피 이메일을 요구하므로 형평성 문제도 없다.

`카카오계정으로 정보 수집 후 제공`(값이 없으면 입력 요청) 체크박스는 켜 둔다 —
전화번호로만 가입한 카카오 계정은 이메일이 없어서, 이게 꺼져 있으면 그런
사용자가 필수 동의를 만족시킬 방법이 없다.

<details>
<summary>원래 적어 뒀던 해결 경로 (그대로 따라가면 된다)</summary>


사업자등록번호가 없어도 된다. **본인인증 + 카카오비즈니스 통합 서비스 약관 동의**로
전환할 수 있다.

1. `앱 > 일반 > 비즈니스 정보 > 개인 개발자 비즈 앱` — 본인인증 후 전환 (셀프)
2. `앱 > 추가 기능 신청 > 개인정보 동의항목` — 이메일 신청 (**영업일 3~5일**)
3. 승인되면 `카카오 로그인 > 동의항목` 에서 `account_email` 을 **선택 동의**로 둔다

**필수 동의로 두지 않는다.** 선택 동의면 Supabase 기본 scope 가 통과하고,
이메일에 동의하지 않은 사용자는 여전히 `email = null` 로 들어와 지금까지 만든
경로를 그대로 탄다. **이 설계는 하나도 버려지지 않는다.** 오히려 "이메일이 있는
사용자와 없는 사용자가 섞이는" 원래 설계 그대로가 된다.

대기 중에도 **구글 로그인은 멀쩡히 돌아가므로 배포가 막히지 않는다.**

#### 대안: Kakao OIDC + `signInWithIdToken`

카카오 OIDC 를 직접 돌려 `id_token` 을 받아 `supabase.auth.signInWithIdToken` 으로
넘기면 scope 를 우리가 완전히 통제할 수 있다. 심사를 기다릴 필요가 없다.

대신 인가 코드 교환 라우트를 직접 만들어야 한다 — client secret 을 다루는 서버
코드가 늘고, 토큰 검증·state 검증을 우리가 책임진다. **심사 3~5일을 아끼려고
인증 코드를 손으로 짜는 것은 남는 장사가 아니다.** 1번을 권한다.

</details>

#### 이메일이 필수가 되면서 달라지는 것

| 항목 | 이메일 없음 전제 | **필수 동의로 확정된 지금** |
| --- | --- | --- |
| 카카오 가입자의 `email` | 항상 null | **항상 있음** |
| 아이디 생성 | 전원 닉네임 경로 → 대부분 `reader…` | 이메일 로컬파트 (구글과 동일) |
| 계정 갈라짐 | 100% 발생 | Supabase 가 같은 이메일이면 자동 연결 |
| 2단계 계정 연동 | **필수** | **있으면 좋음** — 다른 이메일을 쓴 경우에만 필요 |
| 3단계 온보딩 | 시급 | 원래 우선순위 |

**이메일 없는 경로의 코드는 그대로 둔다.** 죽은 코드가 아니다 —
`profiles.email` 은 여전히 nullable 이고, 앞으로 이메일을 안 주는 공급자가
붙을 수 있다. 무엇보다 Task 3 이 고친 탈퇴 다이얼로그 결함(빈 입력으로 삭제
버튼이 켜지던 것)은 이메일 유무와 무관하게 진짜 버그였다.

- [ ] **Step 5: 카카오로 신규 가입해 본다**

이메일은 애초에 요청되지 않으므로(위 참조) 경우가 하나뿐이다.
`/login` → 카카오 로그인 → 동의 → 진행.

확인할 것:
- **로그인이 끝까지 되는지** (`email_optional` 이 꺼져 있으면 여기서 막힌다)
- 본인 서재(`/{username}`)로 들어가는지
- 아이디가 닉네임 기반이거나 `reader…` 형태로 만들어졌는지
  (한국어 닉네임이면 `reader…` 가 정상이다)
- **닉네임과 프로필 사진이 들어왔는지** ← Step 7 의 판단 근거

- [ ] **Step 6: 이메일 없는 계정이 화면을 깨뜨리지 않는지 본다**

Step 5 에서 만든 계정 그대로 확인한다. 이 계정은 `profiles.email` 이 null 이다.

- `/settings` 에서 이메일 칸이 비어 있고 레이아웃이 멀쩡한지
- **계정 삭제 다이얼로그에서, 아무것도 입력하지 않았을 때 버튼이 비활성인지**
  ← Task 3 이 실제로 이 사용자를 지켜 주는지 확인하는 지점이다.
  카카오 가입자 **전원**이 여기 해당하므로 반드시 본다
- `/feed` 와 헤더에서 표시 이름이 '사용자' 로 뭉개지지 않는지
  (`getShellUser` 가 `nickname || email || '사용자'` 순으로 고른다 —
  닉네임이 들어왔다면 괜찮다)
- 어드민(`/admin/members`)에서 이 회원 행의 이메일 칸이 비어도 깨지지 않는지

### ✅ Step 7 결과 (2026-08-06 실측) — 키는 맞았고, 사진 호스트가 문제였다

로컬 DB 에서 직접 확인했다:

```
docker exec supabase_db_0127 psql -U postgres -d postgres -c \
  "SELECT provider, jsonb_object_keys(identity_data) FROM auth.identities;"
```

카카오가 주는 키: `avatar_url · email · email_verified · full_name · iss ·
name · phone_verified · preferred_username · provider_id · sub · user_name`

**`toIdentityDefaults` 는 고칠 필요가 없었다** — `full_name`·`avatar_url` 을
이미 읽고 있다. 공급자 키를 한 곳에만 두기로 한 설계가 값을 했다.

대신 **다른 것 두 개가 걸렸다.**

#### 1. 카카오 프로필 사진이 깨진다 (수정함)

실제 값이 `http://img1.kakaocdn.net/thumb/R640x640.q70/...` 다. **https 가 아니다.**
세 겹으로 막혔다:

| 막는 곳 | 증상 |
| --- | --- |
| `next/image` `remotePatterns` | 등록 안 된 호스트 → 400 |
| CSP `img-src` | `kakaocdn.net` 없음 → 브라우저가 차단 |
| 운영의 https 페이지 | `http://` 이미지는 mixed content 로 차단 |

지금 계정은 프로필이 이미 있어서 사진을 덮어쓰지 않아 드러나지 않았다.
**신규 카카오 가입자에게서만 터졌을 버그다.**

`next.config.ts:29` 주석에 똑같은 종류의 사고(`remotePatterns` 에 운영 호스트만
있어서 로컬·Preview 에서 이미지가 깨진 건)가 이미 적혀 있었다. 같은 실수를 두 번
한 셈이라, 이번엔 **CSP 와 `remotePatterns` 를 한 쌍으로 보라는 주석**을 남겼다.

수정:
- `toIdentityDefaults` 의 `asImageUrl` 이 `http` 를 **https 로 올린다** (버리지 않는다).
  카카오 CDN 은 같은 경로를 https 로도 서빙한다. 이 함수에 오는 값은 OAuth
  metadata 뿐이라 로컬 Storage(`http://127.0.0.1:54321`)에는 영향이 없다.
- `remotePatterns` 와 CSP `img-src` 에 `**.kakaocdn.net` 추가.

#### 2. 카카오 닉네임은 이모지일 수 있다

실측 값이 `🫥` 였다. 표시 이름으로는 그대로 쓰면 되고,
`generateUsernameSeed` 가 아이디용으로는 걸러 `reader…` 로 떨어뜨린다.
설계대로 동작한다. 테스트에 케이스로 남겼다.

#### 3. `email_verified: true`

카카오가 이메일을 **verified 로** 넘긴다. 이것이 계정 자동 연결이 동작한 이유다.

---

- [ ] ~~**Step 7: 카카오 metadata 키를 실물로 확인한다**~~ (위에서 완료)

`toIdentityDefaults` 는 `full_name`/`name` 과 `avatar_url`/`picture` 를 본다.
카카오가 다른 키로 준다면 닉네임·사진이 비어 있고, **아이디도 닉네임 폴백을 타지
못해 전부 `reader…` 가 된다** (`generateUsernameSeed` 가 그 함수의 결과를 받으므로).

Step 5·6 에서 닉네임이나 사진이 안 들어왔다면, Supabase Studio →
Authentication → 해당 사용자 → `raw_user_meta_data` 를 열어 실제 키 이름을 본다.
다르면 `apps/page0127/src/entities/profile/model/identityDefaults.ts` 에 키를 추가한다:

```ts
    nickname:
      asText(metadata.full_name) ??
      asText(metadata.name) ??
      asText(metadata.preferred_username),
```

⚠️ **추측으로 미리 넣지 말 것.** 실제 응답을 보고 필요한 키만 넣는다.
바꿨다면 `identityDefaults.test.ts` 에 그 키에 대한 케이스를 추가한다.

- [ ] **Step 8: 구글 로그인 회귀를 확인한다**

기존 구글 계정으로 로그인한다.

- 로그인이 되는지
- **아이디가 예전 그대로인지** (바뀌면 공개 서재 주소가 깨진 것이다 — 중대 회귀)

- [ ] **Step 9: 취소 흐름을 확인한다**

`/login` → 카카오 로그인 → 카카오 동의 화면에서 **취소**.

기대: `/auth/auth-code-error?reason=cancelled` 로 오고
"로그인을 완료하지 않았어요" 문구가 보인다.

여기서 `reason=unknown` 이 나오면 카카오/Supabase 가 다른 코드를 보낸 것이다.
브라우저 주소창의 실제 쿼리를 보고 `authErrorReason.ts` 와 그 테스트를 함께 고친다.

- [ ] **Step 10: 전체 검사**

```
npm run test  --workspace=page0127
npm run lint  --workspace=page0127
npm run build --workspace=page0127
```

기대: 전부 통과.

- [ ] **Step 11: 커밋** — 사용자 승인 후에만

```bash
git add supabase/config.toml
git commit -m "🔧 Chore: 로컬 Supabase에 카카오 로그인을 설정한다

email_optional 을 켜야 이메일 동의를 거부한 사용자도 로그인된다."
```

---

## 배포 전 확인

- [ ] 운영 Supabase 에 카카오 provider 가 켜져 있고 **이메일 없는 사용자 허용이 ON** 인가
- [ ] 카카오 디벨로퍼스에 **운영 Supabase 의 Redirect URI** 가 등록돼 있는가
- [ ] 개발 Supabase 에도 똑같이 돼 있는가 (Preview 배포에서 쓴다)
- [ ] `supabase/.env.local` 이 git 에 올라가지 않았는가 — `git status` 로 확인
- [ ] 운영 로그인 화면에서 **구글·카카오 마크가 둘 다 보이는가** (CSP 문제가 없어졌는지)

## 이 계획이 다루지 않는 것

- **계정 연동** (설정 화면의 연결된 계정) — 2단계. 스펙 참조.
  구글로 쓰던 사람이 카카오로 로그인하면 **별도 계정이 생긴다.** 1단계 배포 직후
  2단계를 이어서 해야 하는 이유다.
- **첫 로그인 온보딩** — 3단계. 자동 생성된 아이디를 사용자가 직접 고치게 하는 화면.
- **이미 갈라진 계정의 병합** — 설계 범위 밖.
- **`@repo/icons` 의 CSP 문제 근본 해결** — 지금은 브랜드 마크만 인라인 SVG 로 피해 갔다.

  다만 **이 앱에서는 그걸로 충분하다.** 전수 조사 결과 `Icons` 를 쓰는 곳은
  `LoginWithGoogleButton.tsx` **한 곳뿐**이고, Task 4 가 그 파일을 지운다.
  즉 Task 4 를 끝내면 앱 안에 깨진 아이콘이 하나도 남지 않는다.

  `@repo/icons` 패키지 자체(다른 앱이나 Storybook 에서 쓸 경우)를 고치는 것은
  별개 과제다. 고친다면 `@iconify-json/*` 을 의존성에 넣고 `addCollection` 으로
  번들에 담는 쪽이다 — CSP 를 여는 것보다 낫다.
