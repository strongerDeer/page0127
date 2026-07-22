# page0127 Admin 페이지 — 설계 문서 (1차 스펙)

- 작성일: 2026-07-23
- 대상 앱: `apps/page0127`
- 스택: Next.js 16 App Router · FSD · Supabase(Postgres + Auth) · Tailwind v4 + shadcn/ui · npm workspaces + Turborepo

---

## 1. 목적

운영자(1인)가 서비스를 관리할 수 있는 `/admin` 페이지를 만든다. 이번 1차 스펙은 가장 급한 두 가지 위험 — **AI 비용 폭주**와 **어뷰징/스팸 유저 대응** — 을 다룬다.

- **AI 비용 대시보드**: 이번 달 비용이 예산(월 ₩30,000) 대비 얼마인지, 누가 많이 쓰는지 한눈에 본다.
- **회원 관리·정지**: 가입자를 조회하고, 문제 사용자를 정지(기간 지정 가능)·해제한다.

두 기능을 담을 **공통 admin 셸**(레이아웃·네비게이션·접근 게이트)도 이 스펙에서 함께 만든다.

---

## 2. 범위

### 이번 스펙에 포함
1. 공통 admin 셸 — 라우트 그룹 `(admin)`, 레이아웃, 사이드바 nav, 접근 게이트
2. AI 비용 대시보드 (읽기 전용)
3. 회원 관리 — 목록/상세
4. 회원 정지·해제 — 영구/기간 지정, 사유 기록(감사 로그)

### 이번 스펙에서 제외 (후속 로드맵)
각각 별도 스펙 → 계획 → 구현 사이클로 진행한다.

- **바로 다음 스펙: 메인 배너 관리** — 지금 하드코딩된 히어로 배너 슬라이드(`src/widgets/landing/model/heroSlides.ts`의 `HERO_SLIDES`)를 DB 테이블로 옮겨, admin에서 **추가·삭제·순서 변경·켜고끄기**까지 관리. 슬라이드는 글자 + 배경색만 쓰므로(책 표지는 기존처럼 DB에서 자동 조회) **이미지 업로드 없음**. public `HeroBannerSection`은 DB에서 읽되, 데이터가 없으면 기존 상수로 폴백(랜딩이 죽지 않도록).
- 운영 모니터링(cron 마지막 실행 시각·결과)
- 콘텐츠 품질(표지/ISBN 없는 책 등 이상 데이터)
- 내부 지표(가입자 추이, 책 등록/완독 수, AI 분석 건수 요약)

### 명시적 비목표
- 임시 정지 자동 만료를 위한 별도 배치/cron (아래 4.4의 "표시 시점 계산"으로 대체)
- 사용자별 **비용** 랭킹 (궁합 분석은 두 사용자 쌍이라 단일 귀속이 불가 — 4.2 참고)
- GA4 트래픽 분석 (이미 GA 대시보드가 담당; admin에는 우리 DB에만 있는 숫자만)

---

## 3. 접근통제

### 3.1 방식: 이메일 화이트리스트 + 2중 방어

1인 프로젝트라 별도 role 시스템(DB 컬럼) 대신 **서버 전용 환경변수 `ADMIN_EMAILS`**(쉼표로 구분한 이메일 목록)로 관리자를 지정한다.

방어는 두 지점에서 이뤄진다. **진짜 보안 경계는 service_role 데이터를 읽는 admin API/서버액션**이다. 미들웨어는 UX용 조기 차단일 뿐이다.

| 지점 | 역할 | 판정 |
|---|---|---|
| 미들웨어 | 로그인 여부만 | `PROTECTED_PREFIXES`에 `/admin` 추가 → 비로그인 사용자는 로그인 페이지로 리다이렉트 |
| 서버 가드 `assertAdmin()` | 관리자 여부 (진짜 경계) | 현재 유저 이메일 ∈ `ADMIN_EMAILS` 이면 통과, 아니면 `notFound()`(404) |

- 화이트리스트 판정 로직은 edge(미들웨어)가 아니라 **서버 헬퍼 한 곳**에 모아 테스트 가능하게 둔다.
- 비관리자에게는 **404**(존재 자체를 숨김). 403이 아니라 404로 admin 라우트의 존재를 노출하지 않는다.

### 3.2 `assertAdmin()`

- 위치: `src/shared/lib/admin/assertAdmin.ts`
- 동작: `app/api/_helpers/auth.ts`의 `getCurrentUser()`로 현재 유저를 얻고, 이메일을 소문자·trim 정규화해 `ADMIN_EMAILS`(동일 정규화)와 대조. 미포함이면 `notFound()`.
- **호출 지점(둘 다 필수)**:
  - `app/(admin)/admin/layout.tsx` — 페이지 접근 게이트
  - 모든 admin API 라우트 / 서버액션 첫 줄 — 데이터 접근 게이트
