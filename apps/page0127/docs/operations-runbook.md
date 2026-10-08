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
- 동작: 앱이 살아있는지 + Supabase DB에 닿는지 + **배포된 코드가 기대하는 스키마가 운영 DB에
  있는지**(`SCHEMA_CONTRACT`·`EXPECTED_MIGRATION_VERSION`) 확인
- 응답
  - 정상: `200` `{ "status": "ok", "checks": { "database": "ok", "schema": "ok" } }`
  - 이상: `503` — `database: "down"` 또는 `schema: "drift"`(무엇이 깨지는지 함께 반환)
- 특징: `force-dynamic`이라 캐시되지 않고 매 요청마다 실제로 실행된다.

### 외부 uptime 모니터 — 두 겹으로 본다

앱 안에서 자기 자신을 감시할 수는 없으므로(앱이 죽으면 감시도 죽음), 밖에서 부른다.

| 감시 | 간격 | 맡은 일 |
| --- | --- | --- |
| **UptimeRobot**(무료) | 5분 | **빨리 알기.** 죽었는지만 본다 |
| GitHub Actions `uptime.yml` | 설정 5분, **실측 3~6시간** | **원인 나누기.** 스키마 어긋남·감시 고장·DB 끊김을 구분해 로그에 남긴다 |

> ⚠️ `uptime.yml` 만 믿으면 안 된다 — 2026-10-01 실측으로 9/25~10/1 실행 30회의 간격이 3~6시간이었다.
> GitHub 이 예약 실행을 그만큼 미룬다. 사이트가 죽어도 반나절 모를 수 있어서 UptimeRobot 을 더했다.

**UptimeRobot 설정** (무료 플랜: 모니터 50개·5분 간격·키워드 검사·이메일 알림 포함)

| 항목 | 값 |
| --- | --- |
| Monitor Type | **Keyword** (HTTP 가 아니라) |
| URL | `https://page0127.com/api/health` |
| Keyword | `"schema":"ok"` · 조건 **Alert when keyword not exists** |
| Interval | 5분 |
| Timeout | 30초 (서버리스 콜드스타트로 첫 응답이 4초 넘게 걸린 적 있다) |
| 알림 | 이메일(가입 계정) |

왜 Keyword 인가: 이 앱은 없는 경로에도 200 을 줄 수 있고(soft 404), 스키마가 어긋나도 DB 연결은
멀쩡하다(2026-07-29 사고). 상태코드만 보면 둘 다 "정상"이다. `"schema":"ok"` 는 DB 가 닿고 스키마도
맞을 때만 나오므로 한 단어로 세 가지(앱·DB·스키마)를 함께 본다.

---

## 2. DB 백업 & 복구

### 백업 현황

- 조직 플랜이 **free** 라 Supabase 자동 백업·PITR 이 **없다**
  (`GET /v1/projects/<ref>/database/backups` → `{"pitr_enabled": false, "backups": []}`).
- Pro 전환 계획 없음(2026-10-01 결정). 대신 **이 Mac 에서 주 1회 자동 덤프**한다.

### 주간 자동 백업 (launchd)

| 항목 | 값 |
| --- | --- |
| 스크립트(원본) | `scripts/backup-production-db.sh` |
| 스크립트(설치본) | `~/.page0127-backup/scripts/backup-production-db.sh` — **launchd 는 이것을 부른다** |
| launchd | `~/Library/LaunchAgents/com.stronger.page0127-backup.plist` |
| 언제 | 매주 월요일 09:30 + **로그인할 때**(최근 6일 안에 백업이 있으면 건너뜀) |
| 저장 위치 | `~/page0127-backups/{schema,data}-YYYYMMDD.sql` |
| 실패 시 | macOS 알림 센터에 "page0127 백업 실패" |
| 로그 | `/tmp/page0127-backup.{out,err}` |

