# 디자인 시스템 전면 개편 설계

> 작성일: 2026-05-28
> 대상 앱: `apps/page0127` (독서 기록 소셜 앱)
> 목표: 일관성 있는 화이트 배경 · 차분한 파스텔 톤 · 과한 그림자 제거 · 레이아웃 정비

---

## 1. 배경 및 목표

현재 [globals.css](../../../apps/page0127/app/globals.css)는 일관성이 깨져 있다.

- `body`에 blue/purple/pink **그라데이션 메시 배경** + **글래스모피즘** 유틸(`--glass-*`)이 깔려 있어 "과한" 인상을 준다.
- primary 색이 3곳에서 다르게 정의됨: `#3B82F6`, `#ffd700`, oklch 무채색 — 서로 충돌.
- `packages/design-tokens`(sky-blue 팔레트 + gray scale + spacing/radius)는 잘 만들어져 있으나 globals.css에 연결되지 않아 **실제로 쓰이지 않는다**.

### 확정된 방향 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| 전체 톤 | **차분한 미니멀** — 흰 카드 + 얇은 회색 테두리, 파스텔은 강조에만 소량 |
| 강조색 | **인디고 / 바이올렛** (`#6366f1` 계열) |
| 배경색 | **옅은 회색 `#fafafa`** (body) + 흰색 카드 |
| 레이아웃 | **좌측 사이드바** (데스크톱) / **하단 탭바** (모바일) |
| 토큰 전략 | **globals.css를 단일 소스로 통일** (shadcn CSS 변수 방식) |
| 진행 방식 | 기반 → 셸 → 페이지 단계별, 각 단계마다 확인 |

### 비목표 (YAGNI)

- 다크 모드 신규 구현 (기존 `.dark` 변수는 유지하되 이번 작업의 검증 대상 아님)
- design-tokens 패키지의 Style Dictionary 빌드 파이프라인 연동 (학습 부담 회피)
- 페이지 단위 기능 변경 (스타일/배치만 변경, 로직 보존)

---

## 2. 디자인 토큰 정리 — `globals.css` 단일 소스화

### 제거 대상

- `body`의 그라데이션 메시 배경 (현재 L124-130)
- 글래스모피즘 유틸 `--glass-border` / `--glass-bg` / `--glass-shadow` (L70-72)
- 충돌하는 primary 정의 3종 (`--color-primary` `#3B82F6`, `@theme`의 `#ffd700`, oklch 무채색)

### 신규 정의

- **배경**: `body { background: #fafafa; }` — 그라데이션/`background-image`/`background-attachment` 전부 제거. 단색.
- **카드**: 흰색 `#ffffff` + `1px solid` 회색 테두리(`--border`)로 구분 (그림자 의존 X)
- **강조색 토큰** (shadcn 변수에 인디고 매핑):
  - `--primary: #6366f1` (indigo-500), `--primary-foreground: #ffffff`
  - hover 상태: `#4f46e5` (indigo-600)
  - `--ring: #6366f1`
  - `--accent: #eef2ff` (indigo-50, 활성 메뉴/호버 배경), `--accent-foreground: #4338ca`
- **차트 색** `--chart-1~5`: 인디고를 메인으로 + 보조 파스텔(연보라·민트·앰버·로즈)로 재정의해 시각적 통일
- **상태색은 강조색과 독립적으로 항상 유지**:
  - success `#10b981` / error `#ef4444` / warning `#f59e0b` (코어 토큰 값 기준)

### design-tokens 패키지 처리

- 패키지는 **"색값의 기준 문서"로만 유지**한다. 죽이지 않는다.
- globals.css에 인디고 팔레트를 직접 반영하되, 각 값 출처를 주석으로 명시 (예: `/* indigo-500 — design-tokens 기준 */`).
- 단, 현재 design-tokens의 primary는 sky-blue(`#0ea5e9`)이므로, **light.json의 action.primary 참조를 인디고 계열로 갱신**하여 문서와 실제 적용을 일치시킨다. (core.json에 indigo 팔레트 추가 또는 primary 팔레트 값 교체)

---

## 3. 그림자 · 모서리 · 간격 정책

"과한 쉐도우 금지"를 토큰 레벨에서 강제하는 규칙.

### 그림자 — 딱 2단계만

