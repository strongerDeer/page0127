import Link from 'next/link';

import { toKstDateKey } from '@/shared/lib/date';

import { getAccountDeletions } from '@/features/admin-members/api/getAccountDeletions';
import {
  DEFAULT_PAGE_SIZE,
  getMembers,
} from '@/features/admin-members/api/getMembers';
import { providerLabel } from '@/features/admin-members/lib/memberStats';
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
  const [{ rows, total }, deletions] = await Promise.all([
    getMembers({ search: sp.q, page }),
    getAccountDeletions(),
  ]);
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
      <h1 className='mb-4 text-base font-medium'>회원 관리</h1>

      {/* GET 폼 — 검색은 URL 쿼리로. client 컴포넌트 불필요 */}
      <form className='mb-4' action='/admin/members' method='get'>
        <input
          name='q'
          defaultValue={sp.q ?? ''}
          placeholder='이메일 또는 닉네임 검색'
          className='w-full max-w-xs rounded border border-line px-3 py-2 text-sm'
        />
      </form>

      <div className='mb-2 text-xs text-text-subtle'>
        {sp.q ? `검색 결과 ${total}명` : `총 ${total}명`}
        {deletions && ` · 탈퇴 ${deletions.total}명`} · 페이지당{' '}
        {DEFAULT_PAGE_SIZE}명 · 번호는 가입 순서(1번이 첫 가입자)
      </div>
      <MemberTable
        rows={rows}
        firstNumber={total - (page - 1) * DEFAULT_PAGE_SIZE}
      />

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

      <DeletionList deletions={deletions} />
    </section>
  );
}

const daysBetweenIso = (from: string, to: string) =>
  Math.max(
    0,
    Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
  );

/** 탈퇴 기록 — 누구였는지는 남기지 않는다(개인정보 삭제). 언제·얼마나 쓰다 떠났는지만 */
const DeletionList = ({
  deletions,
}: {
  deletions: Awaited<ReturnType<typeof getAccountDeletions>>;
}) => (
  <section className='mt-8'>
    <h2 className='mb-1 text-sm font-medium'>
      탈퇴 기록{deletions ? ` (${deletions.total}명)` : ''}
    </h2>
    <p className='mb-3 text-xs text-text-subtle'>
      2026-10-31부터 남깁니다. 탈퇴하면 개인정보를 지워야 해서 누구였는지는
      남기지 않고, 언제·얼마나 쓰다 떠났는지만 봅니다.
    </p>
    {deletions === null ? (
      <p className='text-sm text-text-subtle'>
        탈퇴 기록을 불러오지 못했습니다.
      </p>
    ) : deletions.recent.length === 0 ? (
      <p className='text-sm text-text-subtle'>아직 탈퇴한 회원이 없어요.</p>
    ) : (
      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr className='border-b border-line text-left text-text-subtle'>
            <th className='py-2'>탈퇴일</th>
            <th className='py-2'>가입일</th>
            <th className='py-2'>쓴 기간</th>
            <th className='py-2'>등록 책</th>
            <th className='py-2'>가입 경로</th>
          </tr>
        </thead>
        <tbody>
          {deletions.recent.map((d, i) => (
            <tr key={`${d.deletedAt}-${i}`} className='border-b border-line'>
              <td className='py-2'>{toKstDateKey(new Date(d.deletedAt))}</td>
              <td className='py-2'>
                {d.signedUpAt ? toKstDateKey(new Date(d.signedUpAt)) : '-'}
              </td>
              <td className='py-2'>
                {d.signedUpAt
                  ? `${daysBetweenIso(d.signedUpAt, d.deletedAt)}일`
                  : '-'}
              </td>
              <td className='py-2'>{d.bookCount}권</td>
              <td className='py-2'>{providerLabel(d.provider)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);
