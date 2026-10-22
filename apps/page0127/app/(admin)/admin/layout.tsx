import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { MarkAdminDevice } from '@/shared/lib/analytics/MarkAdminDevice';

import { AdminNav } from '@/widgets/admin/ui/AdminNav';

import type { ReactNode } from 'react';

// 페이지 접근 게이트. 데이터 접근 게이트는 각 서버액션/쿼리에서 재확인한다.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await assertAdmin();

  return (
    // 모바일(<md)은 메뉴를 위 가로 줄로 올린다 — 왼쪽 w-56 고정이면 390px 폭에서 본문이 130px 남짓이 된다
    <div className='mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row'>
      {/* assertAdmin 을 통과한 브라우저만 표시된다 — GA 전송 제외 */}
      <MarkAdminDevice />
      <aside className='border-b border-line md:w-56 md:shrink-0 md:border-b-0 md:border-r'>
        <div className='border-b border-line px-4 py-3 text-sm font-medium md:py-4'>
          운영 콘솔
        </div>
        <AdminNav />
      </aside>
      {/* min-w-0: flex 자식은 기본 min-width:auto 라 넓은 표가 본문을 화면 밖으로 밀어낸다 */}
      <main className='min-w-0 flex-1 p-4 md:p-6'>{children}</main>
    </div>
  );
}
