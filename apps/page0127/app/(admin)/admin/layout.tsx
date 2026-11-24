import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { MarkAdminDevice } from '@/shared/lib/analytics/MarkAdminDevice';

import { getAdminNavBadges } from '@/widgets/admin/api/getAdminNavBadges';
import { AdminNav } from '@/widgets/admin/ui/AdminNav';
import { MarkMembersSeen } from '@/widgets/admin/ui/MarkMembersSeen';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// 페이지 접근 게이트. 데이터 접근 게이트는 각 서버액션/쿼리에서 재확인한다.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await assertAdmin();
  // 메뉴 배지(신고·검수 대기·새 회원). 레이아웃은 메뉴 이동 때 다시 그려지지 않아서
  // 숫자를 줄이는 서버 액션들이 revalidatePath('/admin', 'layout') 을 부른다
  const badges = await getAdminNavBadges().catch((e: unknown) => {
    console.error('[admin] 메뉴 배지 조회 실패:', e);
    return {};
  });

  return (
    // 모바일(<md)은 메뉴를 위 가로 줄로 올린다 — 왼쪽 w-56 고정이면 390px 폭에서 본문이 130px 남짓이 된다
    <div className='page-width flex min-h-screen flex-col md:flex-row'>
      {/* assertAdmin 을 통과한 브라우저만 표시된다 — GA 전송 제외 */}
      <MarkAdminDevice />
      <MarkMembersSeen />
      <aside className='border-b border-line md:w-56 md:shrink-0 md:border-b-0 md:border-r'>
        <div className='border-b border-line px-4 py-3 text-sm font-medium md:py-4'>
          운영 콘솔
        </div>
        <AdminNav badges={badges} />
      </aside>
      {/* min-w-0: flex 자식은 기본 min-width:auto 라 넓은 표가 본문을 화면 밖으로 밀어낸다 */}
      <main className='min-w-0 flex-1 p-4 md:p-6'>{children}</main>
    </div>
  );
}

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};
