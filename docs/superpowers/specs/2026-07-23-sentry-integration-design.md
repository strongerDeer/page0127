# Sentry 에러 모니터링 연동 — 설계

- 날짜: 2026-07-23
- 대상 앱: `apps/page0127`
- 배경: 현재 에러 모니터링이 전무하다(`console.error`만 사용). Vercel Hobby 플랜은 런타임 로그 보존 기간이 짧아, 프로덕션 에러를 놓치기 쉽다. Sentry 무료 티어로 프로덕션 에러 알림을 받는다.

## 결정 사항 (합의됨)

- **설치 방식**: 공식 마법사(`npx @sentry/wizard@latest -i nextjs`). 대화형이라 사용자가 직접 실행(계정 생성 포함), 이후 생성물을 정리·검증한다.
- **소스맵 업로드**: 포함(`withSentryConfig` + `SENTRY_AUTH_TOKEN`). 프로덕션 스택 트레이스를 원본 코드로 확인.
- **캡처 범위**: 에러만. 성능 추적(tracing)·세션 리플레이는 OFF(무료 티어 quota 절약 + 최소 구성).

## 진행 구조

이 단계는 "사용자 실행 → 정리·검증" 구조다. 마법사는 브라우저 로그인/계정 생성이 필요해 대신 실행할 수 없다.

### Phase 1 — 마법사 실행 (사용자)

- `apps/page0127`에서 `npx @sentry/wizard@latest -i nextjs`.
- SaaS(sentry.io) 선택 → 가입/로그인(무료) → Next.js 프로젝트 생성/선택.
- 마법사 생성물: `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.ts`의 `withSentryConfig` 래핑, 예제 페이지/API, `.env.sentry-build-plugin`(auth token; 자동 gitignore).

### Phase 2 — 정리 (Claude)

- 마법사가 활성화한 tracing/replay 비활성화: `tracesSampleRate: 0`, replay 통합 제거.
- 기존 `app/error.tsx`·`app/global-error.tsx`의 `console.error` 자리에 `Sentry.captureException(error)` 연결.
- 서버 컴포넌트 에러용 `onRequestError`가 `instrumentation.ts`에 연결됐는지 확인.
- DSN을 `NEXT_PUBLIC_SENTRY_DSN` 환경변수로 정리하고 `.env.example`에 추가.
- 소스맵 업로드가 `SENTRY_AUTH_TOKEN`이 있을 때만 실행되도록 설정 → 토큰 없는 CI 빌드가 깨지지 않게.
- 예제 페이지/API는 검증 후 제거.

### Phase 3 — 검증 (Claude + 사용자)

- 테스트 에러 발생 → Sentry 대시보드 도착 확인.
- 로컬 `npm run build`가 여전히 통과하는지 확인.
- 소스맵 원본 트레이스 최종 확인은 Vercel 프로덕션 배포 후.

## 필요한 환경변수

| 이름 | 성격 | 용도 |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | 공개 | 에러 전송 대상 |
| `SENTRY_AUTH_TOKEN` | 빌드 시크릿 | 소스맵 업로드 |
| `SENTRY_ORG` / `SENTRY_PROJECT` | 빌드 설정 | 소스맵 업로드 대상 |

## 리스크

- **Next.js 16 호환성**: Sentry Next.js SDK가 Next 16을 완전 지원하지 않을 수 있다. 마법사 실행 직후 **빌드 통과를 최우선으로 검증**하고, 실패 시 SDK 버전/설정으로 대응한다.

## 범위 밖 (YAGNI)

- 성능 추적, 세션 리플레이, 사용자 피드백 위젯, 릴리스 추적 자동화.
- CI에 Sentry 관련 잡 추가(빌드 단계에서 토큰 없이도 통과하는 것만 보장).
