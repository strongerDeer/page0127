# 📚 나만의 디지털 책장 프로젝트

## 🎯 프로젝트 목표

### 주요 목표

1. **기술 습득**: React, Next.js, 모노레포, FSD 등 최신 프론트엔드 기술 스택 학습
2. **포트폴리오**: 이직을 위한 실무 수준의 프로젝트 완성
3. **협업 경험**: 코드 컨벤션, 린트 설정, CI/CD 등 실무 개발 프로세스 경험
4. **완성**: 1-2개월 내 MVP 배포 및 지속 가능한 코드베이스 구축

### 프로젝트 컨셉

- 읽은 책을 시각적으로 정리하는 개인 책장 서비스
- 독서 기록, 메모, 리뷰 작성 기능
- 알라딘 API를 통한 책 정보 자동 완성

---

## 🛠️ 기술 스택

### 📦 모노레포 & 아키텍처

```
├─ Turborepo           # 모노레포 관리
├─ FSD                 # Feature-Sliced Design 아키텍처
└─ TypeScript          # 타입 안정성
```

### 🎨 Frontend

```
├─ Next.js 14          # App Router (SSR/SSG)
├─ React Query         # 서버 상태 관리
├─ Zustand             # 클라이언트 상태 관리
├─ React Hook Form     # 폼 관리
├─ Zod                 # 스키마 검증
└─ PWA                 # Progressive Web App (선택)
```

### 🎭 UI/Design

```
├─ Tailwind CSS / Sass Module # CSS
├─ shadcn/ui                  # 디자인 시스템 패키지
└─ Storybook                  # 컴포넌트 문서화
```

### 🔧 개발 환경

```
├─ ESLint              # 코드 품질
├─ Prettier            # 코드 포맷팅
├─ Husky               # Git Hooks
├─ lint-staged         # 커밋 전 린트 체크
├─ Commitlint          # 커밋 메시지 규칙
├─ Jest (검토 중)        # 테스트 프레임워크
└─ MSW                 # API 모킹
```

### 🚀 DevOps & 배포

```
├─ GitHub Actions      # CI/CD 파이프라인
├─ Vercel              # 배포 플랫폼
├─ Sentry              # 에러 트래킹
├─ GA                  # Google Analytics (선택)
└─ Lighthouse CI       # 성능 모니터링
```

### 💾 Backend & API

```
├─ Supabase            # Auth + PostgreSQL + Storage
└─ 알라딘 책 검색 API   # 책 정보 자동 완성
```

---

## 📂 모노레포 구조

```
my-bookshelf/
├── apps/
│   └── web/                    # Next.js 메인 앱
│       ├── src/
│       │   ├── app/           # Next.js App Router
│       │   ├── features/      # FSD: 기능별 모듈
│       │   ├── entities/      # FSD: 비즈니스 엔티티
│       │   ├── shared/        # FSD: 공유 코드
│       │   └── widgets/       # FSD: 복합 UI 블록
│       └── public/
│
├── packages/
│   ├── ui/                     # 디자인 시스템
│   │   ├── components/        # shadcn/ui 기반 컴포넌트
│   │   └── .storybook/        # Storybook 설정
│   ├── tsconfig/              # 공통 TS 설정
│   └── eslint-config/         # 공통 린트 설정
│
├── turbo.json                 # Turborepo 설정
├── package.json               # Root package.json
└── README.md
```

---

## 🎯 핵심 기능 (MVP)

### Phase 1: 기본 기능 (Week 1-4)

- [ ] 소셜 로그인 (Google, GitHub)
- [ ] 책 검색 (알라딘 API 연동)
- [ ] 책 등록/수정/삭제
- [ ] 책 상태 관리 (읽은 책 / 읽는 중 / 읽고 싶은 책)
- [ ] 책장 UI (그리드 뷰)
- [ ] 독서 메모 작성

### Phase 2: 고도화 (Week 5-8)

- [ ] 책장 시각화 개선
- [ ] 독서 통계 대시보드
- [ ] 책 필터링/정렬
- [ ] PWA 설정 (선택)
- [ ] 성능 최적화