| 단계 | 용도 |
|---|---|
| 그림자 없음 | 기본 카드/패널 — **테두리로만** 구분 |
| `shadow-sm` | 떠 있는 요소만 (드롭다운, 팝오버, 모달, 토스트) |

그 이상의 그림자(`shadow-md` 이상, 컬러 그림자) 사용 금지.

### 모서리 (`--radius` 기준)

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-lg` | 12px | 카드 |
| `radius-md` | 8px | 버튼, 인풋 |
| `radius-full` | 9999px | 아바타, 뱃지 |

### 간격

- 코어 토큰 스케일 사용: 4 / 8 / 16 / 24 / 32 / 48px
- 카드 내부 패딩 **16px 통일**

---

## 4. 사이드바 셸 (반응형)

`(protected)` 레이아웃을 기존 상단 헤더에서 사이드바 셸로 교체한다.

### 구조

- 신규 위젯 `widgets/AppShell` (사이드바 + 콘텐츠 영역 컴포지션). 내부에 `Sidebar`, `BottomTabBar` 분리.
- **데스크톱 (`md` 이상)**: 좌측 고정 사이드바
  - 상단 로고 → 메뉴 목록 → 하단 프로필/알림
  - 활성 항목: 인디고 배경(`--accent` `#eef2ff`) + 인디고 텍스트(`#4338ca`)
- **모바일 (`md` 미만)**: 사이드바 숨김 → 하단 고정 탭바로 전환

### 메뉴 구성 (확정)

홈/피드 · 내 서재 · 통계 · 검색 · 알림 · 설정

### 기존 로직 이전

- [Header](../../../apps/page0127/src/widgets/Header/ui/Header.tsx)의 인증 체크, 프로필 조회(`getProfile`), 알림 드롭다운(`HeaderClient`), 프로필 드롭다운(`ProfileDropdown`) 로직을 셸로 이전한다. **기능 동일 유지, 배치만 변경.**
- Server Component 우선 원칙 유지: 셸 골격은 Server Component, 상호작용(모바일 토글 등)만 Client Component로 분리.

---

## 5. 마이그레이션 순서 (단계별 — 각 단계 사용자 확인)

### 1단계: 토큰 / 테마 기반

- globals.css 정리 (2·3절 적용)
- 공유 UI 컴포넌트 인디고 반영 점검: `button`, `card`, `badge`, `input`, `select`, `switch`, `progress`, `skeleton` 등 `shared/ui/`
- design-tokens light.json / core.json 인디고 갱신

### 2단계: 셸

- `widgets/AppShell` + `Sidebar` + `BottomTabBar` 신규 작성
- `(protected)/layout.tsx`를 헤더 → 셸로 교체
- 인증/프로필/알림 로직 이전 후 동작 확인

### 3단계: 페이지 마이그레이션 (하나씩)

순서: `dashboard` → `books`(목록/추가/상세) → `feed` → `search` → `settings` → `notifications` → `dashboard/taste-analysis` → public `[username]`

각 페이지: 카드/간격/그림자/강조색을 새 토큰에 맞춰 정리. 기능 변경 없음.

---

## 6. 컴포넌트 경계 및 검증

### 단위와 책임

- **globals.css** — 색·반경·그림자의 단일 진실 공급원. 컴포넌트는 여기 정의된 변수/Tailwind 클래스만 참조.
- **AppShell** — 레이아웃 골격. 페이지는 셸 내부에 들어갈 콘텐츠만 책임.
- **shared/ui/** — 시각 토큰을 소비하는 프리미티브. 개별 페이지가 색을 하드코딩하지 않도록 여기서 흡수.

### 검증 방법

- 각 단계 후 `npm run dev`로 해당 화면 육안 확인 + 사용자 승인
- 그림자 정책 위반(인라인 box-shadow, `shadow-md` 이상) / 하드코딩 색상(`#3B82F6` 등 잔존) grep 점검
- 기존 기능(로그인 리디렉션, 알림, 프로필 드롭다운) 동작 회귀 확인

---

## 7. 컨벤션 준수 (CLAUDE.md)

- TypeScript strict, `type` 사용(`interface` 금지), `any` 금지
- 화살표 함수 + Named Export, `function` 선언식 금지
- Server Component 우선, 필요 시에만 `'use client'`
- 학습 포인트에 한국어 주석
- 단계별 진행, 각 단계 완료 후 확인 대기
