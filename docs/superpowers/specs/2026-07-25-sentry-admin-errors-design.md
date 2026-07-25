# 어드민 에러 탭 + Sentry 운영 가이드 설계

작성일: 2026-07-25
상태: 승인됨 (구현 계획 대기)

## 1. 배경

Sentry는 이미 설치·동작 중이다. 그런데 운영자가 Sentry 화면을 봐도 **무엇부터 봐야 할지 판단할 수 없는** 상태다. 영어 UI가 원인이라고 짐작했으나, 실제 데이터를 조회해 확인한 결과 원인은 다른 데 있었다.

### 실측 결과 (2026-07-25 조회, 전체 기간)

프로젝트 `stronger/page0127`에 쌓인 이슈 **총 9건**의 실체:

| 분류 | 건수 | 내용 |
|---|---|---|
| 로컬 개발 중 발생 | 6건 | HMR 오류, dev-bundler 경고, Sentry 예제 페이지 테스트 에러 |
| 운영 발생 (이미 수정됨) | 2건 | `/settings` 이미지 업로드 1MB 초과 → 같은 사건이 2줄로 기록 |
| 운영 발생 (미해결) | 1건 | `GET /dashboard` — `Cannot read properties of null (reading 'id')` |

**즉 실제로 봐야 할 것은 9건 중 1건이었다.** 나머지 8건이 시야를 가리고 있었다.

### 확인된 근본 원인 3가지

**(1) 운영 환경 이름이 `production`이 아니다**

Sentry에 등록된 environment는 `development`와 **`vercel-production`** 두 개다. Vercel 연동이 자동으로 붙인 이름이다. 화면에서 관성적으로 `production`을 고르면 **0건**이 나와 아무 문제 없어 보인다. 이것이 운영자가 막힌 지점으로 추정된다.

**(2) 로컬 개발 에러가 운영 Sentry로 전송된다**

`npm run dev` 중 발생한 에러가 그대로 수집된다. 한 이슈의 스택에는 로컬 절대경로(`/Users/<user>/.../node_modules/...`)가 그대로 찍혀 있다. 전체의 67%가 이 노이즈다.

**(3) 한 사건이 여러 이슈로 쪼개진다**

`/settings`의 두 이슈는 동일 시각(2026-07-23 18:00 KST)에 발생한 하나의 사건이다. Server Action 본문이 1MB를 초과해 거부되자, 그 여파로 페이지 렌더가 실패해 별도 이슈로 기록됐다. 운영자는 12분 뒤 커밋 `4417d9b`로 `bodySizeLimit: '6mb'`를 넣어 이미 수정했으나, Sentry에서 Resolve하지 않아 여전히 미해결로 보인다.

### 부수 확인: 영향 사용자 수는 쓸 수 없다

9건 전부 `userCount`가 0 또는 1이다. `dataCollection.userInfo: false`(개인정보 미수집) 때문이며, **이 설정은 의도된 것이므로 유지한다.** 따라서 우선순위 판정에서 "영향 사용자 수" 기준은 제외하고 **발생 횟수 + 지속 일수**로 대체한다.

## 2. 목표 / 비목표

### 목표

- 운영자가 어드민 한 곳에서 **"지금 봐야 할 것"만** 한글로 확인할 수 있다
- 판단 기준을 문서와 코드가 **동일하게** 공유한다
- 깊은 조사는 Sentry 원본 화면으로 넘긴다

### 비목표 (하지 않는 것)

- Sentry 기능 복제 (스택 트레이스 렌더, 이슈 그루핑, 알림 규칙, 릴리스 비교)
- 어드민에서 이슈 상태 변경 (Resolve/Ignore) — 토큰을 읽기 전용으로 유지하기 위함
- 개인정보 수집 설정 변경
- **개발 환경 이벤트 전송 차단** — 근본 해결책이지만 이번 범위 밖. 이 탭을 만든 뒤 별도 작업으로 진행한다

## 3. 판정 규칙 (핵심)

위에서부터 순서대로 평가하고, 처음 걸린 등급으로 확정한다.

| 순서 | 조건 | 결과 |
|---|---|---|
| 1 | environment가 `vercel-production`이 아님 | **목록에서 제외** |
| 2 | 노이즈 패턴에 매칭 | 🚫 무시 (기본 숨김, 펼치기 가능) |
| 3 | 메시지에 한글이 포함됨 (`/[가-힣]/`) | ⚪ 로그성 (접어둠) |
| 4 | `lastSeen`이 7일 이전 | 🟡 잠잠해짐 — "고쳤다면 Sentry에서 Resolve하세요" 안내 |
| 5 | 최근 24시간 내 발생 **또는** 지속 3일 이상 **또는** `level: fatal` | 🔴 지금 고치세요 |
| 6 | 그 외 | 🟡 지켜보세요 |

