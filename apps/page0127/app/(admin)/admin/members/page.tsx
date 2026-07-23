import { getMembers } from '@/features/admin-members/api/getMembers';
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
    </section>
  );
}