- 로그인 시에도 거는 이유: launchd 는 Mac 이 **꺼져 있던** 동안의 예약을 다시 돌리지 않는다.
- 설치본을 따로 두는 이유: macOS 가 `~/Desktop` 을 보호 폴더로 취급해, launchd 가 저장소 안의
  스크립트를 부르면 `Operation not permitted` 로 막힌다(2026-10-01 첫 등록 때 실제 발생). bash 에
  전체 디스크 접근 권한을 주는 대신, 스크립트와 링크 정보(`supabase/.temp`)를 Desktop 밖으로 복사한다.
  **원본을 고치면 `--install` 을 다시 돌려야 반영된다.**
- 스크립트는 링크된 프로젝트가 운영(`sjngwxtykqhlsvxcyqah`)이 아니면 멈춘다. 링크가 개발로 바뀌어
  있으면 **개발 DB 를 받아 놓고 백업했다고 믿게 되기** 때문이다.
- `supabase db dump` 는 Docker 안의 `pg_dump` 를 쓴다. 꺼져 있으면 스크립트가 켜고 2분 기다린다.
- 덤프는 실패하거나 내용이 비면 30초 쉬고 최대 3회까지 다시 받는다. CLI 의 임시 로그인 역할
  (`cli_login_postgres`)이 연달아 부를 때 `password authentication failed` 로 가끔 실패하기 때문이다
  (2026-10-01 하루에 세 번). 3회 모두 실패해야 알림이 뜨고, 그때도 기존 백업은 그대로 남는다.
- ⚠️ 덤프에 회원 이메일이 들어간다. **저장소 폴더 안에 두지 말 것**(public repo).
- 오래된 덤프는 지우지 않는다 — 주 1MB 남짓이라 쌓여도 부담이 없고, 자동 삭제는 되돌릴 수 없다.

### 수동 백업 — 대량 데이터 작업 직전에는 반드시

백필·병합·일괄 수정처럼 운영 데이터를 크게 바꾸기 직전에는 주기와 상관없이 한 번 받는다.
(2026-07-29 백업 뒤 두 달간 백업 없이 YES24 백필·식별자 병합을 돌렸다 — 그 공백을 막으려는 규칙.)

```bash
bash scripts/backup-production-db.sh --force
```

`--force` 는 "최근 6일 안의 백업이 있으면 건너뜀"을 무시한다.

**launchd 등록/해제** (최초 1회, main 에 병합된 뒤. 저장소 루트에서)

```bash
bash scripts/backup-production-db.sh --install   # 설치본 복사(스크립트를 고친 뒤에도 다시)
launchctl load ~/Library/LaunchAgents/com.stronger.page0127-backup.plist
launchctl list | grep page0127-backup      # 등록 확인
launchctl unload ~/Library/LaunchAgents/com.stronger.page0127-backup.plist   # 해제
```

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
   - 외부 의존성(OpenAI/YES24) 장애 → 해당 기능만 임시 비활성/안내
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

## 6. 카카오톡 에러 알림

운영 에러를 이메일 대신 **운영자 카톡**으로 받는다.

```
Sentry 알림 규칙 → POST /api/alerts/sentry (서명 검증) → 카카오 "나에게 보내기" → 운영자 카톡
주간 크론 /api/cron/refresh-kakao-token → 토큰 갱신(리프레시 토큰 계속 연장)
AI 분석 저장 직후 after() → 이번 달 사용액이 월 예산 80%·100% 를 건넜으면 → 같은 카톡
```

**AI 예산 알림** — 기준은 `MONTHLY_BUDGET_KRW`(14,000원 = $10, OpenAI 프로젝트 월 한도와 같은 값).
"넘는 순간"의 호출만 알려서 한 달에 기준선마다 한 번씩 온다. 사용액은 앱이 적는
`cost_in_cents` 합계다 — **OpenAI 선불 잔액은 API 로 못 읽으니** Billing 화면에서 따로 본다
(2026-10-08 기준 $9.75, 자동 충전 꺼짐). OpenAI 한도를 바꾸면 상수도 같이 바꾼다.

| 항목 | 위치 |
| --- | --- |
| 토큰 저장 | `alert_channel_tokens` 테이블(service_role 전용) |
| 연결 상태·다시 연결 | `/admin/errors` 상단 "카카오톡 에러 알림" |
| 코드 | `src/shared/lib/kakao-alert/`, `app/api/alerts/sentry`, `app/api/admin/kakao-alert/*` |

