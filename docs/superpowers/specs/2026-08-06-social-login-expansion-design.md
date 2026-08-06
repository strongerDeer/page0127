# 소셜 로그인 확장 설계 — 카카오 추가·계정 연동·첫 로그인 온보딩

- 작성일: 2026-08-06
- 상태: 설계 승인 대기
- 범위: `apps/page0127` 인증(로그인·프로필 생성·계정 관리)

## 왜 하는가

지금 로그인 수단은 구글 하나뿐이다. 한국 서비스에서 구글 단독은 가입 장벽이 되고,
읽기 기록이라는 서비스 성격상 "일단 가입해서 책 한 권 꽂아 보는" 흐름이 막힌다.

그런데 카카오는 구글과 계약이 다르다. **이메일을 주지 않는다.** 지금 코드는
이메일이 항상 있다고 가정하고 있어서, 카카오를 그대로 붙이면 세 곳이 깨진다.
그래서 이 작업은 "프로바이더 한 줄 추가"가 아니라 **이메일 의존을 걷어내는 작업**이다.

### 2026-08-06 확인: 카카오 이메일은 "줄 수도 있는" 게 아니라 "못 받는다"

설계할 때는 이메일을 선택 동의로 받아 두고 거부한 사용자만 예외 처리하려 했다.
실제 콘솔을 열어 보니 그게 아니었다.

`카카오 로그인 > 동의항목 > 개인정보` 에서 `카카오계정(이메일) / account_email` 의
상태가 **"권한 없음"** 이고 설정 버튼 자체가 비활성이다. 선택 동의로도 켤 수 없다.
풀려면 비즈 앱 전환 + 비즈니스 정보 심사(영업일 3~5일) 후
`앱 > 추가 기능 신청 > 개인정보 동의항목` 을 통과해야 한다.

**그래서 이메일 없는 계정은 예외 경로가 아니라 카카오의 유일한 경로다.** 이 사실이
설계 전반의 무게를 바꾼다.

| 항목 | 바뀐 점 |
| --- | --- |
| `email_optional` | 있으면 좋은 게 아니라 **없으면 카카오 로그인이 아예 안 된다** |
| 아이디 생성 | 카카오 가입자는 **항상** 닉네임 경로를 탄다. 한국어 닉네임이 대부분이라 상당수가 `reader_xxxxxx` 로 떨어진다 → **3단계 온보딩의 가치가 커졌다** |
| 탈퇴 확인 | 빈 이메일 결함이 카카오 가입자 **전원**에게 해당된다 |
| 계정 연동 | Supabase 의 이메일 기반 자동 연동이 **절대 일어나지 않는다** → **2단계가 선택이 아니라 필수** |

비즈 앱 심사를 받지 않는다. 이메일 없이 돌아가게 만드는 것이 이 설계의 목적이었고,
심사를 받으면 그 목적이 사라진다.

## 지금 코드가 이메일에 의존하는 곳

| 위치 | 의존 형태 | 카카오에서 벌어지는 일 |
| --- | --- | --- |
| `app/auth/callback/route.ts:36` | `data.user.email!` | `undefined` 가 그대로 흘러감 |
| `app/(auth)/layout.tsx:25` | `user.email!` | 위와 동일 |
| `entities/profile/model/username.ts:150` | `email.split('@')` | `undefined` 에서 **런타임 에러** |
| `features/auth/ui/DeleteAccountDialog.tsx:38` | `emailInput === userEmail` | 둘 다 `''` → **빈 입력으로 탈퇴 버튼 활성화** |

앞의 셋은 로그인이 안 되는 문제고, 마지막 하나는 **계정이 실수로 날아가는 문제**다.
넷 다 1단계에서 함께 고친다.

DB 쪽은 문제없다 — `profiles.email` 은 이미 `TEXT` nullable
(`20240101000000_baseline_books_profiles_comments_activities.sql:113`).
`profiles.email` 을 읽는 나머지 코드(어드민 목록, 헤더 표시명)는 이미 `??` / `||` 폴백을
갖고 있어 빈 값에서 무너지지 않는다.

## 단계 나누기

한 번에 다 하지 않는다. 각 단계는 **독립적으로 배포 가능**하고 자기 PR을 갖는다.

