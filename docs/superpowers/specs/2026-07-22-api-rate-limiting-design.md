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

- 대상: `apps/page0127/middleware.ts`, `apps/page0127/src/shared/config/supabase/middleware.ts`, 신규 `apps/page0127/src/shared/lib/rate-limit/` 디렉터리.
- 대상 밖: 월별 사용량 제한 구현(별도 스펙 참조), 결제/구독, `/api/cron/*`(이미 `CRON_SECRET`으로 보호되는 서버 간 호출이라 사용자 트래픽이 아님 — 제외 목록에 넣는다).

## 1. 레이트 리미팅이란 (용어 설명)

같은 사용자(또는 같은 IP)가 정해진 시간 안에 정해진 횟수 이상 요청하면 그 다음 요청부터는 거절하는 장치. 예: "1분에 5번까지만 허용, 6번째 요청부터는 429 응답으로 거절."

이 프로젝트는 Vercel에 배포되는데, Vercel의 서버리스 함수는 요청마다 다른 인스턴스가 처리할 수 있어 코드 안 변수(메모리)에 횟수를 저장하면 인스턴스마다 따로 세게 되어 무용지물이다. 그래서 모든 인스턴스가 공유해서 볼 수 있는 외부 저장소가 필요하다.

## 2. 저장소: Upstash Redis

카운트를 저장할 곳으로 [Upstash](https://upstash.com)의 Redis(무료 티어)를 쓴다. HTTP(REST) 기반이라 Next.js 미들웨어(Edge 런타임)에서도 그대로 동작한다. `@upstash/ratelimit` + `@upstash/redis` 패키지를 사용한다.

**사용자가 직접 해야 할 일** (Claude가 대신할 수 없음):
1. [upstash.com](https://upstash.com)에서 무료 계정 생성 후 Redis 데이터베이스 하나 생성
2. 발급된 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`을 `.env.local`에 추가
3. 같은 값을 Vercel 프로젝트의 환경변수에도 추가 (배포 환경용)

이 계정 생성/환경변수 설정은 구현 계획의 별도 단계로 명시하고, 진행 중 사용자가 직접 값을 넣을 때까지 기다린다.

## 3. 아키텍처 — 미들웨어에서 일괄 적용

기존 [supabase/middleware.ts](../../../apps/page0127/src/shared/config/supabase/middleware.ts)의 `updateSession()`은 매 요청마다 `supabase.auth.getUser()`를 호출해 로그인 여부를 확인한다(세션 갱신 목적). 이 함수가 `{ response, user }`를 반환하도록 바꿔서, 이미 확인한 로그인 정보를 레이트 리밋 식별자로 재사용한다.

최상위 [middleware.ts](../../../apps/page0127/middleware.ts)에서:

```
요청 도착
  → updateSession(request) 호출 → { response, user } 받음
  → pathname이 '/api/'로 시작하는가?
      아니오 → response 그대로 반환 (기존과 동일)
      예    → '/api/cron/'으로 시작하는가?
                예 → 레이트 리밋 건너뛰고 response 반환
                아니오 → 티어 판별 → rate limit 체크
                          → 초과 시: 429 응답 반환 (response 대신)
                          → 통과 시: response 반환
```

새 API 라우트를 추가해도 이 미들웨어를 거치므로 자동으로 보호된다 — 라우트마다 개별적으로 체크 코드를 넣을 필요가 없다.

## 4. 티어 & 제한값

슬라이딩 윈도우(요청 시각을 기준으로 최근 N초를 계속 이동하며 세는 방식 — 정각 경계를 노린 우회가 fixed window보다 어렵다) 알고리즘을 쓴다.

| 티어 | 대상 | 제한 (제안값, 실제 운영하며 조정 가능) |
|---|---|---|
| strict | `/api/taste-analysis/analyze`, `/api/compatibility/analyze`, `/api/books/search` | 5회 / 60초 |
| standard | 그 외 모든 `/api/*` | 60회 / 60초 |
| 제외 | `/api/cron/*` | 적용 안 함 |

## 5. 식별자

- 로그인 사용자: `user.id`
- 비로그인 사용자(예: `/api/books/search`는 로그인 없이도 호출 가능): 요청의 `x-forwarded-for` 헤더에서 얻은 IP (Vercel이 자동으로 붙여준다)

## 6. 컴포넌트 구성

신규 `apps/page0127/src/shared/lib/rate-limit/`:

- `index.ts`: `strictLimiter`, `standardLimiter` 두 개의 `Ratelimit` 인스턴스 생성 + `getIdentifier(request, user)` 헬퍼(로그인 유저 id 또는 IP 반환) + `getTier(pathname)` 헬퍼(strict/standard/skip 반환)

## 7. 예외 상황 처리

- **로컬 개발 환경에서 Upstash 환경변수가 없을 때**: 레이트 리밋을 건너뛰고 콘솔에 경고 로그만 남긴다. Upstash 가입 전에도 로컬 개발이 막히지 않게 하기 위함이다.
- **Upstash 자체에 장애가 났을 때**: fail-open — Redis 호출이 실패하면 요청을 막지 않고 통과시키고 에러만 로그로 남긴다. 레이트 리밋 인프라 장애로 서비스 전체가 멈추는 걸 막기 위함이다.

## 8. 응답 형식

제한 초과 시 기존 [response.ts](../../../apps/page0127/app/api/_helpers/response.ts)의 에러 응답과 동일한 형식을 따른다: `{ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }`, HTTP 상태 코드 429, `Retry-After` 헤더(초 단위, 언제 다시 시도 가능한지 알려줌)를 포함한다.

## 9. 검증 방법

이 프로젝트는 자동화 테스트 프레임워크가 없으므로(기존 관례), 아래로 수동 검증한다:

1. `npm run type-check`, `npm run lint` 통과 확인
2. 개발 서버(`npm run dev`)에서 `curl`로 같은 엔드포인트를 6번 연속 호출 → 6번째에 429가 오는지 확인
3. `standard` 티어 라우트도 61번째 호출에서 429가 오는지 확인
4. Upstash 환경변수를 잠시 지운 상태로 API 호출 → 정상 통과(fail-open) 확인
