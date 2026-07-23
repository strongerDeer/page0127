import Link from 'next/link';

import {
  DEFAULT_PAGE_SIZE,
  getMembers,
} from '@/features/admin-members/api/getMembers';
import { MemberTable } from '@/features/admin-members/ui/MemberTable';

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rawPage = Number(sp.page ?? '1');
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const { rows, total } = await getMembers({ search: sp.q, page });
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  // 검색어(q)를 유지하며 특정 페이지로 가는 URL을 만든다.
  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set('q', sp.q);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/admin/members?${qs}` : '/admin/members';
  };

  return (
    <section>
      <h1 className='mb-4 text-base font-semibold'>회원 관리</h1>

      {/* GET 폼 — 검색은 URL 쿼리로. client 컴포넌트 불필요 */}
      <form className='mb-4' action='/admin/members' method='get'>
        <input
          name='q'
          defaultValue={sp.q ?? ''}
          placeholder='이메일 또는 닉네임 검색'
          className='w-full max-w-xs rounded border border-line px-3 py-2 text-sm'
        />
      </form>

      <div className='mb-2 text-xs text-text-subtle'>총 {total}명</div>
      <MemberTable rows={rows} />

      {totalPages > 1 && (
        <nav className='mt-4 flex items-center justify-between text-sm'>
          {page > 1 ? (
            <Link
              href={hrefForPage(page - 1)}
              className='rounded border border-line px-3 py-1.5 hover:bg-accent'
            >
              이전
            </Link>
          ) : (
            <span className='rounded border border-line px-3 py-1.5 text-text-subtle opacity-50'>
              이전
            </span>
          )}
          <span className='text-text-subtle'>
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={hrefForPage(page + 1)}
              className='rounded border border-line px-3 py-1.5 hover:bg-accent'
            >
              다음
            </Link>
          ) : (
            <span className='rounded border border-line px-3 py-1.5 text-text-subtle opacity-50'>
              다음
            </span>
          )}
        </nav>
      )}
    </section>
  );
}