| 단계 | 내용 | 왜 이 순서인가 |
| --- | --- | --- |
| 1 | 카카오 로그인 + 이메일 의존 제거 + 로그인 에러 UX | 나머지 전부의 전제 |
| 2 | 계정 연동 (설정 화면의 연결된 계정) | **미루면 손해가 누적된다** — 아래 참조 |
| 3 | 첫 로그인 온보딩 (아이디·닉네임 직접 선택) | 순수 UX. 늦춰도 데이터가 상하지 않는다 |

### 왜 연동이 온보딩보다 먼저인가

Supabase 는 같은 이메일을 가진 identity 를 기존 계정에 자동으로 붙여 준다. 하지만
**카카오가 이메일을 주지 않으면 붙일 열쇠가 없어서 무조건 새 계정이 된다.**
구글로 쓰던 사람이 어느 날 카카오 버튼을 누르면 빈 서재가 열리고, 본인은
"내 책이 사라졌다"고 느낀다.

이 갈라짐은 **시간이 지날수록 되돌리기 어려워진다.** 양쪽 계정에 각각 기록이 쌓이면
합칠 때 어느 쪽을 남길지 정해야 하고, 그건 코드가 아니라 사람이 판단할 문제가 된다.
그래서 연동을 카카오 출시 직후에 붙인다. 온보딩은 하루 미뤄도 아무 손해가 없다.

---

# 1단계 — 카카오 로그인

## 1-1. OAuth 훅·버튼 일반화

지금은 `useGoogleLogin` / `LoginWithGoogleButton` 처럼 프로바이더가 이름에 박혀 있다.
카카오를 붙이면서 파일을 복사하면 리디렉션 URL 조립 로직이 두 벌이 되고, 한쪽만
고치는 사고가 난다. **프로바이더를 인자로 받는 하나**로 바꾼다.

```
features/auth/
  model/providers.ts        (신규) 프로바이더 목록·표시 정보·브랜드 스타일
  api/useOAuthLogin.ts      (useGoogleLogin.ts 를 대체)
  ui/OAuthLoginButton.tsx   (LoginWithGoogleButton.tsx 를 대체)
```

호출처는 `app/(auth)/login/page.tsx` 한 곳뿐이라 옛 이름을 래퍼로 남기지 않고 교체한다.

`providers.ts` 가 갖는 것:

```ts
export type OAuthProvider = 'google' | 'kakao';

type ProviderMeta = {
  label: string;      // '구글로 계속하기'
  icon: string;       // Icons 의 name
  className: string;  // 브랜드 색이 강제되는 경우만
};
```

프로바이더가 늘어날 때 손대는 곳이 이 파일 하나가 되도록 한다.

## 1-2. 카카오 버튼의 브랜드 규정

카카오 로그인 버튼은 카카오가 **디자인을 규정**한다 — 배경 `#FEE500`, 심볼과 글자는
검정, 문구는 "카카오 로그인". 우리 디자인 토큰 밖의 색이므로 `providers.ts` 안에
이유를 주석으로 남기고 고정한다. 토큰 시스템을 깨는 게 아니라, **외부 계약이라
토큰의 관할이 아니라는 것**을 그 자리에 적어 둔다.

아이콘은 `@repo/icons` 의 `iconMapping` 에 추가한다. tabler 컬렉션에는 카카오가 없어서
Iconify 의 다른 컬렉션을 쓴다:

```ts
const iconMapping = {
  google: 'tabler:brand-google-filled',
  kakao: 'simple-icons:kakaotalk',
} as const;
```

`Icons` 는 매핑에 없는 이름에만 `tabler:` 접두사를 붙이므로, 전체 이름을 매핑에 넣으면
다른 컬렉션도 그대로 통과한다. 컴포넌트 수정은 필요 없다.

## 1-3. 이메일 없이 가입 가능하게

### 아이디 생성 경로 분리

`generateUsernameFromEmail(email)` 을 `generateUsernameSeed(source)` 로 바꾸고,
"무엇에서 뽑을지"는 호출하는 쪽이 정한다.

```
1순위: 이메일 로컬파트   (구글, 이메일 준 카카오)
2순위: metadata 의 닉네임 (이메일 없는 카카오)
3순위: 'reader'          (한글 닉네임처럼 ASCII 가 안 남는 경우)
```

