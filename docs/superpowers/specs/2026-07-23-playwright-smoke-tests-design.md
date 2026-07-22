# Playwright 공개 플로우 Smoke Test — 설계

- 날짜: 2026-07-23
- 대상 앱: `apps/page0127`
- 배경: 이 프로젝트에는 자동화 테스트 프레임워크가 전무했다. 런칭 전 "최소한의 핵심 플로우"만 다루는 첫 E2E smoke test를 도입한다.

## 핵심 제약

- **로그인은 Google OAuth 전용**(`supabase.auth.signInWithOAuth({ provider: 'google' })`). 실제 Google 로그인은 CI/자동화에서 봇 탐지·2FA·약관 문제로 자동화가 불가능하다.
- 따라서 **인증이 필요 없는 공개 플로우만** 검증한다. (인증 플로우는 향후 별도 단계에서 세션 주입 방식으로 다룬다.)

## 범위 (합의됨)

- 시나리오 4개 (공개, 미인증)
- **로컬 실행 우선** — CI 워크플로 연동은 이번 범위에서 제외(향후 별도 단계)

## 검증 시나리오

| # | 시나리오 | 기대 |
|---|---------|------|
| 1 | `/` 랜딩 로드 | 200, 핵심 콘텐츠 렌더 |
| 2 | `/login` 로드 | Google 로그인 버튼 노출 |
| 3 | 미인증으로 보호 라우트(`/settings`) 접근 | `/login`으로 리다이렉트 |
| 4 | 미인증으로 공개 예외(`/books/all`) 접근 | 리다이렉트 없이 로드 |

> 3·4번은 `middleware.ts`의 리다이렉트/`PUBLIC_EXCEPTIONS` 로직을 직접 검증한다. 이후 middleware→proxy 마이그레이션 단계의 회귀 안전망 역할도 겸한다.

## 기술 구성

- `@playwright/test`를 `apps/page0127`의 devDependency로 추가.
- 테스트 위치: `apps/page0127/e2e/*.spec.ts`.
- `playwright.config.ts`:
  - `testDir: 'e2e'`
  - `webServer`: `next dev`를 포트 **3100**으로 기동. 공개 페이지 렌더링·미들웨어 확인엔 프로덕션 빌드가 불필요하므로 dev로 단순화. `reuseExistingServer`는 로컬에서만 true.
  - `baseURL: http://localhost:3100`
  - 브라우저: chromium 1개 (smoke엔 충분).
- dev 서버 기동에 필요한 환경변수: **공개** 값인 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`뿐. (anon 키는 브라우저에 노출되는 공개 값이라 비밀이 아니다.) `.env.local`에서 자동 로드된다. OpenAI 키는 공개 페이지가 참조하지 않아 불필요.
- 스크립트(`apps/page0127/package.json`): `test:e2e`(playwright test), `test:e2e:ui`(--ui).
- 리포트/아티팩트(`playwright-report/`, `test-results/`)는 이미 루트 `.gitignore`에 포함됨.

## 범위 밖 (YAGNI)

- 인증이 필요한 플로우(책 등록/삭제 등) — 세션 주입 설계가 별도로 필요.
- CI 워크플로 e2e 잡 — 향후 별도 단계.
- 멀티 브라우저/모바일 뷰포트, 시각 회귀, 커버리지 목표.
