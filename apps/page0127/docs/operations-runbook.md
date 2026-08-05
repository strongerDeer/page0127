# 운영 런북 (Operations Runbook)

page0127 서비스의 상태 확인·백업·장애 대응 절차를 한곳에 모은 문서.
오픈 전 확인하지 못한 항목은 `미확인 — 오픈 차단`으로 표시한다.

## 0. Go-live 게이트

다음 항목이 모두 체크되기 전에는 정식 오픈으로 전환하지 않는다.

- [x] 최신 DB 마이그레이션 적용 및 RPC 권한 allowlist 확인 — 2026-07-28
  - 로컬 41개가 운영에 전부 적용됨(`supabase migration list --linked`, 미적용 0건)
  - public 함수 11개 중 `anon`/`authenticated`에 열린 건 **정확히 allowlist 4개**뿐.
    `ALTER DEFAULT PRIVILEGES`가 postgres·service_role에만 있어 새 함수는 자동 비공개다.
  - 공개된 SECURITY DEFINER 함수 둘은 스스로 방어한다 — `get_book_ranking_with_delta`는
    `is_public` 필터, `reserve_ai_usage`는 `auth.uid()` 검증, 둘 다 `search_path` 고정.
  - 감사 방법: `supabase db dump --linked` 후 `GRANT ... ON FUNCTION` 구문을 grep한다
    (REST API로는 확인되지 않는다). 기준은 `20260725000001_lock_down_function_privileges.sql`.
- [x] GitHub `main` 브랜치 보호: PR 필수(승인 0건) + `Lint · Type-check · Build` 필수 체크 — 2026-07-28
  - ⚠️ **`E2E smoke (Playwright)`는 필수 체크에 넣지 않는다.** dependabot PR에는 GitHub이
    secrets를 전달하지 않아 e2e 잡을 skip 처리했는데, skip되는 체크를 필수로 걸면 의존성
    PR이 머지되지 않는다. 의존성 검증은 `Lint · Type-check · Build`가 담당하고, e2e는
    머지 후 `main` push에서 돈다.
  - `Require approvals`는 끈다 — 혼자 작업하면 자기 PR을 자기가 승인할 수 없어 모든 머지가 막힌다.
  - `Require branches to be up to date`도 끈다 — 세션이 여럿이라 `main`이 자주 움직여 매번 최신화해야 한다.
- [x] Vercel Preview와 GitHub Actions가 개발/테스트 Supabase를 사용 — 2026-07-28
  - 개발 프로젝트 `uglagvujxbgdozsucxgp` (page0127-dev) 신설, 마이그레이션 38개 적용해 운영과 테이블 34개 일치
  - Preview 배포에서 Google 로그인 → **개발 DB에 계정 생성**까지 확인
- [x] Vercel Preview에 `PRODUCTION_SUPABASE_URL` 설정 후 오연결 차단 빌드 확인 — 2026-07-28
  - CI의 `Block production database in CI` 통과 + Preview 빌드가 `next.config.ts` 가드를 통과
- [ ] 운영 배포 직전 백업 생성 및 복원 가능한 백업인지 확인
- [x] 외부 uptime 모니터와 장애 알림 실수신 확인 — 2026-07-28
  - 전용 서비스(UptimeRobot 등) 대신 **GitHub Actions**로 구현: `.github/workflows/uptime.yml`.
    5분마다 `/api/health`를 호출해 실패하면 워크플로가 빨간불이 되고 GitHub이 메일을 보낸다.
  - ⚠️ **상태코드가 아니라 응답 본문의 `"database":"ok"`를 확인한다.** 이 앱은 존재하지 않는
    경로에도 200 + HTML을 반환하므로(soft 404), 상태코드만 보는 감시는 주소 오타를 정상으로 오판한다.
  - 정상(성공)·실패(빨간불)·**메일 도착**까지 모두 확인 완료.
  - 알림 실수신 테스트 방법: 별도 브랜치에서 `TARGET`을 틀리게 바꾼 뒤 Actions의 `Run workflow`에서
    **그 브랜치를 지정해** 실행하고, 확인 후 브랜치를 버린다. 운영과 `main`을 건드리지 않는다.
  - 한계: GitHub cron은 정확하지 않아 실제로는 10~20분 간격으로 돈다. 분 단위 감지가 필요해지면
    전용 서비스로 옮긴다(엔드포인트는 그대로 쓸 수 있다).
