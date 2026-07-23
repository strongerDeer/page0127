import Link from 'next/link';

import type { MemberRow } from '@/features/admin-members/api/getMembers';

export const MemberTable = ({ rows }: { rows: MemberRow[] }) => {
  if (rows.length === 0) {
    return <p className='text-sm text-text-subtle'>가입자가 없습니다.</p>;
  }
  return (
    <table className='w-full border-collapse text-sm'>
      <thead>
        <tr className='border-b border-line text-left text-text-subtle'>
          <th className='py-2'>회원</th>
          <th className='py-2'>가입일</th>
          <th className='py-2'>등록 책</th>
          <th className='py-2'>상태</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id} className='border-b border-line'>
            <td className='py-2'>
              <Link href={`/admin/members/${m.id}`} className='hover:underline'>
                {m.nickname ?? m.username ?? m.email ?? m.id.slice(0, 8)}
              </Link>
              <div className='text-xs text-text-subtle'>{m.email}</div>
            </td>
            <td className='py-2'>{m.createdAt.slice(0, 10)}</td>
            <td className='py-2'>{m.bookCount}권</td>
            <td className='py-2'>
              {m.suspended ? (
                <span className='text-destructive'>정지</span>
              ) : (
                <span className='text-text-subtle'>정상</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
