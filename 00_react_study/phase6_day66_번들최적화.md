# Phase 6 · Day 66 — 번들 최적화 (`@next/bundle-analyzer`)

> 주제: 번들에 무엇이 얼마나 들어가는지 **시각화**하고, 무거운 패키지를 **lazy 처리/교체**해 초기 로딩 줄이기
> 연결 포인트: page0127의 무거운 의존성(`recharts`, `openai`) 분석 → 큰 패키지 lazy 처리

---

## 1. 오늘 읽을 코드

- [next.config.ts](../apps/page0127/next.config.ts) — 번들 설정이 들어갈 곳
- [package.json](../apps/page0127/package.json) — 무거운 의존성 후보 목록
- [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — 이미 차트를 `dynamic`으로 분리한 실제 사례

---

## 2. 핵심 개념

### (1) 왜 번들을 분석하나

JS 번들은 **다운로드 → 파싱 → 실행**까지 전부 메인 스레드 비용이다. 화면에 안 보이는 코드까지 초기 번들에 섞이면 TTI(상호작용 가능 시점)가 늘어진다. "느낌"이 아니라 **숫자로** 어떤 패키지가 큰지 봐야 손을 댈 수 있다.

### (2) `@next/bundle-analyzer` — 번들 시각화

설치 (직접 입력용):

```bash
npm install -D @next/bundle-analyzer
```

`next.config.ts` 래핑:

```typescript
import withBundleAnalyzer from '@next/bundle-analyzer';

// ANALYZE=true 일 때만 분석 모드 활성화
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* 기존 설정 */
};

// 마지막에 한 번 감싸서 export
export default bundleAnalyzer(nextConfig);
```

분석 실행 (직접 입력용):

```bash
ANALYZE=true npm run build
```

→ 브라우저에 **treemap**(네모 크기 = 패키지 용량)이 뜬다. `client.html`, `nodejs.html`, `edge.html` 3개가 생성되며, 우리가 주로 보는 건 **client**(브라우저로 내려가는 번들)다.

### (3) 분석 후 손대는 3가지 레버

| 레버 | 도구 | 언제 |
| --- | --- | --- |
| **Code splitting (lazy)** | `next/dynamic` | 무겁고 + 초기 화면에 안 보이는 컴포넌트 |
| **Tree-shaking 강화** | `optimizePackageImports` | 아이콘/유틸처럼 일부만 쓰는 큰 패키지 |
| **패키지 교체/제거** | 가벼운 대안 | `moment`→`date-fns`, `axios`→`fetch` 등 |

#### `next/dynamic` (lazy import)

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  ssr: false,            // 차트처럼 브라우저 API 의존 → 서버 렌더 제외
  loading: () => <Skeleton />, // 청크 로드되는 동안 보여줄 UI
});
```

→ `HeavyChart`와 그 의존성(recharts 등)이 **별도 청크**로 빠져서 초기 번들에서 제외된다. 실제로 필요할 때(렌더 시점) 비동기로 받아온다.

#### `optimizePackageImports` (next.config)

```typescript
const nextConfig: NextConfig = {
  experimental: {
    // barrel(index) import를 개별 모듈 import로 자동 변환 → 안 쓰는 코드 제거
    optimizePackageImports: ['lucide-react'],
  },
};
```

> `import { Home } from 'lucide-react'` 한 줄이 패키지 전체를 끌어오는 걸 막아준다. (Next 16은 `lucide-react` 등 일부를 기본 최적화하지만, 명시하면 확실하다.)

---

## 3. page0127 실제 코드 사례

### 무거운 의존성 후보 (package.json 기준)

| 패키지 | 성격 | 최적화 방향 |
| --- | --- | --- |
| `recharts` | 차트, **무거움** | `dynamic` + `ssr:false`로 분리 ✅ 이미 적용 |
| `openai` | LLM SDK, 무거움 | **서버 전용**(`shared/lib/openai/client.ts`)이라 클라 번들에 안 들어감 ✅ |
| `lucide-react` | 아이콘 | `optimizePackageImports` 후보 |
| `axios` | HTTP | `fetch`로 대체 가능(선택) |

### 이미 적용된 lazy 처리 — `DashboardContent.tsx`

`recharts`를 쓰는 차트 5개([CategoryRadarChart](../apps/page0127/src/features/stats/ui/CategoryRadarChart.tsx) 등)가 초기 번들에 들어가면 대시보드 첫 로딩이 무거워진다. 그래서:

```typescript
// src/widgets/dashboard/DashboardContent.tsx
import dynamic from 'next/dynamic';

// recharts 묶음을 별도 청크로 분리 → 초기 번들에서 제외
const DashboardCharts = dynamic(
  () => import('@/features/stats/ui/DashboardCharts').then((m) => m.DashboardCharts),
  {
    ssr: false,                  // 차트는 클라에서만 그림
    loading: () => (/* 스켈레톤 */),
  }
);

const YearlyTrendChart = dynamic(
  () => import('@/widgets/dashboard/YearlyTrendChart').then((m) => m.YearlyTrendChart),
  { ssr: false, loading: () => (/* 스켈레톤 */) }
);
```

→ `recharts` 전체가 **대시보드 차트 청크**로 빠지고, 페이지 골격은 먼저 그려진 뒤 차트가 뒤따라 로드된다. (`next/dynamic`은 [PublicLibraryContent](../apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx)에서도 사용 중)

> **핵심**: 번들 최적화는 "코드를 지우는" 게 아니라 **언제 내려보낼지(초기 vs 필요할 때)를 나누는** 작업이다.

---

## 4. 한 줄 규칙

> **무겁다(용량) + 안 보인다(초기 화면 밖) = `next/dynamic` 후보.** 측정(`ANALYZE=true`) → 분리(`dynamic`) → 재측정 순서로 검증한다.

---

## 5. 오늘 실험 (2가지)

1. **번들 시각화**: `@next/bundle-analyzer`를 설치·설정하고 `ANALYZE=true npm run build` 실행. client treemap에서 `recharts`가 **메인 번들에 없고 별도 청크**로 빠져 있는지 눈으로 확인한다. (이미 dynamic 처리됐으므로 분리돼 있어야 정상)
2. **분리 전/후 비교**: `DashboardCharts`의 `dynamic(...)`을 잠깐 일반 `import`로 바꿔 다시 빌드 → treemap에서 메인 청크 크기가 커지는지 비교. 차이를 확인했으면 **반드시 원복**한다.

---

## 6. 다음 Day 예고

**Day 67 — 최종 성능 점검**: React DevTools Profiler로 전체 앱을 분석해 병목 2개 이상 개선. (번들 다음 축인 **이미지 최적화**는 [보충 문서](phase6_보충_이미지최적화점검.md)에서 별도로 점검했다 — `next/image`·`sizes`·`priority`·LCP)
