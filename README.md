# 📚 독서 취향 분석 플랫폼

> AI 기반 개인 독서 관리 및 취향 분석 SNS 플랫폼
>
> **"당신의 독서 DNA를 발견하세요"**

## ✨ 핵심 기능

- 📖 **독서 기록 관리** - 읽은 책 기록, 별점, 한줄평
- 🤖 **AI 취향 분석** - OpenAI 기반 개인 독서 성향 분석
- 👥 **소셜 네트워크** - 비슷한 취향의 독서가 매칭 및 팔로우
- 📊 **독서 통계** - 연간 독서 리포트, 장르별 분석
- 🏆 **독서 챌린지** - 목표 설정 및 뱃지 획득

## 🛠️ 기술 스택

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Sass + shadcn/ui
- **State**: React Query + Zustand

### Backend

- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth)
- **AI**: OpenAI API (GPT-4)
- **Book API**: 알라딘 도서 검색 API

### DevOps

- **Deployment**: Vercel
- **CI/CD**: GitHub Actions
- **Testing**: Playwright (E2E)

## 📅 개발 로드맵

### Phase 1: MVP (Week 1-4) 🚀

- [x] 사용자 인증 (Google)
- [ ] 책 검색 및 등록 (알라딘 API)
- [ ] 독서 기록 CRUD
- [ ] 개인 책장 페이지
- [ ] 기본 프로필

### Phase 2: 소셜 (Week 5-8) 👥

- [ ] 팔로우/팔로워 시스템
- [ ] 피드 (타임라인)
- [ ] 댓글 & 좋아요
- [ ] 알림 시스템

### Phase 3: AI (Week 9-12) 🤖

- [ ] OpenAI 취향 분석
- [ ] 취향 비교 기능
- [ ] AI 책 추천

### Phase 4: 고급 기능 (Week 13+) 📊

- [ ] 독서 통계 & 차트
- [ ] 독서 챌린지
- [ ] 랭킹 시스템
- [ ] 독서 캘린더

## 📂 프로젝트 구조

```
project/
├── docs/                    # 프로젝트 문서
│   ├── 01_프로젝트_개요.md
│   ├── 02_핵심_기능.md
│   └── 03_기술_스택.md
├── src/                     # (개발 시작 후 추가)
└── README.md
```

## 🚀 빠른 시작

```bash
# (개발 시작 후 업데이트 예정)
# 1. Clone
git clone git@github.com:strongerDeer/book_project.git

# 2. Install
npm install

# 3. Setup
cp .env.example .env.local

# 4. Run
npm run dev
```

## 📖 문서

- [프로젝트 개요](docs/01_프로젝트_개요.md) - 비전, 목표, 차별화 포인트
- [핵심 기능](docs/02_핵심_기능.md) - 주요 기능 및 우선순위
- [기술 스택](docs/03_기술_스택.md) - 기술 선택 이유 및 대안

## 📝 참고 분석

- [밀리의 서재 분석](docs/99_밀리의서재_분석.md) - 관련 자료 분석 보고서

---

**Last Updated**: 2025-11-25