판정 대상 문자열은 `metadata.value ?? title`, 지속 일수는 `lastSeen - firstSeen`, "최근 24시간"은 `lastSeen` 기준이다.

### 3번 규칙의 근거 — 접두사가 아니라 한글로 판정하는 이유

코드의 `console.error` 95곳을 집계한 결과:

| 형태 | 건수 |
|---|---|
| `[admin]` / `[banner]` 접두사 | 11 |
| 접두사 없음, **한글 메시지** (`도서 검색 실패:`, `계정 삭제 오류:` …) | 84 |

접두사로 판정하면 **84곳을 놓친다.** 반면 JS 런타임·라이브러리가 내는 진짜 크래시 메시지는 전부 영어다. 실측 운영 3건(`Cannot read properties of null`, `Body exceeded 1 MB limit`, `An error occurred in the Server Components render`)도 예외 없이 영어였다.

따라서 **"한글이 섞여 있으면 우리가 의도적으로 남긴 로그"** 가 이 프로젝트에서 가장 정확한 판별식이다. 향후 로그 메시지를 영어로 쓰기 시작하면 이 규칙은 무너지므로, 가이드 문서에 "로그 메시지는 한글로" 를 관례로 명시한다.

### 4번 규칙의 근거

`/settings` 두 건처럼 **이미 고쳤으나 Resolve하지 않아 남은 이슈**가 계속 쌓이면 목록이 다시 더러워진다. 이 규칙은 화면이 대신 정리를 재촉하게 한다. 실측 데이터에서 도출된 규칙이다.

### 노이즈 패턴 (2번)

| 패턴 | 무시하는 이유 |
|---|---|
| `ResizeObserver loop` | 브라우저 렌더링 잡음. 사용자 체감 영향 없음 |
| `AbortError` / 취소된 요청 | 사용자가 페이지를 이탈해 fetch가 중단된 것. 정상 |
| 스택에 `chrome-extension://` / `moz-extension://` | 사용자 브라우저 확장 프로그램 유래. 우리 코드 아님 |
| `NEXT_REDIRECT` / `NEXT_NOT_FOUND` | `redirect()`·`notFound()`의 정상 제어 흐름 |
| `Non-Error promise rejection captured` | 대개 확장 프로그램 유래 |

**노이즈로 분류하면 안 되는 것:** `Text content does not match`(하이드레이션 불일치)는 실제 화면이 깨지는 버그다. 반드시 정상 판정 경로를 타야 한다.

## 4. 아키텍처

```
app/(admin)/admin/errors/page.tsx        라우트 조립
src/features/admin-errors/
  api/getSentryIssues.ts                 Sentry 조회 + assertAdmin
  lib/triage.ts                          판정 규칙 (순수 함수)
  lib/triage.test.ts                     실측 9건 픽스처로 검증
  ui/ErrorList.tsx                       등급별 섹션
  ui/ErrorCard.tsx                       카드 한 장
src/widgets/admin/ui/AdminNav.tsx        "에러" 항목 추가 (수정)
```

기존 `admin-quality` / `admin-costs` feature와 동일한 FSD 배치다.

### triage.ts를 분리하는 이유

이 모듈은 **Sentry에 접속하지 않는다.** 이슈 객체를 입력받아 등급만 반환하는 순수 함수다. 따라서 네트워크·토큰 없이 테스트할 수 있다. `admin-quality/lib/verdict.ts`와 같은 방식이다.

### 데이터 흐름

```
/admin/errors 요청
  → assertAdmin()          기존 함수 재사용. 비관리자는 404
  → getSentryIssues()      서버에서만 실행 (토큰 노출 방지)
  → triage()               6단계 규칙으로 등급 부여
  → ErrorList              한글 렌더 + permalink 링크
```

## 5. Sentry API 연동

### 엔드포인트

```
GET https://sentry.io/api/0/projects/stronger/page0127/issues/
    ?query=&statsPeriod=&environment=vercel-production&limit=100
Authorization: Bearer $SENTRY_ISSUES_TOKEN
```

### 실측으로 확인된 API 제약

