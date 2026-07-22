# API 전역 레이트 리미팅

## 배경

전체 소스에서 레이트 리미팅(같은 사람이 짧은 시간에 너무 많이 요청하면 막는 장치) 관련 코드가 0건이다. [middleware.ts](../../../apps/page0127/middleware.ts)는 로그인 여부만 확인할 뿐, 요청 횟수는 전혀 세지 않는다.

특히 아래 3개 라우트는 호출할 때마다 외부 유료 API를 호출하는데, 스크립트로 반복 호출해도 막을 방법이 없다:

- `POST /api/taste-analysis/analyze` — OpenAI(`gpt-4o`) 호출
- `POST /api/compatibility/analyze` — OpenAI(`gpt-4o`) 호출
- `GET /api/books/search` — 알라딘 API 호출, **로그인조차 필요 없음**(비로그인 상태에서도 무제한 호출 가능)

그 외 책 CRUD, 팔로우, 알림 등 나머지 API는 외부 유료 API를 호출하지 않지만, DB 부하나 무한 스크롤 어뷰징을 막기 위해 느슨한 공통 제한은 필요하다.

### 관련 작업과의 관계

별도로 이미 설계된 [AI 분석 기능 월별 사용량 제한](./2026-07-22-ai-usage-limit-design.md) 문서가 있다(DB 테이블(`ai_usage_logs`)만 생성됐고 체크 로직은 아직 미구현). 그 작업은 "한 달에 3번까지만" 같은 **장기 사용량 상한**을 다루고, 이 문서는 "1분에 5번까지만" 같은 **순간 폭주 방지**를 다룬다. 두 메커니즘은 겹치지 않고 서로 보완한다 — 월별 제한만 있으면 카운트를 세는 도중 동시에 여러 요청이 몰려 들어와 제한을 우회하는 경쟁 상태(race condition)를 막지 못할 수 있는데, 이 문서의 레이트 리미팅이 그 구멍을 메운다. 월별 사용량 제한 자체의 구현은 이 스펙의 범위 밖이다.

## 목표

- `/api/*` 전체 라우트에 요청 빈도 제한을 건다.
- 외부 유료 API를 호출하는 라우트는 더 엄격하게, 나머지는 느슨하게 차등 적용한다.
- 새 API 라우트가 추가돼도 자동으로 보호되도록(라우트마다 빠뜨리지 않도록) 한 곳에서 일괄 적용한다.

## 범위

- 대상: `apps/page0127/middleware.ts`, `apps/page0127/src/shared/config/supabase/middleware.ts`, 신규 `apps/page0127/src/shared/lib/rate-limit/index.ts`, 신규 `supabase/migrations/`.
- 대상 밖: 월별 사용량 제한 구현(별도 스펙 참조), 결제/구독, `/api/cron/*`(이미 `CRON_SECRET`으로 보호되는 서버 간 호출이라 사용자 트래픽이 아님 — 제외 목록에 넣는다).

## 1. 레이트 리미팅이란 (용어 설명)

같은 사용자(또는 같은 IP)가 정해진 시간 안에 정해진 횟수 이상 요청하면 그 다음 요청부터는 거절하는 장치. 예: "1분에 5번까지만 허용, 6번째 요청부터는 429 응답으로 거절."

이 프로젝트는 Vercel에 배포되는데, Vercel의 서버리스 함수는 요청마다 다른 인스턴스가 처리할 수 있어 코드 안 변수(메모리)에 횟수를 저장하면 인스턴스마다 따로 세게 되어 무용지물이다. 그래서 모든 인스턴스가 공유해서 볼 수 있는 외부 저장소가 필요하다.

## 2. 저장소: Supabase Postgres (새 서비스 가입 없음)

처음엔 Upstash Redis(전용 카운터 저장소)를 검토했지만, "관리할 서비스를 늘리고 싶지 않다"는 사용자 의견에 따라 **이미 쓰고 있는 Supabase**에 테이블 하나를 추가하는 방식으로 바꿨다. 새 계정 가입도, 새 환경변수도 필요 없다.

새 테이블 `rate_limits`에 `(식별자, 1분 단위 시각)` 조합별로 요청 횟수를 기록한다. 동시에 여러 요청이 들어와도 Postgres의 `INSERT ... ON CONFLICT DO UPDATE`(UPSERT)가 행 잠금으로 순서를 보장해주므로 카운트가 누락되지 않는다.

- `increment_rate_limit(identifier, window_start)`: 카운트를 1 증가시키고 증가된 값을 반환하는 SQL 함수(RPC). 로그인 여부와 무관하게 호출해야 하므로(`books/search`는 비로그인도 호출) `anon`/`authenticated` 모두에게 실행 권한을 준다.
- 오래된 행 청소: 별도 cron 없이, `increment_rate_limit` 안에서 1000번에 1번 꼴로 확률적으로 1시간 지난 행을 지운다. cron 라우트·`vercel.json` 변경·`SUPABASE_SERVICE_ROLE_KEY` 의존을 추가로 만들지 않기 위한 선택이다.

