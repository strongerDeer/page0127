# @repo/ui 변경 이력

시스템은 "무엇이 바뀌었는가"를 알리는 것이 절반이다. 소비자가 앱 하나뿐이라
버전을 올려 배포하지는 않지만, **깨지는 변경(Breaking)** 은 반드시 남긴다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따른다.

---

## [0.1.0] — 2026-07-31

디자인 시스템을 앱에서 떼어내 패키지로 세운 첫 버전.
그 전까지는 `apps/page0127/src/shared/ui` 의 폴더였다.

### Breaking

- **`Button` 의 `size` 이름이 바뀌었다.**
  `default` → `md`, `icon` → `icon-md`.
  시스템 전체가 `sm`/`md`/`lg` 축을 쓰는데 Button 만 달랐다.
  `default` 는 "무엇의 기본인가"를 말할 뿐 크기를 말하지 않는다.

- **`BookCover` 가 `size` 계단으로 크기를 정한다.**
  `width`·`height`·`sizes`·`fallbackClassName` prop 이 사라졌다.
  대신 `size='xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fill'`.
  너비는 판형 비율(1:1.45)에서 파생되므로 지정하지 않는다.

- **컴포넌트 import 경로가 `@repo/ui` 로 바뀌었다.**
  `@/shared/ui/button` → `@repo/ui`.
  앱에 남은 것은 `RelativeTime`·`SubmitButton` 둘뿐이다.

### Added

- `packages/ui` 패키지 — 공개 표면은 `src/index.ts` 하나다
- Chromatic 시각 회귀 게이트 + 공개 Storybook 배포
- 책 표지 토큰 — `--book-cover-ratio` · `--book-spine-*` · `--book-cover-radius`
- `shouldShowReadCount()` — "1회독은 배지를 달지 않는다" 규칙을 함수로
- `Domain` 스토리 섹션 (`BookCover` · `ReadCountBadge`)
- 테스트 25개 — 토큰 계약 · `@theme` 배선 · 명암비 계산 · 배지 판정

### Fixed

- **`ReadCountBadge` 가 AA 미달이었다.** `bg-primary/15` 위 `text-primary` 가
  4.31:1. 검산된 `accent` 짝으로 교체(라이트 5.86 / 다크 8.37).
  앱 3곳에서 쓰이고 있었지만 스토리가 없어 검사된 적이 없었다.
- **`.book-cover` 가 Tailwind 유틸을 이기고 있었다.** `@layer` 밖이라
  대체 표지의 `bg-sunken` 이 한 번도 적용된 적 없었다 → `@layer components` 로.
- **`BookCover` 의 `className` 이 기본 클래스에 졌다.** `cn()` 순서 문제.
- **`aspect-ratio` 가 작은 크기에서 콘텐츠에 밀렸다.** xs 가 1.23 비율로
  렌더되던 것을 너비 고정으로 해결(실측 확인).
- **`storybook-static` 이 ESLint 무시 목록에 없었다.** 빌드 후 lint 가
  벤더 JS 를 검사하며 12,364 건을 뱉었다.

### Changed

- `globals.css`(211줄)가 `packages/ui/src/styles/index.css` 로.
  앱은 `@import` 한 줄만 갖는다.
- `ReadCountBadge` 의 인라인 SVG → `lucide-react`
- 토큰 계약 테스트를 경계 양쪽으로 분리(시스템 46종 / 앱 11종)
