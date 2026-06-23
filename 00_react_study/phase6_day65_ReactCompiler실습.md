# Day 65 — React Compiler 실습 (실제 적용 + 전/후 측정)

> Phase 6 · 성능 최적화 | 주제: `babel-plugin-react-compiler` 적용, Compiler 적용 전/후 Profiler 수치 비교
> 선행: [Day 64 React Compiler 이해](./phase6_day64_ReactCompiler이해.md) — 오늘은 그때 만든 "제거 체크리스트"를 실행한다

---

## 1. 오늘 읽을/바꿀 코드

- [next.config.ts](../apps/page0127/next.config.ts) — `reactCompiler: true` 추가 대상
- [package.json](../apps/page0127/package.json) — `babel-plugin-react-compiler` 설치
- Day 64 체크리스트: [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx)의 `useMemo`, [BookGridItem.tsx](../apps/page0127/src/features/stats/ui/BookGridItem.tsx)의 `memo`

---

## 2. 핵심 개념 — Next.js 16에선 한 줄이면 켜진다

### 설치 (사용자가 직접 입력)

```bash
# apps/page0127 디렉토리에서
npm install babel-plugin-react-compiler
```

### next.config.ts — `reactCompiler: true` 추가

Next.js 16부터 `reactCompiler`가 **stable**(experimental 밖)이다.

```ts
// Before (현재)
const nextConfig: NextConfig = {
  transpilePackages: ['@repo/design-tokens', '@repo/icons'],
  images: { remotePatterns: [/* ... */] },
};

// After
const nextConfig: NextConfig = {
  reactCompiler: true, // ← 이 한 줄
  transpilePackages: ['@repo/design-tokens', '@repo/icons'],
  images: { remotePatterns: [/* ... */] },
};
```

> Next.js는 전체 파일이 아니라 **관련 파일만** 골라 Compiler를 돌린다 → 순수 Babel 플러그인보다 빌드가 빠르다.
> 단 **Babel에 의존**하므로 dev/build **컴파일 시간은 늘어난다**. (켜기 전/후 빌드 시간을 재두면 학습에 좋음)

### 점진 적용 — annotation 모드

전체가 부담되면 `'use memo'` 디렉티브를 단 컴포넌트만 컴파일하게 할 수 있다.

```ts
reactCompiler: { compilationMode: 'annotation' }
```
```tsx
function HeavyList() {
  'use memo'; // ← 이 컴포넌트만 Compiler 적용
  // ...
}
```

### 안전장치 — Rules of React 위반 검출

Day 64에서 말한 ESLint 룰(`eslint-plugin-react-compiler` / 최신 `eslint-plugin-react-hooks`의 컴파일러 룰)을 켜면
순수성·불변성 위반을 **빌드 전에** 잡아준다. 위반 컴포넌트는 Compiler가 **bail out**(최적화 건너뜀)하므로 앱은 안 깨진다.

---

## 3. page0127 실제 적용 — Day 64 체크리스트 실행

Compiler를 켜고 빌드가 통과하면, 손으로 넣었던 메모이제이션을 **하나씩** 제거하며 동작을 확인한다.

### ① BookGridItem — `memo` 래퍼 벗기기

```tsx
// Before
export const BookGridItem = memo(({ book, href }: BookGridItemProps) => { ... });
BookGridItem.displayName = 'BookGridItem';

// After (Compiler가 자동 메모이제이션)
export const BookGridItem = ({ book, href }: BookGridItemProps) => { ... };
//  ↑ memo import·displayName 줄도 제거. 컴포넌트 추출 "구조"는 그대로 유지
```

### ② DashboardBookList — `useMemo` + deps 배열 제거

```tsx
// Before
const filteredBooks = useMemo(
  () => books.filter(...).sort(...),
  [books, selectedMonth, selectedCategory, selectedRating,
   deferredSearchQuery, sortOption, statusFilter]
);

// After
const filteredBooks = books.filter(...).sort(...);
//  ↑ useMemo·deps 통째 제거. 미사용 import(useMemo)도 같이 정리
```

> ⚠️ **한 번에 다 지우지 말 것.** ①→측정→②→측정 순으로 하나씩, Profiler로 "여전히 리렌더가 스킵되는지" 확인하면서 제거한다. Compiler가 bail out한 컴포넌트라면 제거 후 리렌더가 늘어날 수 있다.

---

## 4. 정리

| 단계 | 명령/변경 |
| --- | --- |
| 설치 | `npm install babel-plugin-react-compiler` |
| 켜기 | next.config.ts에 `reactCompiler: true` |
| 점진 적용 | `compilationMode: 'annotation'` + `'use memo'` |
| 제거 | Day 64 체크리스트의 `memo`/`useMemo`를 하나씩 + 측정 |
| 비용 | 빌드/dev 컴파일 시간 ↑ (Babel 의존) |

> **규칙 1줄**: Compiler를 켜는 건 한 줄이지만, 수동 메모 제거는 _"하나 지우고 → Profiler로 확인"_ 을 반복하며 점진적으로 한다.

---

## 5. 오늘 실험 (2가지)

### 실험 1 — 적용 전/후 Profiler 수치 비교 (오늘의 핵심)
1. **적용 전** 측정: `/dashboard`에서 검색어 타이핑 → Profiler로 commit 시간·리렌더 컴포넌트 수 기록
2. `npm install babel-plugin-react-compiler` + `reactCompiler: true` 적용 후 재빌드
3. **적용 후** 측정: 같은 동작 반복 → 수치 비교
   - React DevTools Components 탭에서 컴포넌트 옆 **"Memo ✨" 배지**가 생기는지 확인 (Compiler가 최적화한 표시)

### 실험 2 — 수동 memo 제거해도 리렌더가 그대로인지 검증
1. [BookGridItem.tsx](../apps/page0127/src/features/stats/ui/BookGridItem.tsx)에서 `memo()` 한 겹만 벗긴다
2. Profiler "Highlight updates"로 검색어 타이핑 → **여전히 책 카드가 안 깜빡이면** Compiler가 대신 메모이제이션한 것 ✅
3. 만약 깜빡이면 → 그 컴포넌트가 bail out된 것. ESLint 컴파일러 룰로 원인(순수성 위반) 추적

> ⚠️ 이 실습은 **설정·의존성 변경**을 동반한다. 실제 적용은 사용자 확인 후 진행한다. (노트는 절차만 정리)

---

## 6. 다음 Day 예고

**Day 66 — 번들 최적화**: `@next/bundle-analyzer`로 번들을 시각화하고,
불필요하게 큰 패키지를 교체하거나 `dynamic import`로 lazy 처리한다.
(Compiler가 런타임 리렌더를 줄였다면, 번들 최적화는 **초기 로딩**을 줄이는 작업)

---

### 출처
- [next.config.js: reactCompiler — Next.js 공식](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler)
- [Next.js 16 릴리스 블로그](https://nextjs.org/blog/next-16)
