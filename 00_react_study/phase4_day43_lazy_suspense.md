# Day 43 — lazy + Suspense ✨

> 목표: **초기 번들에서 무거운 차트 라이브러리를 빼낸다.**
> Recharts는 사용자가 대시보드에 들어와야만 필요한데, 현재는 페이지 첫 로드 시 같이 다운로드되고 있다.

---

## 1. 오늘 본 코드

- [widgets/dashboard/DashboardContent.tsx:35-44](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L35-L44) — Recharts 차트 4종을 일반 import로 가져옴
- [features/stats/ui/DashboardCharts.tsx](../apps/page0127/src/features/stats/ui/DashboardCharts.tsx) — Recharts wrapper

---

## 2. 핵심 개념

### 2-1. 코드 스플리팅이란

빌드 시 JS를 **여러 청크로 쪼개고**, 사용자가 그 코드가 필요한 순간에만 다운로드.
초기 진입 시 다운로드하는 JS 크기 감소 → **LCP/TTI 개선**.

```
일반 import: [메인.js: 500KB] ← 첫 로드에 다 받음
                ├ Recharts (200KB)
                ├ 페이지 로직 (300KB)

lazy import:  [메인.js: 300KB] ← 첫 로드
              [Recharts 청크: 200KB] ← 차트가 화면에 필요할 때만 받음
```

### 2-2. React `lazy()` + `<Suspense>`

```tsx
import { lazy, Suspense } from 'react';

// 일반 import 대신 lazy()로 감싸면 별도 청크로 분리됨
const HeavyChart = lazy(() => import('./HeavyChart'));

export const Page = () => (
  <Suspense fallback={<div>차트 로딩 중...</div>}>
    <HeavyChart />
  </Suspense>
);
```

- `lazy()`는 **default export**만 받음. named export면 wrap 필요:
  ```tsx
  const HeavyChart = lazy(() =>
    import('./HeavyChart').then((mod) => ({ default: mod.HeavyChart }))
  );
  ```
- `<Suspense fallback>`은 lazy 컴포넌트가 로드되는 동안 보여줄 UI.

### 2-3. Next.js의 `dynamic()` — 더 강력한 대안

Next.js는 `next/dynamic`을 권장한다. SSR 옵션을 줄 수 있어서 **Recharts처럼 클라이언트 전용 라이브러리에 최적**.

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart').then((m) => m.HeavyChart), {
  loading: () => <div>차트 로딩 중...</div>,
  ssr: false, // ← 서버에서 렌더하지 않음. window 의존 라이브러리에 필수
});
```

| 비교 | `React.lazy` | `next/dynamic` |
|---|---|---|
| 코드 분할 | ✅ | ✅ |
| SSR 비활성화 옵션 | ❌ (Suspense + RSC로 다른 방식) | ✅ `ssr: false` |
| fallback UI | `<Suspense>` 별도 | `loading` 옵션 직접 |
| Next.js 환경 | 작동하지만 SSR 제어 약함 | **권장** |

---

## 3. page0127 실제 사례 — 어디를 lazy로 바꿀까?

### 현재 (DashboardContent.tsx)

```tsx
// 페이지 첫 로드에 Recharts 전체가 함께 다운로드됨
import { DashboardCharts } from '@/features/stats/ui/DashboardCharts';
import { YearlyTrendChart } from '@/widgets/dashboard/YearlyTrendChart';
```

이 두 컴포넌트는 Recharts를 import한다. 사용자가 대시보드 열기 전엔 필요 없는 코드.

### 리팩토링 예시 — dynamic으로 분할

```tsx
// widgets/dashboard/DashboardContent.tsx
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(
  () => import('@/features/stats/ui/DashboardCharts').then((m) => m.DashboardCharts),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Recharts는 window/measure 의존 → 서버 렌더 무의미
  }
);

const YearlyTrendChart = dynamic(
  () => import('@/widgets/dashboard/YearlyTrendChart').then((m) => m.YearlyTrendChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);
```

→ 대시보드 페이지 첫 HTML에는 Recharts 코드 미포함.
→ 사용자가 대시보드에 진입하면 **차트 청크 별도 fetch** + skeleton 표시.

### 굳이 lazy로 안 해도 되는 케이스

- **항상 즉시 보여야 하는** 상단 KPI 카드 (`StatCard`) — 작고, LCP 안에 들어가야 함
- **모달/Dialog 안 컴포넌트** — 이미 lazy 효과: 열기 전까지 렌더 안 됨 (단, 코드는 번들 안에 있으니 분리 가능)
- **Recharts 대신 CSS로 그린 차트** — 이미 가벼움 (예: [RatingDistributionChart](../apps/page0127/src/widgets/dashboard/RatingDistributionChart.tsx))

---

## 4. 정리 표

| 상황 | 도구 | 이유 |
|---|---|---|
| 페이지 진입 시 즉시 필요한 컴포넌트 | 일반 import | 분할 비용이 효과보다 큼 |
| 무거운 라이브러리(차트/에디터/지도) | `next/dynamic` + `ssr: false` | 초기 번들에서 제외 |
| 페이지 라우트 전체 | App Router가 자동 분할 | Next.js가 알아서 해줌 |
| 조건부로 가끔만 보이는 UI | `next/dynamic` | 안 보이면 다운 안 받음 |

### 한 줄 규칙

> **"이 컴포넌트가 화면에 나타나는 비율 × JS 크기"가 클수록 lazy 후보다.**

---

## 5. 오늘 실험

1. **Bundle Analyzer로 차트 크기 측정**

   ```bash
   npm i -D @next/bundle-analyzer
   ```

   `next.config.ts`에 추가:
   ```ts
   import withBundleAnalyzer from '@next/bundle-analyzer';
   export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })({ /* ... */ });
   ```

   실행:
   ```bash
   ANALYZE=true npm run build
   ```

   → `recharts` 청크가 어느 페이지에 포함되어 있는지 확인. 대시보드 페이지의 First Load JS 기록.

2. **`DashboardCharts` + `YearlyTrendChart`를 dynamic으로 전환** 후 다시 build → First Load JS 줄어드는지 비교.
   - skeleton fallback도 만들어 layout shift 최소화.

---

## 6. 다음 Day 예고

**Day 44 — 데이터 패칭 패턴**
`fetch` + `cache`, `revalidate` 옵션을 실습하고, 책 목록에 캐싱 전략 적용.
ISR/SSG/SSR 차이를 정리한다.
