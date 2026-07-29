# 고장을 고장으로 알아채기 — 스키마 drift 감지

- 작성일: 2026-07-29
- 범위: 백로그 1순위 3항목. 2026-07-29 사고의 재발 방지
- 선행: `00_docs/00_남은_작업_목록.md` 🚨 1순위

---

## 0. 한 줄 요약

배포된 코드가 기대하는 컬럼이 운영 DB에 없어도 **모든 페이지가 HTTP 200** 이었다. `/api/health` 가 스키마 계약까지 확인하게 만들고, CI 가 secret 의 길이가 아니라 **실제 연결**을 확인하게 했다. **사고를 로컬에서 재현해 잡히는 것을 확인했다.**

---

## 1. 사고 (2026-07-29)

트랙 F 코드는 배포됐는데 운영 DB에 마이그레이션이 안 올라갔다. `books.is_life_book` 을 읽는 조회가 전부 `42703 column does not exist` 로 죽었다.

**그런데 모든 페이지가 HTTP 200 이었다.** 운영 DB에 직접 쿼리를 던져보고서야 발견했다.

### 1.1 세 겹의 감시가 전부 통과시켰다

| 감시 | 무엇을 봤나 | 왜 놓쳤나 |
|---|---|---|
| 앱 화면 | — | 조회 실패를 삼키고 렌더를 계속한다 |
| `/api/health` | `profiles` 한 건 조회 | **`profiles` 는 멀쩡했다.** 죽은 건 `books` 다 |
| CI secrets 검사 | secret 의 **길이** | 값이 비지 않았으니 "정상". 실제로는 URL 과 키가 다른 프로젝트 것이라 DB에 전혀 못 닿았다 |

CI 가 DB에 못 닿는 상태에서 **E2E 8개 중 7개가 통과**했다. 앱이 조회 실패를 삼키기 때문이다.

> **"DB에 닿는가" 와 "배포된 코드가 기대하는 스키마가 거기 있는가" 는 다른 질문이다.** 전자만 물어서 후자를 놓쳤다.

---

## 2. 결정

| | 결정 | 근거 |
|---|---|---|
| 앱의 에러 삼킴 | **건드리지 않는다** | 화면이 안 깨지는 건 의도된 동작으로 본다. 대신 감시를 고친다(사용자 확인) |
| drift 검사 위치 | **`/api/health` 안** | CI 는 운영 DB를 못 본다(`check:non-production-db` 가드). health 는 이미 운영 자격증명으로 돌고 `uptime.yml` 이 5분마다 부른다 — **새 secret 이 필요 없다** |
| CI secrets | **실제 호출로 확인** | 길이는 "봉투가 비지 않았다" 이고, 우리가 알아야 하는 건 "열쇠가 맞는다" 다 |

---

## 3. 스키마 계약

`app/api/_helpers/schemaContract.ts` 에 **앱이 있다고 가정하는 컬럼**을 적어둔다.

```ts
export const SCHEMA_CONTRACT: SchemaProbe[] = [
  { table: 'books', columns: ['is_life_book', 'rating', 'is_public', 'read_count'],
    breaks: '책장·완독 목록·공개 서재 — 2026-07-29 사고가 난 자리' },
  { table: 'profiles', columns: ['username', 'nickname'],
    breaks: '로그인 후 모든 화면 (사용자 식별)' },
  { table: 'user_daily_visits', columns: ['visit_date', 'first_visit_at'],
    breaks: '재방문 계측 적재 (트랙 D-1)' },
];
```

**행을 보지 않고 에러 코드만 본다.** RLS 로 0건이 와도 컬럼이 있으면 에러가 없으므로 통과한다.

`42703`(컬럼 없음) · `42P01`(테이블 없음)만 계약 위반으로 센다. 연결 끊김이나 타임아웃은 `database` 체크가 따로 잡는다 — **일시적 오류마다 "스키마 drift" 로 오진하면 알림을 믿지 않게 된다.**

### 3.1 컬럼명을 기억으로 적었다가 오탐을 냈다

처음에 `user_daily_visits.visited_on` 이라고 적었다. **실제 컬럼은 `visit_date` 다.** 로컬에서 돌리자마자 `42703` 이 떠서 알았다.

마이그레이션 파일을 열어 고쳤고, 그 사실을 코드 주석에 남겼다:

> 컬럼명을 기억으로 적으면 이 검사 자체가 오탐을 낸다(실제로 한 번 냈다).

**감시 장치도 틀릴 수 있다.** 그래서 §5 에서 사고를 재현해 확인했다.

### 3.2 유지보수 비용

