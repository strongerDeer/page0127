import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

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
    <div className='mx-auto flex min-h-screen max-w-6xl'>
      <aside className='w-56 border-r border-line'>
        <div className='border-b border-line px-4 py-4 text-sm font-semibold'>
          운영 콘솔
        </div>
        <AdminNav />
      </aside>
      <main className='flex-1 p-6'>{children}</main>
    </div>
  );
}
