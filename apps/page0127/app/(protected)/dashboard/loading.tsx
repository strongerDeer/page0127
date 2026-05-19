import { DashboardSkeleton } from '@/widgets/dashboard/DashboardSkeleton';

/**
 * Dashboard 라우트 로딩 UI
 *
 * 학습 포인트:
 * - Next.js App Router가 page.tsx를 자동으로 <Suspense>로 감싸고
 *   이 파일을 fallback으로 사용
 * - page.tsx의 11개 await가 끝나기 전까지 즉시 이 스켈레톤이 노출됨
 * - default export 강제 (Next.js convention)
 */
export default function Loading() {
  return <DashboardSkeleton />;
}