- [ ] Sentry 테스트 오류가 이슈·알림으로 도착하고 소스맵이 해석되는지 확인
- [ ] 두 테스트 계정으로 가입 → 책 CRUD → AI 분석 → 팔로우/알림 → 탈퇴 확인

---

## 1. 헬스체크 & Uptime 모니터링

### `/api/health`

- 경로: `GET /api/health` (인증 불필요)
- 동작: 앱이 살아있는지 + Supabase DB에 닿는지 확인
- 응답
  - 정상: `200` `{ "status": "ok", "checks": { "database": "ok" } }`
  - 이상: `503` `{ "status": "degraded", "checks": { "database": "down" } }`
- 특징: `force-dynamic`이라 캐시되지 않고 매 요청마다 실제로 실행된다.

### 외부 uptime 모니터 설정

앱 안에서 자기 자신을 감시할 수는 없으므로(앱이 죽으면 감시도 죽음),
**외부 서비스**가 주기적으로 `/api/health`를 호출하게 한다.

권장 설정 (UptimeRobot / BetterStack / Pingdom 등 무엇이든 동일):

| 항목 | 값 |
| --- | --- |
| Monitor URL | `https://page0127.com/api/health` |
| 방식 | HTTP(s) — 상태코드 200 확인 (가능하면 본문에 `"status":"ok"` 포함 검사) |
| 주기 | 1~5분 |
| 실패 판정 | 연속 2회 실패 시 알림 (일시적 흔들림으로 인한 오탐 방지) |
| 알림 채널 | `미확인 — 오픈 차단` |

> 배포 플랫폼(Vercel)의 함수 콜드스타트로 첫 응답이 느릴 수 있으니 타임아웃은 10초 이상으로.

---

## 2. DB 백업 & 복구

### 백업 현황 확인

- Supabase 대시보드 → 운영 Project → **Database → Backups**
  - 플랜에 따라 **일 단위 자동 백업** 또는 **PITR(Point-in-Time Recovery)** 제공
  - 현재 플랜: `미확인 — 오픈 차단`
  - 자동 백업/PITR 및 보관 기간: `미확인 — 오픈 차단`
- ⚠️ Free 플랜은 자동 백업 보관이 짧거나 없을 수 있다. 중요 데이터라면
  Pro 이상(또는 아래 수동 백업 병행)을 검토.

### 수동 백업 (선택)

```bash
# 전체 스키마 + 데이터 덤프 (연결 문자열은 Supabase → Settings → Database)
supabase db dump --db-url "<POSTGRES_CONNECTION_STRING>" -f backup_$(date +%Y%m%d).sql

# 또는 pg_dump 직접
pg_dump "<POSTGRES_CONNECTION_STRING>" > backup_$(date +%Y%m%d).sql
```

- 저장 위치: `미확인 — 오픈 차단`
- 주기: 자동 백업이 없다면 최소 주 1회

### 복구 리허설 체크리스트 (분기 1회 권장)

실제 장애 전에 "복구가 된다"는 걸 미리 확인해 두는 연습.

1. [ ] **스테이징/임시 프로젝트**에 최근 백업을 복원 (운영에 절대 직접 복원 금지)
2. [ ] 주요 테이블 행 수 확인 (`profiles`, `books`, `activities`, `notifications`, `ai_usage_logs`)
3. [ ] 앱을 임시 프로젝트에 연결해 로그인 → 서재 → 분석 흐름이 도는지 확인
4. [ ] 복원에 걸린 시간 기록 (RTO 파악)
5. [ ] 마이그레이션(`supabase/migrations/`)이 백업 시점과 어긋나지 않는지 확인
6. [ ] 리허설 결과를 아래 "변경 이력"에 한 줄 기록