---

## 📅 개발 일정 (수정판 - 이직 최적화)

### Week 1-2: 최소 동작하는 버전 🚀

**목표**: Vercel에 배포된 로그인 가능한 앱

- [ ] Turborepo 모노레포 구조 생성
- [ ] Next.js + TypeScript 초기 설정
- [ ] ESLint, Prettier, Husky (기본만)
- [ ] Commitlint 설정
- [ ] Supabase 프로젝트 생성 및 Auth 설정 (Google 하나만)
- [ ] 책 1권 추가/삭제 가능한 간단한 UI
- [ ] Vercel 배포
- [ ] README 작성 (스크린샷, 실행 방법)

### Week 3-4: 핵심 기능 완성 (MVP) 📚

**목표**: 실제 사용 가능한 서비스

- [ ] FSD 구조로 프로젝트 구조화
- [ ] 알라딘 API 연동 (책 검색)
- [ ] 책 CRUD 기능 완성
- [ ] React Query로 데이터 페칭 설정
- [ ] shadcn/ui로 UI 개선
- [ ] 책 상태 관리 (읽는 중/완료/읽고 싶은)
- [ ] GitHub Actions CI 추가 (lint, build)
- [ ] 기본 책장 그리드 UI 구현

### Week 5-6: 완성도 높이기 ⚡

**목표**: 포트폴리오 경쟁력 강화

- [ ] 독서 통계 대시보드 (차트, 시각화)
- [ ] 책 필터링/정렬 기능
- [ ] 반응형 디자인 완성
- [ ] Sentry 에러 트래킹 연동
- [ ] 성능 최적화 (이미지 lazy loading, 코드 스플리팅)
- [ ] Zustand로 클라이언트 상태 관리
- [ ] 코드 정리 및 주석 추가
- [ ] README 업데이트 (기술 선택 이유, 아키텍처 설명)

### Week 7-8: 추가 기능 (선택) 🎁

**목표**: 시간 남으면 추가

- [ ] 디자인 시스템 패키지 분리 (packages/ui)
- [ ] Storybook 세팅 (선택)
- [ ] Jest/Vitest 주요 기능 테스트 (선택)
- [ ] PWA 설정 (선택)
- [ ] Lighthouse CI 설정
- [ ] 최종 리팩토링 및 문서화

---

## 📅 기존 개발 일정 (참고용 - 풀스펙)

<details>
<summary>전체 기능이 포함된 원래 계획 (클릭하여 펼치기)</summary>

### Week 1-2: 프로젝트 세팅 🔧

- [ ] Turborepo 모노레포 구조 생성
- [ ] Next.js + TypeScript 초기 설정
- [ ] ESLint, Prettier, Husky, lint-staged 설정
- [ ] Commitlint 설정
- [ ] 디자인 시스템 패키지 생성 (packages/ui)
- [ ] Storybook 세팅
- [ ] 기본 컴포넌트 5-10개 작성 (Button, Input, Card 등)
- [ ] Supabase 프로젝트 생성 및 Auth 설정

### Week 3-4: 핵심 기능 구현 (MVP) 📚

- [ ] FSD 구조로 프로젝트 구조화
- [ ] Supabase Auth 연동 (Google, GitHub 로그인)
- [ ] 알라딘 API 연동 (책 검색)
- [ ] React Query로 데이터 페칭 설정
- [ ] Zustand로 클라이언트 상태 관리
- [ ] React Hook Form + Zod로 책 등록 폼 구현
- [ ] 책 CRUD 기능 완성
- [ ] 기본 책장 UI 구현

### Week 5-6: 고도화 & 테스트 ⚡

- [ ] 책 필터링/정렬 기능
- [ ] 독서 통계 페이지
- [ ] MSW로 API 모킹 설정
- [ ] Jest (또는 Vitest) 테스트 코드 작성
- [ ] 책장 UI 개선 (애니메이션, 인터랙션)
- [ ] 반응형 디자인 최적화

