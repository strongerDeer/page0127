# 📚 page0127 (페이지 읽다)

> **"책장을 보면, 그 사람이 보인다"**
>
> 독서 기록을 책장·통계·AI 취향 분석·소셜 피드로 연결한 개인 프로젝트

**Live**: [book-page0127.vercel.app](https://book-page0127.vercel.app/)

## 📖 프로젝트명 의미

**Page 0127** → **Page 읽 .** (페이지 읽다)

- `01` + `27` = `읽` (한글 조합)
- `.` = `dot` (닷)

## ✨ 핵심 기능

- 📖 **독서 기록 관리** — 도서 검색(알라딘 API)·등록, 완독 기록, 별점, 한줄평
- 🗄️ **개인 책장** — 완독 여부·인생 도서 기준으로 책 배치가 달라지는 책장 UI
- 📊 **독서 통계** — 연도별/월별 독서량, 카테고리 레이더 차트, 독서 목표 진행률
- 🤖 **AI 취향 분석** — 완독·별점 데이터 기반 독서 성향 분석·추천 도서 생성, 결과 DB 저장
- 🤝 **독서 궁합** — 두 사용자의 책장을 비교하는 AI 궁합 분석
- 👥 **소셜** — 공개 서재, 팔로우, 활동 피드(무한 스크롤), 좋아요, 댓글, 알림

## 🛠️ 기술 스택

### Frontend

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Server State**: TanStack Query v5
- **Charts**: Recharts

### Backend

- **Database / Auth**: Supabase (PostgreSQL, Google OAuth)
- **AI**: OpenAI API — 취향 분석·추천·독서 궁합
- **Book API**: 알라딘 도서 검색 API (서버 라우트에서 중계 + 캐시)

### DevOps

- **Monorepo**: Turborepo + pnpm workspace (`apps/page0127`, `packages/design-tokens`, `packages/icons`)
- **Deployment**: Vercel

## 📅 진행 상태

### 구현 완료

- 개인 책장, 도서 등록·수정·삭제, 완독·별점 기록
- 연도별/월별/카테고리/평점 통계 대시보드, 독서 목표 진행률
- AI 독서 취향 분석·추천 도서 생성, 독서 성향 타입 카탈로그, 독서 궁합
- 공개 서재, 팔로우, 활동 피드 무한 스크롤, 좋아요, 댓글, 알림
- SEO(메타데이터·sitemap), 키보드 내비게이션·스크린 리더 접근성

### 개선 중

- 알림 UX와 공개 범위 정책
- AI 분석 결과의 저장·비교 경험과 추천 설명 품질

## 📂 프로젝트 구조

```
0127/
├── apps/
│   └── page0127/            # Next.js 16 애플리케이션
├── packages/
│   ├── design-tokens/       # 디자인 토큰
│   └── icons/               # 아이콘 패키지
├── 00_docs/                 # 기획·스펙 문서 (PRD, 코드 컨벤션 등)
└── README.md
```

## 🚀 빠른 시작

```bash
# 1. Clone
git clone git@github.com:strongerDeer/page0127.git

# 2. Install
pnpm install

# 3. 환경 변수 — apps/page0127/.env.local 생성
#    (아래 키가 필요합니다)
#    NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
#    ALADIN_API_KEY / OPENAI_API_KEY
#    NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_GA_ID / CRON_SECRET

# 4. Run
pnpm dev
```

## 📖 문서

- [프로젝트 개요](00_docs/01_프로젝트_개요.md) — 비전, 목표, 차별화 포인트
- [핵심 기능](00_docs/02_핵심_기능.md) — 주요 기능 및 우선순위
- [기술 스택](00_docs/03_기술_스택.md) — 기술 선택 이유 및 대안
- [코드 컨벤션](00_docs/04_코드컨벤션.md) — 코딩 스타일 및 규칙

---

**Last Updated**: 2026-07-12
