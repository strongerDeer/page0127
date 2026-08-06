import { Suspense } from 'react';

import Link from 'next/link';

import { ErrorBoundary } from '@repo/ui';

import { getOverview } from '@/features/admin-overview/api/getOverview';
import { OverviewCards } from '@/features/admin-overview/ui/OverviewCards';

// 지표는 매번 새로 읽는다. 어드민은 방금 일어난 일을 보러 오는 화면이라
// 캐시된 숫자를 보여주면 "왜 안 늘지"로 시간을 쓴다.
export const dynamic = 'force-dynamic';

const CARDS = [
  { href: '/admin/reports', title: '신고', desc: '접수된 신고 확인·댓글 숨김' },
  { href: '/admin/quality', title: '품질', desc: 'Lighthouse·번들·실사용자 지표' },
  { href: '/admin/errors', title: '에러', desc: 'Sentry 이슈 분류' },
  { href: '/admin/costs', title: 'AI 비용', desc: '이번 달 사용액과 예산 대비' },
  { href: '/admin/members', title: '회원 관리', desc: '가입자 조회·정지' },
  { href: '/admin/banners', title: '메인 배너', desc: '랜딩 히어로 슬라이드' },
];

const OverviewSection = async () => {
  const overview = await getOverview();
  return <OverviewCards overview={overview} />;
};

const OverviewSkeleton = () => (
  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
    {Array.from({ length: 4 }, (_, i) => (
      <div
        key={i}
        className='h-24 animate-pulse rounded-lg border border-line bg-sunken'
      />
    ))}
  </div>
);

export default function AdminHomePage() {
  return (
    <div className='space-y-8'>
      {/* 지표 조회가 실패해도 아래 이동 링크는 살아 있어야 한다 —
          숫자를 못 읽는 것과 콘솔을 못 쓰는 것은 다른 사고다 */}
      <ErrorBoundary
        fallback={
          <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
            지표를 불러오지 못했습니다.
          </p>
        }
      >
        <Suspense fallback={<OverviewSkeleton />}>
          <OverviewSection />
        </Suspense>
      </ErrorBoundary>

      <section>
        <h2 className='mb-3 text-sm font-medium'>바로가기</h2>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className='rounded-lg border border-line p-4 transition-colors hover:bg-accent'
            >
              <div className='text-sm font-medium'>{c.title}</div>
              <p className='mt-1 text-sm text-text-subtle'>{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