---

## 3. 장애 대응 메모

### 심각도

| 등급 | 정의 | 예시 |
| --- | --- | --- |
| S1 | 전체 다운 / 데이터 유실 위험 | 사이트 500, DB 접속 불가, 헬스체크 503 지속 |
| S2 | 핵심 기능 일부 장애 | 로그인/분석 실패, 특정 페이지만 오류 |
| S3 | 경미 / 우회 가능 | 이미지 일부 깨짐, 지연 |

### 최초 대응 순서

1. **확인**: `/api/health` 응답, Sentry(`stronger/page0127`) 에러 급증, Vercel/Supabase 로그
2. **영향 범위 파악**: 전체인지 일부 기능인지, 언제부터인지
3. **완화/롤백**:
   - 방금 배포가 원인 → **Vercel에서 직전 배포로 롤백** (Deployments → 이전 성공 배포 → Promote)
   - DB 마이그레이션이 원인 → 되돌리는 마이그레이션 작성(운영 DB 직접 수정 지양)
   - 외부 의존성(OpenAI/Aladin) 장애 → 해당 기능만 임시 비활성/안내
4. **공지**: 서비스 공지 채널에 인지 사실 알림
5. **사후(postmortem)**: 원인·타임라인·재발방지책을 아래 "변경 이력" 또는 별도 문서에 기록

### 관측 도구 링크

- Sentry: org `stronger`, project `page0127`
- Vercel: 팀 대시보드의 `page0127` 프로젝트
- Supabase: 운영 프로젝트 대시보드
- Uptime 모니터: `미설정 — 오픈 차단`

### 에스컬레이션

| 순위 | 담당 | 연락 |
| --- | --- | --- |
| 1차 | page0127 운영자 | 카카오톡 문의 채널 |
| 2차 | - | - |

---

## 4. 정기 점검 (월 1회 권장)

