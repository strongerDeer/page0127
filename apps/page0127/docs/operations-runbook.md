# 운영 런북 (Operations Runbook)

page0127 서비스의 상태 확인·백업·장애 대응 절차를 한곳에 모은 문서.
`<...>` 표시는 팀에서 실제 값으로 채워야 하는 부분이다.

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
| Monitor URL | `https://<프로덕션-도메인>/api/health` |
| 방식 | HTTP(s) — 상태코드 200 확인 (가능하면 본문에 `"status":"ok"` 포함 검사) |
| 주기 | 1~5분 |
| 실패 판정 | 연속 2회 실패 시 알림 (일시적 흔들림으로 인한 오탐 방지) |
| 알림 채널 | `<Slack 채널 / 이메일 / SMS>` |

> 배포 플랫폼(Vercel)의 함수 콜드스타트로 첫 응답이 느릴 수 있으니 타임아웃은 10초 이상으로.

---

## 2. DB 백업 & 복구

### 백업 현황 확인

- Supabase 대시보드 → Project `<프로젝트>` → **Database → Backups**
  - 플랜에 따라 **일 단위 자동 백업** 또는 **PITR(Point-in-Time Recovery)** 제공
  - 현재 플랜: `<Free / Pro / ...>` / 보관 기간: `<N일>`
- ⚠️ Free 플랜은 자동 백업 보관이 짧거나 없을 수 있다. 중요 데이터라면
  Pro 이상(또는 아래 수동 백업 병행)을 검토.

### 수동 백업 (선택)

```bash
# 전체 스키마 + 데이터 덤프 (연결 문자열은 Supabase → Settings → Database)
supabase db dump --db-url "<POSTGRES_CONNECTION_STRING>" -f backup_$(date +%Y%m%d).sql

# 또는 pg_dump 직접
pg_dump "<POSTGRES_CONNECTION_STRING>" > backup_$(date +%Y%m%d).sql
```

- 저장 위치: `<안전한 오브젝트 스토리지 / 사내 저장소>`
- 주기: `<주 1회 등>`

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
4. **공지**: `<상태 페이지 / 공지 채널>`에 인지 사실 알림
5. **사후(postmortem)**: 원인·타임라인·재발방지책을 아래 "변경 이력" 또는 별도 문서에 기록

### 관측 도구 링크

- Sentry: `https://<org>.sentry.io/` (org: `stronger`, project: `page0127`)
- Vercel: `<프로젝트 대시보드 URL>`
- Supabase: `<프로젝트 대시보드 URL>`
- Uptime 모니터: `<모니터 대시보드 URL>`

### 에스컬레이션

| 순위 | 담당 | 연락 |
| --- | --- | --- |
| 1차 | `<이름/역할>` | `<연락처>` |
| 2차 | `<이름/역할>` | `<연락처>` |

---

## 4. 정기 점검 (월 1회 권장)

- [ ] uptime 모니터가 살아있고 알림이 실제로 오는지 (일부러 실패시켜 테스트)
- [ ] Supabase 백업이 최신인지
- [ ] Sentry에 방치된 미해결 이슈가 쌓였는지
- [ ] 만료 임박한 키/토큰 확인 (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`)

---

## 변경 이력

| 날짜 | 내용 | 작성 |
| --- | --- | --- |
| 2026-07-23 | 런북 최초 작성 | - |