기존 함수는 이미 "규칙을 통과 못 하면 `reader`" 폴백을 갖고 있다. 그 폴백을 그대로
쓰되 입력만 넓힌다. 3순위로 떨어져도 `generateUniqueUsername` 이 무작위 접미사를
붙이므로 `reader_a1b2c3` 같은 값이 나온다 — 예쁘지는 않지만 **3단계 온보딩에서
사용자가 직접 고치게 될 값**이다.

### 시그니처 변경

```ts
ensureProfile(userId: string, email: string | null, metadata?)
upsertProfile(userId: string, email: string | null, metadata?)
generateUniqueUsername(email: string | null, metadata?)
```

호출처 두 곳(`route.ts:36`, `layout.tsx:25`)의 `!` 를 지운다. `!` 는 "없을 리 없다"는
주장인데, 카카오를 붙이는 순간 그 주장이 거짓이 되기 때문이다.

### 탈퇴 확인 문구 교체

`DeleteAccountDialog` 의 확인 입력을 **이메일에서 아이디로** 바꾼다.

- 이메일은 없을 수 있지만 `username` 은 항상 있다 (DB 가 보장한다)
- 빈 문자열끼리 일치해서 통과하는 구멍이 원천적으로 사라진다
- 사용자 입장에서도 자기 서재 주소(`/hong`)라 이메일보다 기억하기 쉽다

`ProfileSettingsForm.DangerZone` 의 prop 도 `userEmail` → `username` 으로 바꾼다.

## 1-4. 로그인 에러 UX

### 훅에 상태 붙이기

`useGoogleLogin` 에 주석으로만 남아 있던 `isLoading` / `error` TODO 를 실제로 구현한다.
지금은 `signInWithOAuth` 가 실패해도 `console.error` 만 찍히고 화면은 아무 반응이 없다.
사용자는 버튼이 죽은 줄 안다.

- `isLoading`: 리디렉션이 시작되기 전까지 버튼 비활성 + 스피너
- `error`: 버튼 아래 인라인 메시지

### 콜백이 실패 사유를 넘기게

지금 콜백은 정지(ban)만 구분하고 나머지는 전부 `/auth/auth-code-error` 로 보낸다.
OAuth 프로바이더는 `error` / `error_description` 쿼리로 사유를 알려 주는데 그걸 버리고 있다.

`shared/lib/auth/` 에 사유 판정 함수를 하나 둔다 — `isBannedRedirect` 와 같은 자리,
같은 성격이다(순수 함수 + 단위 테스트).

```ts
type AuthErrorReason = 'cancelled' | 'expired' | 'unknown';
toAuthErrorReason(params: URLSearchParams): AuthErrorReason
```

콜백은 `/auth/auth-code-error?reason=cancelled` 처럼 붙여 보내고, 에러 페이지는
사유별 문구를 고른다. 사용자가 직접 취소한 경우 "오류가 발생했습니다"라고 말하지
않는 것이 이 변경의 핵심이다.

| 사유 | 무엇을 보고 판정하나 | 문구 |
| --- | --- | --- |
| `cancelled` | `error=access_denied` | 로그인을 완료하지 않았어요. 다시 시도해 주세요. |
| `expired` | `error_code` 가 `flow_state_expired`·`flow_state_not_found`·`otp_expired` | 로그인 요청이 만료됐어요. 다시 시도해 주세요. |
| `unknown` | 나머지 전부 | 로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요. |

**"동의 거부"는 별도 사유로 두지 않는다.** OAuth 프로바이더는 사용자가 창을 닫은
것과 필수 항목 동의를 거부한 것을 **똑같이 `error=access_denied` 로** 돌려준다.
구분할 정보가 오지 않는데 구분하는 척하면, 그냥 창을 닫은 사람에게 "동의를
거부하셨습니다"라고 틀린 말을 하게 된다. 두 경우를 다 덮는 문구 하나로 합친다.

에러 페이지는 Server Component 로 유지하고 `searchParams` 를 직접 읽는다
(로그인 페이지가 `?redirect=` 를 다루는 방식과 같다).

## 1-5. 코드 밖 설정 — 사용자가 직접 해야 하는 것

이건 코드로 못 한다. 순서대로 필요하다.

1. **카카오 디벨로퍼스** — 앱 생성 → REST API 키, Client Secret 발급
2. **Redirect URI 등록** — `https://<supabase-ref>.supabase.co/auth/v1/callback`
3. **동의 항목** — 닉네임·프로필 사진은 필수, **이메일은 선택 동의로 둔다**
   (필수로 만들려면 카카오 비즈니스 앱 전환 심사가 필요하다. 우리는 이메일 없이도
   가입되게 만들었으므로 그 심사를 받을 이유가 없다)