- [ ] uptime 모니터가 살아있고 알림이 실제로 오는지 (일부러 실패시켜 테스트)
- [ ] Supabase 백업이 최신인지
- [ ] Sentry에 방치된 미해결 이슈가 쌓였는지
- [ ] 만료 임박한 키/토큰 확인 (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`)

## 5. 배포 환경 필수 설정

### Supabase 프로젝트 (헷갈리기 쉬움)

"개발용"이 두 개다. **서로 다른 DB이므로 값을 섞으면 안 된다.**

| | 주소 | 접속 가능한 곳 | 값 출처 |
| --- | --- | --- | --- |
| 로컬 Docker | `http://127.0.0.1:54321` | 내 맥에서만 | `supabase status` → `apps/page0127/.env.local` |
| 개발 클라우드 | `https://uglagvujxbgdozsucxgp.supabase.co` | 인터넷(GitHub·Vercel) | `supabase projects api-keys --project-ref uglagvujxbgdozsucxgp` |
| 운영 | `https://sjngwxtykqhlsvxcyqah.supabase.co` | 인터넷 | `--project-ref sjngwxtykqhlsvxcyqah` |

⚠️ **`.env.local` 값을 GitHub·Vercel에 복사하지 않는다.** 주소는 클라우드인데 키는 로컬 것이
되어 `Invalid API key`로 실패한다(2026-07-28 실제 사고: CI e2e 헬스체크가 503).

⚠️ **키는 `eyJ…`로 시작하는 레거시 JWT를 쓴다.** 프로젝트마다 키가 4종 발급되는데
(`anon` 208자 / `service_role` 219자 / `sb_publishable_…` 46자 / `sb_secret_…` 41자),
대시보드 API 페이지는 신형 키를 먼저 보여준다. 앱은 JWT로 검증돼 있으므로 위 두 개만 쓴다.

### GitHub Actions secrets

- `NEXT_PUBLIC_SUPABASE_URL`: **개발 클라우드** URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: **개발 클라우드** anon key (`eyJ…`)
- `SUPABASE_SERVICE_ROLE_KEY`: **개발 클라우드** service role key (`eyJ…`)
- `PRODUCTION_SUPABASE_URL`: 운영 Supabase URL(오연결 비교용 + `quality.yml` 저장 대상)
- `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`: **운영** service role key — `quality.yml` 전용

CI의 `Block production database in CI` 단계가 두 URL이 같으면 실패해야 정상이다.

**왜 운영 키가 secrets에 따로 있나:** GitHub secrets는 저장소에 이름이 하나뿐이라
워크플로마다 다른 값을 줄 수 없다. `ci.yml`(e2e)은 개발 DB가, `quality.yml`(주 1회 품질
측정 후 **저장**)은 운영 DB가 필요해 충돌한다. 그래서 `quality.yml`에서는 환경변수 이름
(`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `store.ts`가 읽는 이름)은 그대로
두고 **값의 출처만** `secrets.PRODUCTION_*`로 매핑했다.
→ secrets를 건드릴 땐 `.github/workflows/` 전체에서 그 이름의 사용처를 먼저 grep한다.

### Vercel

같은 이름을 **스코프별로 나눠** 등록한다(하나의 변수에 Production·Preview를 함께 체크하지 않는다).

- Production 스코프: 운영 Supabase 값
- Preview 스코프: **개발 클라우드** Supabase 값
- Preview 스코프의 `PRODUCTION_SUPABASE_URL`: 운영 Supabase URL (가드의 대조군이므로 운영 값이 맞다)
- Git Production Branch: `main`
- GitHub의 필수 체크가 끝난 커밋만 Production에 배포되도록 설정

⚠️ **환경변수는 배포 시점에 굳는다.** 값을 바꿔도 기존 배포에는 반영되지 않으므로 새로
배포해야 한다(`vercel redeploy <배포URL>`이면 push 없이 가능). Hobby 플랜은 동시 빌드가
1개라, Production과 겹치면 Preview 배포가 `Canceled`된다.

### 개발 클라우드 프로젝트의 Google 로그인

Preview에서 로그인까지 테스트하려면 세 가지가 필요하다(2026-07-28 설정 완료).

1. Google Cloud 콘솔 → 승인된 리디렉션 URI에 `https://uglagvujxbgdozsucxgp.supabase.co/auth/v1/callback` 추가
2. Supabase 개발 프로젝트 → Authentication → Providers → Google 활성화 + **Client ID/Secret 입력**
   (이 값은 `supabase/.env.local`의 `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`. **Google Cloud 쪽 값이라
   로컬·개발·운영이 같은 것을 쓴다** — 프로젝트마다 다른 Supabase 키와 혼동하지 말 것)
3. Authentication → URL Configuration → Redirect URLs에 `https://page0127-*-strongerdeers-projects.vercel.app/**`
   (Preview 주소는 배포마다 바뀌므로 와일드카드가 필요하다)

### Sentry 실수신 테스트

1. Preview에서 의도적으로 테스트 예외 1건을 발생시킨다.
2. Sentry 환경이 `vercel-preview`로 분리되는지 확인한다.
3. 파일명과 원본 줄 번호가 보이면 소스맵 정상이다.
4. 운영 알림 규칙을 테스트해 실제 알림을 받은 시각을 기록한다.
5. 테스트 이슈를 resolve하고 테스트 코드는 제거한다.

---

## 변경 이력

| 날짜 | 내용 | 작성 |
| --- | --- | --- |
| 2026-07-23 | 런북 최초 작성 | - |
| 2026-07-25 | Go-live 게이트·환경 분리·Sentry 실수신 절차 추가 | - |
| 2026-07-28 | 개발 클라우드 Supabase 신설로 Preview·CI 분리 완료, `main` 브랜치 보호 적용 → Go-live 게이트 3건 체크. 키 출처·스코프·`E2E smoke` 제외 이유 명시 | - |
| 2026-07-28 | 마이그레이션·RPC allowlist 감사 완료, GitHub Actions 기반 uptime 감시 도입(알림 실수신 확인) → Go-live 게이트 2건 추가 체크. 남은 건 백업 복원·Sentry 실수신·전체 시나리오 3건 | - |