## 3. 아키텍처 — 미들웨어에서 일괄 적용

기존 [supabase/middleware.ts](../../../apps/page0127/src/shared/config/supabase/middleware.ts)의 `updateSession()`은 매 요청마다 `supabase.auth.getUser()`를 호출해 로그인 여부를 확인한다(세션 갱신 목적). 이 함수가 `{ response, user, supabase }`를 반환하도록 바꿔서, 이미 확인한 로그인 정보와 이미 만든 Supabase 클라이언트를 레이트 리밋 체크에 그대로 재사용한다(클라이언트를 새로 만들 필요가 없다).

최상위 [middleware.ts](../../../apps/page0127/middleware.ts)에서:

```
요청 도착
  → updateSession(request) 호출 → { response, user, supabase } 받음
  → pathname이 '/api/'로 시작하는가?
      아니오 → response 그대로 반환 (기존과 동일)
      예    → '/api/cron/'으로 시작하는가?
                예 → 레이트 리밋 건너뛰고 response 반환
                아니오 → 티어 판별 → increment_rate_limit RPC 호출
                          → 초과 시: 429 응답 반환 (response 대신)
                          → 통과 시: response 반환
```

새 API 라우트를 추가해도 이 미들웨어를 거치므로 자동으로 보호된다 — 라우트마다 개별적으로 체크 코드를 넣을 필요가 없다.

## 4. 티어 & 제한값

고정 윈도우(fixed window — "1분 단위로 뚝뚝 끊어서" 그 안의 횟수만 센다) 방식을 쓴다. Redis의 슬라이딩 윈도우보다 정밀하진 않다(예: 0:59에 5번, 1:00에 다시 5번을 쏘면 2초 만에 10번이 통과하는 경계 우회가 이론상 가능하다). 하지만 Postgres UPSERT로 원자적 카운팅을 구현하기엔 고정 윈도우가 훨씬 단순하고, 이 프로젝트가 막으려는 건 "스크립트로 무한 반복 호출" 같은 명백한 어뷰징이라 이 정도 정밀도면 충분하다.

| 티어 | 대상 | 제한 (제안값, 실제 운영하며 조정 가능) |
|---|---|---|
| strict | `/api/taste-analysis/analyze`, `/api/compatibility/analyze`, `/api/books/search` | 5회 / 60초 |
| standard | 그 외 모든 `/api/*` | 60회 / 60초 |
| 제외 | `/api/cron/*` | 적용 안 함 |

## 5. 식별자

- 로그인 사용자: `user.id`
- 비로그인 사용자(예: `/api/books/search`는 로그인 없이도 호출 가능): 요청의 `x-forwarded-for` 헤더에서 얻은 IP (Vercel이 자동으로 붙여준다)

## 6. 컴포넌트 구성

신규 `apps/page0127/src/shared/lib/rate-limit/index.ts` 파일 하나:

- `checkApiRateLimit(request, user, supabase)`: pathname으로 제한값(strict=5/standard=60/제외=null) 판별 → 식별자(`user:<id>` 또는 `ip:<ip>`) 계산 → 현재 1분 구간을 `supabase.rpc('increment_rate_limit', ...)`로 증가시키고 반환된 값이 제한을 넘으면 429 `NextResponse`를, 아니면 `null`을 반환한다.

## 7. 예외 상황 처리

- **`increment_rate_limit` RPC 호출 자체가 실패했을 때** (DB 장애, 네트워크 문제 등): fail-open — 요청을 막지 않고 통과시키고 에러만 로그로 남긴다. 레이트 리밋 로직의 장애로 서비스 전체가 멈추는 걸 막기 위함이다.
- Supabase 접속 정보(`NEXT_PUBLIC_SUPABASE_URL` 등) 자체가 없는 경우는 별도로 다루지 않는다 — 이미 앱 전체가 그 환경변수 없이는 동작하지 않으므로(로그인 기능부터 깨진다), 레이트 리밋만의 예외 상황이 아니다.

## 8. 응답 형식

제한 초과 시 기존 [response.ts](../../../apps/page0127/app/api/_helpers/response.ts)의 에러 응답과 동일한 형식을 따른다: `{ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }`, HTTP 상태 코드 429, `Retry-After` 헤더(초 단위, 언제 다시 시도 가능한지 알려줌)를 포함한다.

## 9. 검증 방법

이 프로젝트는 자동화 테스트 프레임워크가 없으므로(기존 관례), 아래로 수동 검증한다:

1. `npm run type-check`, `npm run lint` 통과 확인
2. 개발 서버(`npm run dev`)에서 `curl`로 같은 엔드포인트를 6번 연속 호출 → 6번째에 429가 오는지 확인
3. `standard` 티어 라우트도 61번째 호출에서 429가 오는지 확인
4. Supabase Studio Table Editor에서 `rate_limits` 테이블에 실제로 행이 쌓이는지 눈으로 확인