4. **Supabase 대시보드** — Kakao provider 활성화 + **이메일 없는 로그인 허용**.
   **개발·운영 프로젝트 둘 다.** (개발 프로젝트가 조용히 뒤처지는 것은 이 레포에서
   이미 겪은 문제다)
5. **`supabase/config.toml`** — `[auth.external.kakao]` 추가. 시크릿은 값을 적지 않고
   환경변수 치환(`env(...)`)으로 둔다. 기존 `[auth.external.google]` 블록의 형식을 따른다.

### ⚠️ `email_optional = true` 를 빠뜨리면 안 된다

Supabase 는 **프로바이더가 이메일을 주지 않으면 기본적으로 로그인을 거부한다**
(`config.toml` 의 `email_optional`, 기본값 `false`). 우리 코드를 아무리 이메일 없이
돌아가게 고쳐도, 그 코드에 도달하기 전에 Supabase 가 먼저 막는다.

- 로컬: `supabase/config.toml` 의 `[auth.external.kakao]` 에 `email_optional = true`
- 개발·운영: 대시보드의 Kakao provider 설정에서 같은 옵션

`skip_nonce_check` 는 카카오에 필요 없다 — 그건 로컬 Google 로그인 전용 우회다.

## 1-6. 검증

- **단위 테스트** — `generateUsernameSeed` (이메일 있음/없음/한글 닉네임/빈 metadata),
  `toAuthErrorReason` (취소/거부/만료/알 수 없음). 기존 `username.test.ts`,
  `isBannedRedirect.test.ts` 와 같은 자리·같은 형식.
- **손으로 확인** — 로컬에서 카카오로 신규 가입 → 아이디가 생기고 서재로 들어가는지.
  이메일 동의를 **거부**한 상태로 한 번 더. 카카오 로그인 창에서 취소했을 때 문구.
- **회귀** — 구글 로그인이 그대로 되는지. 기존 계정의 아이디가 안 바뀌는지.

## 1-7. 커밋 단위

1. `@repo/icons` 에 카카오 아이콘 추가
2. `generateUsernameSeed` + `ensureProfile` 계열 이메일 옵셔널화 (+ 단위 테스트)
3. `DeleteAccountDialog` 확인 문구를 아이디로 교체
4. `useOAuthLogin` + `OAuthLoginButton` + `providers.ts` 로 일반화, 로그인 페이지 연결
5. `toAuthErrorReason` + 콜백·에러 페이지 사유 전달 (+ 단위 테스트)
6. `supabase/config.toml` 카카오 블록

---

# 2단계 — 계정 연동

## 무엇을 만드는가

설정 화면에 **연결된 계정** 섹션. 구글·카카오 각각의 연결 상태를 보여 주고,
연결/해제할 수 있다.

## 규칙

- **마지막 하나는 해제할 수 없다.** 해제하면 로그인할 수단이 사라져 계정이 잠긴다.
  버튼을 비활성화하고 이유를 함께 보여 준다.
- 이미 다른 계정에 붙어 있는 identity 는 연결할 수 없다 (Supabase 가 거부한다).
  이때는 "그 카카오 계정은 이미 다른 계정에서 쓰고 있어요"라고 안내한다.
- 연결/해제 후 목록을 다시 읽는다.

## 구현

Supabase 의 `linkIdentity()` / `unlinkIdentity()` / `getUserIdentities()` 를 쓴다.
`linkIdentity` 는 **Supabase 대시보드에서 Manual Linking 을 켜야** 동작한다 — 1단계의
프로바이더 설정과 마찬가지로 개발·운영 둘 다 켠다.

```
features/auth/
  api/useLinkedIdentities.ts   조회 + 연결 + 해제
  ui/LinkedAccountsSection.tsx 설정 화면에 꽂히는 섹션
```

설정 페이지(`app/(protected)/settings/page.tsx`)는 지금 `ProfileSettingsForm` 하나만
렌더한다. 그 아래에 섹션을 하나 더 붙인다.

## 남는 문제 — 이미 갈라진 계정