- 레이아웃 게이트만으로는 API가 열려 있으므로, service_role을 만지는 지점마다 **반드시 재확인**한다.

### 3.3 데이터 접근

admin의 모든 조회/변경은 **`createAdminClient()`**(service_role, RLS 우회)를 쓴다. 관련 테이블(`ai_usage_logs`, `taste_analyses`, `compatibility_analyses`, `books`, `profiles`)의 RLS가 전부 "본인 것만"이라, 일반 `createClient()`로는 다른 유저 데이터를 가로질러 읽을 수 없다.

### 3.4 필요한 환경변수 (`.env.local`에 직접 추가 — 구현 시점에 안내)

```
SUPABASE_SERVICE_ROLE_KEY=...      # 현재 없음. admin 데이터 조회에 필수
ADMIN_EMAILS=you@example.com       # 쉼표로 여러 개 가능
```

`.env.example`에는 `SUPABASE_SERVICE_ROLE_KEY`가 이미 문서화돼 있다. `ADMIN_EMAILS`도 `.env.example`에 추가한다.

---

## 4. 기능 설계

### 4.1 공통 셸 & 라우트

```
app/(admin)/admin/
├─ layout.tsx        # await assertAdmin() → 사이드바 nav 셸 (Server Component)
├─ page.tsx          # 대시보드 홈 (요약 카드 몇 개, 각 화면으로 진입)
├─ costs/page.tsx    # AI 비용 대시보드
└─ members/
    ├─ page.tsx      # 회원 목록
    └─ [id]/page.tsx # 유저 상세 + 정지/해제
```

- 페이지는 얇은 Server Component. 데이터 조회·UI 구성은 FSD 레이어로 분리(6장).
- 미들웨어: `apps/page0127/middleware.ts`의 `PROTECTED_PREFIXES`에 `/admin` 추가.

### 4.2 AI 비용 대시보드 (`/admin/costs`, 읽기 전용)

**데이터 소스**
- 총/일별/월별 비용 = `taste_analyses.cost_in_cents` + `compatibility_analyses.cost_in_cents` 합산. 단위는 **USD 센트**(`calculateCost`가 gpt-4o 단가로 `Math.ceil(dollars * 100)` 반환).
- 호출 건수·사용자별 순위 = `ai_usage_logs(user_id, feature, created_at)`.

**화면 구성 (달러 원본 + 원화 병기)**
- **이번 달 예산 게이지**: `$8.20 ≈ ₩11,480 / ₩30,000 (38%)`. 1px 테두리 진행 바.
- **일별 추이**: 최근 30일 일별 비용 합계.
- **기능별 분해**: `taste_analysis` vs `compatibility`의 비용·건수.
- **사용자별 순위(Top N)**: `ai_usage_logs` **호출 건수** 기준 상위 N명. (어뷰징 = 과다 호출 신호)

**비용 귀속 결정 (중요)**
`compatibility_analyses`는 `user_id_1`, `user_id_2` 쌍 구조라 "누구 비용인지" 단일 귀속이 불가능하다. 따라서:
- **총비용**은 두 테이블 합으로 정확히 낸다.
- **사용자별 순위**는 비용이 아니라 `ai_usage_logs`의 **호출 건수**(단일 `user_id`, 명확)로 매긴다. "사용자별 비용 랭킹"은 만들지 않는다.

**설정값** — `src/shared/lib/admin/config.ts`
```ts
export const USD_TO_KRW = 1400;          // 수동 갱신 근사 상수
export const MONTHLY_BUDGET_KRW = 30000; // 월 예산
```

### 4.3 회원 목록 (`/admin/members`)

- `createAdminClient()`로 `profiles` 전체 조회.
- 컬럼: 닉네임/username, 이메일, 가입일(`created_at`), **등록 책 수**(`books`를 `user_id`로 카운트), 상태(정상/정지).
- 정렬: 가입일 최신순 기본.
- 이메일/닉네임 검색 + 페이지네이션(50명/페이지).

### 4.4 유저 상세 & 정지·해제 (`/admin/members/[id]`)

**상세 표시**
- 프로필 요약 + 등록 책 수 + AI 사용(호출 건수) + 현재 상태.

**정지 메커니즘 — native ban + `profiles` 미러 (한 액션이 둘 다 씀)**

정지/해제 서버액션(또는 API `POST`)은 다음을 **원자적으로 함께** 수행한다:

정지 시:
1. `createAdminClient().auth.admin.updateUserById(id, { ban_duration })` — Supabase가 로그인·토큰 갱신을 거부(실제 차단). 영구는 매우 긴 기간(예: `'876000h'`), 기간 지정은 `'{N*24}h'`.
2. `profiles.status = 'suspended'`, `profiles.suspended_until = 영구면 null / 기간이면 now() + N일` — 목록 표시용 미러.
3. `admin_actions`에 1행 기록(`admin_email`, `target_user_id`, `action='suspend'`, `reason`, `duration_days`, `created_at`).

해제 시:
1. `ban_duration: 'none'`
2. `profiles.status = 'active'`, `suspended_until = null`
3. `admin_actions`에 `action='unsuspend'` 기록.

**표시 시점 계산 (임시 정지 자동 만료 드리프트 방지)**

임시 정지는 Supabase 쪽에서 기간이 지나면 자동 해제되지만, `profiles.status` 미러는 그대로 남는다. 별도 배치 없이 **읽는 시점에 계산**해 자가 치유한다:

> "현재 정지 중" = `status = 'suspended'` **AND** (`suspended_until IS NULL` **OR** `suspended_until > now()`)

목록/상세 쿼리가 이 규칙으로 상태를 표시한다.

**정지 입력**
- 기간: `영구` 또는 `N일`(예: 7/30일 프리셋 + 직접 입력).
- 사유: 텍스트(선택 입력이지만 권장).
- 정지 버튼/폼만 `'use client'`(이벤트 핸들러 필요), 나머지는 Server Component.

---

## 5. DB 마이그레이션

`supabase/migrations/`에 새 파일 추가.

```sql
-- 1) profiles: 정지 상태 미러
ALTER TABLE profiles
  ADD COLUMN status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  ADD COLUMN suspended_until timestamptz;  -- null = 영구(정지 중) 또는 미정지

-- 2) admin_actions: 관리자 행위 감사 로그 (누가·언제·왜)
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,                 -- 'suspend' | 'unsuspend'
  reason text,
  duration_days int,                    -- null = 영구
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: admin은 service_role로 우회하므로 정책 없이 활성화만(일반 유저 차단)
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
```

- `profiles`에 컬럼을 추가해도 기존 RLS는 그대로. 일반 유저가 자기 `status`를 읽는 것은 무해.
- `admin_actions`는 SELECT 정책을 두지 않는다(admin은 service_role, 일반 유저는 접근 불가).

---

## 6. 파일 구조 (FSD)

```
apps/page0127/
├─ middleware.ts                         # PROTECTED_PREFIXES += '/admin'
├─ app/(admin)/admin/                    # 4.1의 라우트
└─ app/api/admin/
    └─ members/[id]/suspend/route.ts     # 정지/해제 (서버액션으로 대체 가능)

src/
├─ shared/lib/admin/
│   ├─ assertAdmin.ts                    # 관리자 판정(진짜 경계)
│   └─ config.ts                         # ADMIN_EMAILS 파싱, USD_TO_KRW, MONTHLY_BUDGET_KRW
├─ features/admin-costs/api/             # 비용 집계 쿼리(createAdminClient)
├─ features/admin-members/
│   ├─ api/                              # 목록·상세 쿼리 + 정지/해제 서버액션
│   └─ ui/                               # 목록 테이블, 정지 폼(client) 등
└─ widgets/admin/ui/                     # 사이드바 nav 등 셸 UI
```

정지/해제를 **API 라우트**로 둘지 **서버액션**으로 둘지는 구현 계획에서 확정한다(둘 다 `assertAdmin()` 필수).

---

## 7. 디자인 원칙 (기존 확립 원칙 준수)

- 그림자 없음 — 입체는 `1px solid var(--line)`.
- 헤딩·라벨에 이모지 없음 — lucide 단색 아이콘.
- 종이·잉크 팔레트.
- 데이터 없으면 우아하게 물러남(빈 상태 문구).
- Server Component 우선, `'use client'`는 정지 폼처럼 상호작용 필요한 곳만.

---

## 8. 테스트 관점

- `assertAdmin()`: 화이트리스트 포함/미포함 이메일, 비로그인 케이스에서 통과/`notFound()` 분기.
- 비용 집계: 두 테이블 합산이 정확한지, 일별/월별 경계, `cost_in_cents` null 처리.
- 정지 액션: ban + `profiles.status`/`suspended_until` + `admin_actions`가 **함께** 기록되는지. 임시 정지 만료 후 "현재 정지 중" 계산이 자가 치유되는지.
- 접근: 비관리자가 admin 페이지·API에 접근 시 404.

---

## 9. 후속 스펙 로드맵 (참고)

1. **메인 배너 관리** (바로 다음) — 2장 참고. 풀 관리(추가/삭제/순서/켜고끄기), 이미지 업로드 없음, DB 비면 상수 폴백.
2. 운영 모니터링(cron 실행 현황)
3. 콘텐츠 품질(이상 데이터)
4. 내부 지표(요약 통계)
