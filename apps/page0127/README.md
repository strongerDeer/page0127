# page0127

프로젝트 전체 소개는 [루트 README](../../README.md) 참고. 이 문서는 이 앱을 로컬에서 실행·개발할 때 필요한 정보만 다룸.

## 개발 서버 실행

```bash
pnpm dev
```

## 스크립트

```bash
pnpm lint          # eslint
pnpm lint:fix       # eslint --fix
pnpm format         # prettier --write
pnpm format:check   # prettier --check
pnpm type-check     # tsc --noEmit
pnpm analyze        # 번들 분석 (next experimental-analyze)
```

## 환경 변수

`apps/page0127/.env.local`에 아래 값 필요.

```bash
# 공개 — 클라이언트에서 사용
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GA_ID=

# 서버 전용 — NEXT_PUBLIC_ 접두사 금지 (붙는 순간 클라이언트 번들에 노출됨)
ALADIN_API_KEY=
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

## 폴더 구조 (FSD)

```
app/                # Next.js App Router (라우트·레이아웃)
src/
├── widgets/        # 페이지를 구성하는 큰 단위 UI (대시보드, 공개 서재 등)
├── features/       # 사용자 행동 단위 기능 (검색, 좋아요 등)
├── entities/       # 도메인 모델 (책, 유저 등)
└── shared/         # 공통 UI·유틸·설정
docs/               # 이 앱에서만 참고하는 세부 문서 (예: cron 정리 로직)
```

프로젝트 전체 기획·진행 상황 문서는 루트 [00_docs/](../../00_docs/) 참고.
