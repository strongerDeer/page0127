# 📚 Page 0127 (페이지 읽다)

> 개인 독서 기록 관리 및 시각화 서비스
>
> **"당신의 책장을 기록하세요"**

## 📖 프로젝트명 의미

**Page 0127** → **Page 읽 .** (페이지 읽다)

- `01` + `27` = `읽` (한글 조합)
- `.` = `dot` (닷)

## ✨ 핵심 기능

- 📖 **독서 기록 관리** - 읽은 책 기록, 별점, 한줄평
- 📊 **통계 시각화** - 월별 독서량, 카테고리별 차트, 독서 진행률
- 🤖 **AI 취향 분석** - OpenAI 기반 개인 독서 성향 분석 (Phase 2)
- 👥 **소셜 네트워크** - 팔로우, 피드 기능 (Phase 3)

## 🛠️ 기술 스택

### Frontend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **HTTP Client**: axios
- **State**: React Query (서버 상태, 예정) + Zustand (클라이언트 상태)
- **Charts**: Recharts (Phase 1 통계 차트)

### Backend

- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth)
- **AI**: OpenAI API (GPT-4) - Phase 2
- **Book API**: 알라딘 도서 검색 API

### DevOps

- **Monorepo**: Turborepo
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions
- **Testing**: Playwright (E2E) - Phase 5

## 📅 개발 로드맵

### Phase 1: MVP (Week 1-6) 🚀

**개인 독서 기록 + 통계 시각화**

- [x] 사용자 인증 (Google OAuth)
- [x] 책 검색 및 등록 (알라딘 API)
- [x] 독서 기록 CRUD (RESTful API 구조)
- [x] 개인 책장 (상태별 탭, 정렬)
- [x] 공통 Header 컴포넌트
- [ ] 독서 통계 대시보드 ⭐
  - [x] 총 권수/쪽수 통계 카드
  - [ ] 월별 독서량 차트
  - [ ] 카테고리별 레이더 차트
  - [ ] 독서 진행률 (연간 목표)
- [ ] 개인 책장 고급 기능
  - [ ] 필터링 (장르별, 별점별, 연도별)
  - [ ] 검색 (내 책장 내)
- [ ] 기본 프로필

### Phase 2: AI 취향 분석 (Week 7-10) 🤖

**선택적 AI 분석 기능**

- [ ] OpenAI 취향 분석 (성향, 장르)
- [ ] AI 책 추천
- [ ] 월 3회 무료 제한

### Phase 3: 소셜 네트워크 (Week 11-14) 👥

**선택적 SNS 기능**

- [ ] 팔로우/팔로워 시스템
- [ ] 피드 (타임라인)
- [ ] 댓글 & 좋아요
- [ ] 알림 시스템

### Phase 4: 고급 통계 (Week 15-18) 📊

**장기 사용 동기 부여**

- [ ] 독서 캘린더 (GitHub 히트맵)
- [ ] 독서 챌린지 & 뱃지
- [ ] 연간 독서 리포트 (PDF)

### Phase 5: 폴리싱 (Week 19-22) ✨

**완성도 향상**

- [ ] UI/UX 개선 & 애니메이션
- [ ] 성능 최적화
- [ ] 반응형 디자인 완성
- [ ] 다크 모드 (선택)

## 📂 프로젝트 구조

```
project/
├── 00_docs/                 # 프로젝트 문서
│   ├── 01_프로젝트_개요.md
│   ├── 02_핵심_기능.md
│   ├── 03_기술_스택.md
│   └── 04_코드컨벤션.md
├── apps/
│   └── web/                 # Next.js 16 애플리케이션
├── packages/
│   └── design-token/        # 디자인 토큰
└── README.md
```

## 🚀 빠른 시작

```bash
# 1. Clone
git clone git@github.com:strongerDeer/book_project.git

# 2. Install
pnpm install

# 3. Setup
cp apps/web/.env.example apps/web/.env.local

# 4. Run
pnpm dev
```

## 📖 문서

- [프로젝트 개요](00_docs/01_프로젝트_개요.md) - 비전, 목표, 차별화 포인트
- [핵심 기능](00_docs/02_핵심_기능.md) - 주요 기능 및 우선순위
- [기술 스택](00_docs/03_기술_스택.md) - 기술 선택 이유 및 대안
- [코드 컨벤션](00_docs/04_코드컨벤션.md) - 코딩 스타일 및 규칙

---

**Last Updated**: 2025-12-08