### Week 7-8: 배포 & 마무리 🚀

- [ ] GitHub Actions CI/CD 설정
  - 린트 체크
  - 타입 체크
  - 테스트 자동화
- [ ] Lighthouse CI 설정
- [ ] Sentry 에러 트래킹 연동
- [ ] GA 분석 연동 (선택)
- [ ] PWA 설정 (선택)
- [ ] Vercel 배포
- [ ] README 작성 (프로젝트 소개, 기술 스택, 실행 방법)
- [ ] Storybook 배포

</details>

---

## 🎨 디자인 시스템 컴포넌트 (packages/ui)

### 기본 컴포넌트 (Week 1-2)

```
├─ Button
├─ Input
├─ Card
├─ Badge
├─ Dialog
├─ Select
├─ Textarea
└─ Toast
```

### 복합 컴포넌트 (Week 3-4)

```
├─ BookCard          # 책 카드
├─ BookGrid          # 책 그리드
├─ SearchBar         # 검색바
└─ StatCard          # 통계 카드
```

---

## 📊 데이터베이스 스키마 (Supabase)

### Users (Supabase Auth 기본 테이블 사용)

```sql
- id (uuid)
- email (text)
- created_at (timestamp)
```

### Books

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key -> auth.users)
- isbn (text)
- title (text)
- author (text)
- publisher (text)
- cover_image (text, URL)
- status (enum: 'reading', 'completed', 'wishlist')
- rating (integer, 1-5)
- memo (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### Reading_Logs (선택)

```sql
- id (uuid, primary key)
- book_id (uuid, foreign key -> books)
- user_id (uuid, foreign key -> auth.users)
- page (integer)
- note (text)
- created_at (timestamp)
```

---

## 📝 코드 컨벤션

### Commit Message (Conventional Commits)

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅 (동작 변경 없음)
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 파일 수정
```

### 브랜치 전략

```
main        # 배포 브랜치 (Vercel 자동 배포)
develop     # 개발 브랜치 (선택, 1인 개발이면 생략 가능)
feature/*   # 기능 개발 (예: feature/book-crud)
fix/*       # 버그 수정 (예: fix/login-redirect)
```

**추천**: 1인 개발이면 `main` + `feature/*` 브랜치만 사용

### 파일 네이밍

```typescript
// 컴포넌트: PascalCase
BookCard.tsx;
SearchBar.tsx;

// 유틸/훅: camelCase
useBooks.ts;
formatDate.ts;

// 상수: UPPER_SNAKE_CASE
API_ENDPOINTS.ts;
```

---

## 🎓 학습 목표 체크리스트

### 모노레포 & 아키텍처

- [ ] Turborepo 모노레포 구조 이해 및 구축
- [ ] FSD 아키텍처 패턴 적용
- [ ] 패키지 간 의존성 관리

### Frontend

- [ ] Next.js 14 App Router 활용
- [ ] React Query로 서버 상태 관리
- [ ] Zustand로 클라이언트 상태 관리
- [ ] React Hook Form + Zod 폼 검증

### UI/Design

- [ ] Tailwind CSS 활용
- [ ] shadcn/ui로 디자인 시스템 구축
- [ ] Storybook으로 컴포넌트 문서화

### 개발 환경

- [ ] ESLint, Prettier 코드 품질 관리
- [ ] Husky, lint-staged로 Git Hooks 자동화
- [ ] Commitlint로 커밋 메시지 규칙 적용
- [ ] Jest/Vitest 테스트 작성
- [ ] MSW로 API 모킹

### DevOps

- [ ] GitHub Actions CI/CD 파이프라인 구축
- [ ] Vercel 배포 자동화
- [ ] Sentry 에러 모니터링
- [ ] Lighthouse CI 성능 측정

### Backend

- [ ] Supabase Auth, DB, Storage 활용
- [ ] PostgreSQL 데이터베이스 설계
- [ ] RESTful API 통신 (알라딘 API)

---

## 🚀 시작하기

### 1단계: 프로젝트 생성

```bash
# Turborepo 초기화
npx create-turbo@latest
```

### 2단계: 패키지 설치

```bash
# Root에서
pnpm install
```

### 3단계: 개발 서버 실행

```bash
pnpm dev
```

---

## 📚 참고 자료

### 공식 문서

- [Next.js 14 문서](https://nextjs.org/docs)
- [Turborepo 문서](https://turbo.build/repo/docs)
- [FSD 문서](https://feature-sliced.design/)
- [Supabase 문서](https://supabase.com/docs)
- [shadcn/ui 문서](https://ui.shadcn.com/)

### 블로그/아티클

- [Turborepo로 모노레포 구축하기](https://turbo.build/repo/docs/getting-started/create-new)
- [FSD 아키텍처 적용 사례](https://feature-sliced.design/examples)
- [Next.js + Supabase 인증](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

## 💼 이직 관점의 우선순위 (중요!)

### ⭐️⭐️⭐️ Phase 1: 핵심만 빠르게 (Week 1-3)

**목표**: 동작하는 서비스를 빠르게 배포

```
✅ 필수 - 이것만으로도 충분히 어필됩니다
├─ Turborepo + Next.js 14 + TypeScript 세팅
├─ 기본 ESLint, Prettier, Husky 설정
├─ FSD 아키텍처 구조 (간단하게라도)
├─ Supabase Auth + 책 CRUD
├─ shadcn/ui로 깔끔한 UI
├─ GitHub Actions 기본 CI (lint, build)
└─ Vercel 배포 + 제대로 된 README
```

### ⭐️⭐️ Phase 2: 차별화 (Week 4-6)

**목표**: 실무 수준의 완성도

```
⚡ 여유 있으면 추가
├─ React Query + Zustand 상태관리
├─ 독서 통계 대시보드 (시각화)
├─ Sentry 에러 트래킹
├─ 반응형 디자인 완성도 높이기
└─ 코드 리팩토링 + 주석 정리
```

### ⭐️ Phase 3: 나중에 (Week 7-8)

**목표**: 추가 경쟁력 (선택)

```
⏳ 시간 남으면
├─ Storybook
├─ Jest/Vitest 테스트
├─ PWA
└─ GA
```

---

## 🎯 채용 담당자가 보는 포인트

### ✅ 중요한 것들 (우선순위 높음)

1. **배포된 실제 동작하는 서비스** ← 가장 중요
2. **깔끔한 README** (스크린샷, 기술 선택 이유, 실행 방법)
3. **일관된 커밋 히스토리** (conventional commits)
4. **현대적인 기술 스택** (Next.js 14, TypeScript)
5. **코드 품질** (린트, 포맷터, 타입 안정성)
6. **CI/CD 파이프라인** (자동화된 배포)

### ⚠️ 덜 중요한 것들 (시간 대비 효과 낮음)

1. Storybook ← MVP에선 선택사항
2. 테스트 커버리지 ← 있으면 좋지만 필수 아님
3. PWA ← 북마크 서비스에 필수는 아님
4. GA ← 포트폴리오에선 불필요

**핵심 원칙**:
```
✅ 완성도 높은 5개 기능 > 대충 만든 15개 기능
✅ 배포된 1개 서비스 > 로컬의 10개 프로젝트
✅ 깔끔한 README > 복잡한 문서
✅ 일관된 커밋 > 완벽한 테스트 커버리지
```

---

## 🤔 검토 중인 항목

### Jest vs Vitest

- **Jest**: 안정적, 레퍼런스 많음
- **Vitest**: 최신, Next.js 14와 궁합 좋음, 더 빠름
- **결정**: Week 5에 여유 있으면 Vitest 적용 (우선순위 낮음)

### PWA

- **포함 여부**: Week 7에 시간 여유 있으면 추가
- **우선순위**: 낮음 (핵심 기능 완성 후)

### GA (Google Analytics)

- **포함 여부**: 배포 직전 추가
- **우선순위**: 낮음 (Sentry가 더 중요)

### Storybook

- **포함 여부**: 디자인 시스템이 복잡해지면 추가
- **우선순위**: 낮음 (포트폴리오용으로는 과함)

---

## ✅ 프로젝트 성공 기준

### 필수 (Must Have)

- [x] 모노레포 구조로 프로젝트 완성
- [x] FSD 아키텍처 적용
- [x] 책 CRUD 기능 구현
- [x] Supabase 인증 및 DB 연동
- [x] 디자인 시스템 패키지화
- [x] Storybook 문서화
- [x] GitHub Actions CI/CD
- [x] Vercel 배포

### 선택 (Nice to Have)

- [ ] 테스트 코드 커버리지 50% 이상
- [ ] PWA 구현
- [ ] GA 연동
- [ ] Lighthouse 성능 점수 90+

---

---

## 🔧 Claude Code로 GitHub 관리하기

### 📝 커밋 작성

Claude Code가 자동으로 Conventional Commits 형식으로 작성해줍니다:

```bash
# 작업 완료 후
"커밋 작성해줘" 또는 "commit"

# Claude가 자동으로:
# 1. git status로 변경사항 확인
# 2. git diff로 코드 변경 분석
# 3. 적절한 커밋 메시지 생성
# 4. git add + git commit 실행
```

**예시**:
```
feat: 알라딘 API 책 검색 기능 추가

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### 🎫 이슈 생성

```bash
# Claude에게 요청
"GitHub 이슈 만들어줘: 책 필터링 기능 추가"

# 또는 gh CLI 사용
gh issue create --title "책 필터링 기능 추가" \
  --body "독서 상태별로 책을 필터링하는 기능이 필요합니다."
```

### 🔀 PR (Pull Request) 생성

```bash
# 1. feature 브랜치에서 작업 완료 후
"PR 생성해줘"

# Claude가 자동으로:
# 1. git log로 커밋 히스토리 분석
# 2. git diff main...HEAD로 전체 변경사항 확인
# 3. PR 제목과 본문 생성
# 4. gh pr create 실행
```

**Claude가 생성하는 PR 형식**:
```markdown
## Summary
- 책 CRUD 기능 추가
- 알라딘 API 연동
- React Query로 데이터 페칭

## Test plan
- [ ] 책 추가 기능 테스트
- [ ] 책 수정 기능 테스트
- [ ] 책 삭제 기능 테스트

🤖 Generated with Claude Code
```

### 📋 이슈 관리 워크플로우

```bash
# 1. 이슈 생성
gh issue create --title "feat: 독서 통계 대시보드" \
  --label "feature" --label "enhancement"

# 2. 브랜치 생성 및 작업
git checkout -b feature/reading-stats

# 3. 커밋 (Claude에게 요청)
"커밋 작성해줘"

# 4. PR 생성 (Claude에게 요청)
"PR 생성해줘"

# 5. 이슈 자동 닫기 (커밋 메시지에 포함)
feat: 독서 통계 대시보드 추가

Close #3

🤖 Generated with Claude Code
```

### 🏷️ 라벨 활용

```bash
# 프로젝트 시작 시 라벨 설정
gh label create "feature" --color "0075ca" --description "새로운 기능"
gh label create "bug" --color "d73a4a" --description "버그 수정"
gh label create "enhancement" --color "a2eeef" --description "기능 개선"
gh label create "docs" --color "0075ca" --description "문서 작업"
gh label create "refactor" --color "fbca04" --description "리팩토링"
```

### 💡 팁

1. **작업 시작 전**: Issue 먼저 생성
2. **작업 중**: 자주 커밋 (Claude가 알아서 정리)
3. **작업 완료**: PR 생성 + 자기 리뷰 코멘트 달기
4. **Merge 후**: 브랜치 삭제

**혼자 개발해도 Issue/PR 사용하는 이유**:
- 계획적으로 개발하는 모습 어필
- 변경사항 추적 용이
- 협업 능력 증명

---

## 📞 문의 및 피드백

이 문서는 프로젝트 진행 중 업데이트됩니다.

**마지막 수정일**: 2025-11-25