### 최초 설정 — 순서대로

**① 카카오 알림 전용 앱** ([developers.kakao.com](https://developers.kakao.com) → 내 애플리케이션 → 추가)

로그인용 앱과 **다른 앱**을 만든다. 로그인 앱에 "카카오톡 메시지" 동의를 붙이면 로그인 동의 화면이 바뀔 수 있다.

1. 카카오 로그인 → **활성화 ON**
2. 카카오 로그인 → Redirect URI: `https://page0127.com/api/admin/kakao-alert/callback`
3. 동의항목 → **카카오톡 메시지 전송(talk_message)** → 선택 동의
4. 앱 → 제품 링크 관리 → 웹 도메인: `https://page0127.com` (카톡 버튼이 여는 주소. 없으면 눌러도 안 열린다)
5. 앱 키의 **REST API 키**, 보안의 **Client Secret** 을 적어 둔다

**② Sentry Internal Integration** (Settings → Developer Settings → Custom Integrations → Create New Integration → Internal)

1. Webhook URL: `https://page0127.com/api/alerts/sentry`
2. **Alert Rule Action** 켜기
3. 권한: Issue & Event → Read
4. 저장 후 **Client Secret** 을 적어 둔다

**③ Vercel 환경변수** (Production) 등록 → **재배포**(빌드에 박히는 값은 아니지만 함수가 새 값을 읽으려면 배포가 필요)

`KAKAO_ALERT_REST_API_KEY` · `KAKAO_ALERT_CLIENT_SECRET` · `SENTRY_ALERT_CLIENT_SECRET`

**④ 연결** — 운영 `/admin/errors` → **연결하기** → 카카오 동의 → 돌아오면 카톡으로 시험 메시지가 온다

**⑤ Sentry 알림 규칙** (Alerts → Create Alert → Issues)

- 환경: `vercel-production`
- 조건: **A new issue is created**
- 동작: **Send a notification via an integration** → ②에서 만든 Internal Integration

### 장애·점검

- 카톡이 안 온다 → `/admin/errors` 상단 상태부터. "연결 안 됨"이면 ④, 날짜가 지났으면 리프레시 토큰 만료 → ④ 다시
- 상태의 "다시 연결 필요 시점"이 **매주 뒤로 밀리지 않는다** → 주간 크론이 멈춘 것(Vercel → Cron Jobs 로그)
- 웹훅이 401 → `SENTRY_ALERT_CLIENT_SECRET` 이 Internal Integration 의 값과 다르다
- 발송 실패는 웹훅이 200 으로 받고 로그만 남긴다(5xx 면 Sentry 가 재전송해 같은 실패가 쌓인다)

---

## 변경 이력

| 날짜 | 내용 | 작성 |
| --- | --- | --- |
| 2026-07-23 | 런북 최초 작성 | - |
| 2026-07-25 | Go-live 게이트·환경 분리·Sentry 실수신 절차 추가 | - |
| 2026-07-28 | 개발 클라우드 Supabase 신설로 Preview·CI 분리 완료, `main` 브랜치 보호 적용 → Go-live 게이트 3건 체크. 키 출처·스코프·`E2E smoke` 제외 이유 명시 | - |
| 2026-07-28 | 마이그레이션·RPC allowlist 감사 완료, GitHub Actions 기반 uptime 감시 도입(알림 실수신 확인) → Go-live 게이트 2건 추가 체크. 남은 건 백업 복원·Sentry 실수신·전체 시나리오 3건 | - |
| 2026-10-01 | uptime 실측 간격(3~6시간) 기록 + UptimeRobot 보강 절차, 헬스 응답에 `schema` 반영. 백업을 launchd 주간 자동으로 바꾸고 "대량 데이터 작업 직전 수동 1회" 규칙 추가 | - |
| 2026-10-03 | 6장 카카오톡 에러 알림 추가(최초 설정 순서·장애 점검) | - |
| 2026-10-08 | AI 월 예산을 $10(14,000원)로 낮추고 80%·100% 도달 카톡 알림 추가 | - |