연동 기능은 **앞으로 갈라지는 것을 막을 뿐**, 이미 두 계정에 기록이 쌓인 사람을
합쳐 주지 않는다. 계정 병합은 "어느 서재를 남길지"를 정해야 하는 별개의 문제이고,
이 설계의 범위 밖이다. 1단계 직후에 2단계를 붙이는 이유가 이것이다 — 병합이 필요한
사용자가 생기기 전에 막는다.

---

# 3단계 — 첫 로그인 온보딩

## 무엇을 만드는가

첫 로그인 직후 아이디와 닉네임을 직접 정하는 화면. 지금은 아이디가 이메일에서
자동 생성되고 사용자는 그 사실을 모른 채 `/dreamfulbud` 같은 주소를 갖게 된다.
이메일 없는 카카오 가입자는 `reader_a1b2c3` 을 받게 되므로, 이 단계가 있어야
1단계의 3순위 폴백이 사용자에게 납득 가능한 값이 된다.

## 상태를 어떻게 아는가

`profiles.onboarded_at timestamptz` 를 추가한다. `NULL` 이면 온보딩 미완료.

- **기존 사용자는 전부 `now()` 로 백필한다.** 안 하면 배포 순간 모든 기존 사용자가
  온보딩 화면으로 튕긴다.
- 마이그레이션 번호는 파일을 만들기 직전에 `git ls-tree origin/main supabase/migrations`
  로 충돌을 확인하고 정한다. 이 레포에서 이미 번호가 겹친 적이 있다.

## 아이디 변경 기회를 소진하지 않기

`20260805000000_username_change_policy.sql` 의 트리거는 **username 이 바뀌는 모든
UPDATE 에서 `username_changed_at` 을 찍는다.** 그대로 두면 온보딩에서 아이디를 정하는
순간 "한 번뿐인 변경 기회"가 사라지고, 사용자는 쓰지도 않은 기회를 잃는다.

트리거 함수에 예외를 넣는다 — **`onboarded_at` 이 `NULL` 에서 값으로 바뀌는 UPDATE 는
변경으로 세지 않는다.** 온보딩은 "변경"이 아니라 "최초 설정"이기 때문이다.
`username_changed_at` 이 서버 소유 컬럼이라는 기존 원칙은 그대로 유지한다.

## 흐름

```
콜백 → 프로필 확보 → onboarded_at 이 NULL 인가?
                       ├ 예 → /onboarding?next=<원래 목적지>
                       └ 아니오 → 원래 목적지 (지금과 동일)
```

`proxy.ts` 에서도 막는다. 온보딩 미완료 사용자가 주소창으로 보호 라우트에 직접
들어오는 경우가 있기 때문이다. 단 `/onboarding` 자체와 `/api/*`, 로그아웃은 통과시킨다
— 안 그러면 온보딩 화면이 자기 자신으로 무한 리디렉션한다.

## 화면

- 아이디 입력 — `validateUsername` 을 그대로 재사용해 입력 중 검증, 중복은 서버 확인
- 닉네임 입력 — 프로바이더가 준 값이 기본으로 채워져 있고 고칠 수 있다
- 건너뛰기 없음 — 아이디는 공개 서재 주소라 반드시 정해져야 한다.
  대신 자동 생성된 값이 미리 채워져 있어 그대로 두고 넘어갈 수 있다

---

## 이 설계가 하지 않는 것

- **계정 병합** — 이미 갈라진 두 계정의 기록을 합치는 일. 별도 과제
- **이메일/비밀번호 로그인, 매직링크** — 소셜만으로 충분하다. 비밀번호를 받으면
  재설정·유출 대응이 따라온다
- **애플 로그인** — 웹 전용인 지금은 앱스토어 요건이 없어서 필요가 없다
- **MFA·로그인 이력** — 읽기 기록 서비스에 비해 과하다

## 열린 질문

- **카카오 `user_metadata` 의 키 이름을 실물로 확인해야 한다.** `toIdentityDefaults` 는
  `full_name`/`name`/`avatar_url`/`picture` 를 본다. Supabase 의 카카오 프로바이더가
  같은 키로 정규화해 줄 것으로 보이지만 **문서가 아니라 실제 응답으로 확인한다.**
  다르면 `toIdentityDefaults` 에 키를 추가한다 (이 함수는 이미 "공급자마다 키가 다르다"를
  전제로 설계돼 있어 확장이 쉽다). 1단계 손 확인에 포함.