마이그레이션으로 컬럼을 추가하고 코드가 그걸 읽기 시작하면 **여기에 한 줄 넣어야 한다.** 자동이 아니다.

자동화하려면 운영의 `supabase_migrations.schema_migrations` 와 레포의 마이그레이션 파일을 비교해야 하는데, 그건 **운영 접근 권한이 있는 새 secret** 이 필요하고 CI 의 운영 격리 원칙과 충돌한다. 목록이 3줄이고 사고가 난 자리가 그중 하나라 지금은 수동이 낫다.

---

## 4. 바뀐 것

| 파일 | 변경 |
|---|---|
| `app/api/_helpers/schemaContract.ts` | 신규 — 계약 정의 + 검사 함수 |
| `app/api/_helpers/schemaContract.test.ts` | 신규 — 7개 |
| `app/api/health/route.ts` | 스키마 확인 추가. 위반 시 **503 + 무엇이 깨지는지** |
| `scripts/assert-supabase-reachable.mjs` | 신규 — PostgREST 루트 1회 호출 |
| `package.json` | `check:supabase-reachable` |
| `.github/workflows/ci.yml` | 위 스크립트를 E2E job 에 연결 |
| `.github/workflows/uptime.yml` | 기대 문자열 `"database":"ok"` → **`"schema":"ok"`**, 실패 원인 구분 |

### 4.1 `uptime.yml` 의 기대 문자열을 바꾼 이유

기존은 `"database":"ok"` 를 찾았다. **drift 상태에서도 `database` 는 `ok` 다** — 연결은 멀쩡하니까. HTTP 503 이라 실패는 하지만 원인이 로그에 안 드러난다.

`"schema":"ok"` 로 바꾸면 두 경우가 모두 잡히고, 실패 메시지가 원인을 구분해 알린다:

```
::error::스키마 drift — 배포된 코드가 기대하는 컬럼이 운영 DB에 없습니다.
::error::npx supabase migration list 로 미적용 마이그레이션을 확인하세요.
```

**새벽에 알림만 보고 무엇부터 봐야 할지 알아야 한다.**

---

## 5. 검증 — 사고를 재현했다

로컬 DB에서 사고 당시와 같은 상태를 만들었다.

```
$ docker exec supabase_db_0127 psql -U postgres -c \
    "alter table public.books drop column if exists is_life_book;"
ALTER TABLE
```

| | 결과 |
|---|---|
| 랜딩 `/` | **HTTP 200** ← 사고 당시 증상 그대로 |
| `/books/all` | **HTTP 200** ← 여전히 안 깨진다 |
| `/api/health` | **HTTP 503** ✅ |

응답 본문:

```json
{"status":"degraded","checks":{"database":"ok","schema":"drift"},
 "drift":[{"table":"books","code":"42703",
           "breaks":"책장·완독 목록·공개 서재 — 2026-07-29 사고가 난 자리"}]}
```

**화면은 200 인데 health 만 503** — 이것이 이번 작업의 전부다. 컬럼을 복구하니 `{"database":"ok","schema":"ok"}` / 200 으로 돌아왔다.

### 5.1 CI secrets 검사도 시험했다

| 경우 | 결과 |
|---|---|
| 정상 자격증명 | `연결 검사 통과 (HTTP 200)` ✅ |
| 키만 망가뜨림 (**사고 당시 상태**) | `키가 거부됐습니다 (HTTP 401)` ✅ |
| URL 이 없는 프로젝트 | `닿지 못했습니다: fetch failed` ✅ |

### 5.2 회귀

`tsc` 0 · 테스트 **228개 통과**(7개 추가) · 린트 통과.

---

## 6. 하지 않는 것

- **앱의 graceful degradation 제거** — 화면이 안 깨지는 건 의도로 본다(사용자 결정). 조회 실패 18곳의 `console.error` 도 그대로 둔다.
- **마이그레이션 목록 자동 비교** — 새 운영 secret 이 필요하고 CI 의 운영 격리와 충돌한다(§3.2).
- **E2E 가 DB 이상을 잡게 하기** — health 가 잡으므로 중복이다. E2E 는 화면 렌더만 본다.
- **`quality.yml` 손대기** — 이번 사고와 무관하다.

---

## 7. 남은 것

- 백로그 2순위(오픈 전 운영 검증) — 백업 복원·uptime 연결·Sentry 실수신·전체 시나리오. **코드로 대체할 수 없다.**
- `uptime.yml` 은 GitHub Actions cron 이라 5분이 보장되지 않는다(러너가 붐비면 10~20분). "몇 분 안에 반드시" 가 필요하면 전용 서비스가 필요하다 — 워크플로 주석에 이미 적혀 있다.