- **`statsPeriod`은 `''`, `'24h'`, `'14d'` 만 허용한다.** `90d` 등을 넣으면 HTTP 400. 전체 기간 조회는 빈 문자열을 쓴다
- `environment` 값은 반드시 `vercel-production` (— `production`은 0건 반환)
- 응답에서 사용할 필드: `id`, `title`, `culprit`, `level`, `status`, `count`, `userCount`, `firstSeen`, `lastSeen`, `metadata.{type,value,filename,function}`, `permalink`

### 토큰

| 항목 | 값 |
|---|---|
| 환경변수명 | `SENTRY_ISSUES_TOKEN` (서버 전용 — `NEXT_PUBLIC_` 접두사 금지) |
| 종류 | User Auth Token (`sntryu_`로 시작) |
| 스코프 | `event:read`, `project:read` 만 |
| 발급 위치 | https://sentry.io/settings/account/api/auth-tokens/ |

기존 `SENTRY_AUTH_TOKEN`(`sntrys_`, org 토큰)은 **재사용할 수 없다.** 스코프가 `org:ci`(소스맵 업로드·릴리스 생성)로 고정돼 있고 사후 변경이 불가능하다. 이슈 조회 시 HTTP 403이 반환된다.

`.env.example`에 `SENTRY_ISSUES_TOKEN=` 항목을 추가하고, Vercel 환경변수에도 등록한다.

### 캐싱

응답을 **5분간 재사용**한다(`next: { revalidate: 300 }`). 어드민 페이지 새로고침마다 Sentry를 호출하면 요청 한도에 걸릴 수 있다.

## 6. 실패 처리

Sentry 연동이 실패해도 **다른 어드민 메뉴는 정상 동작해야 한다.** 에러를 던지지 않고 화면에 안내를 표시한다.

| 상황 | 화면 |
|---|---|
| 토큰 미설정 | "Sentry 토큰이 설정되지 않았습니다" + 발급 안내 링크 |
| 401 / 403 | "토큰 권한을 확인해주세요 (`event:read`, `project:read` 필요)" |
| 그 외 실패 / 타임아웃 | "Sentry 연결에 실패했습니다" + Sentry 바로가기 |
| 조회 성공, 대상 0건 | "운영 환경에 확인할 에러가 없습니다" |

## 7. 테스트

`lib/triage.test.ts`에서 **실측 9건을 픽스처로 사용**한다. 픽스처는 판정에 필요한 필드만 남기고 로컬 절대경로 등은 제거한다.

검증 항목:

- development 환경 6건이 전부 제외되는가
- `/settings` 2건이 (2026-07-25 기준 lastSeen 7일 초과) 🟡 잠잠해짐으로 분류되는가
- `/dashboard` 1건이 정상 판정 경로를 타는가
- 노이즈 패턴 5종이 각각 🚫로 분류되는가
- `Text content does not match`가 🚫로 **분류되지 않는가** (역방향 검증)
- 한글 메시지(`도서 검색 실패: ...`)가 ⚪로, 영어 크래시가 ⚪가 **아닌 것**으로 분류되는가

판정이 `new Date()`에 의존하므로(4·5번 규칙) 테스트는 기준 시각을 주입받는 형태로 작성한다. 즉 `triage(issue, now)` 시그니처를 쓴다.

## 8. 운영 가이드 문서

`apps/page0127/docs/sentry-guide.md`에 작성한다. 기존 `operations-runbook.md`와 같은 위치다.

목차:

1. Sentry가 하는 일 (한 문단)
2. **환경 필터는 `vercel-production`** — 가장 먼저, 가장 크게
3. 화면 용어 대조표 (Issue / Event / Stack trace / Breadcrumbs / Culprit / Resolve …)
4. 6단계 판정 규칙과 각 규칙의 근거
5. 스택 트레이스에서 우리 코드를 찾는 법 (`app:///_next/...` 프레임 읽는 법)
6. 이 프로젝트 특유의 함정
   - `captureConsoleIntegration`으로 인해 서버 `console.error` 95곳이 전부 이슈가 됨
   - `userInfo: false`로 영향 사용자 수를 신뢰할 수 없음
   - 개발 환경 이벤트가 섞여 들어옴 (차단은 후속 작업)
7. 주간 5분 점검 루틴

## 9. 후속 작업 (이번 범위 밖)

1. **개발 환경 이벤트 전송 차단** — 노이즈의 67%를 원천 제거. Sentry 무료 할당량도 절약된다
2. `GET /dashboard`의 `null.id` 버그 수정 — 현재 유일하게 남은 실제 운영 버그
3. `/settings` 관련 2건 Sentry에서 Resolve 처리
