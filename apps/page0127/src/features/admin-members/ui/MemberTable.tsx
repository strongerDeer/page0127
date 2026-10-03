import Link from 'next/link';

import { ACTIVE_WINDOW_DAYS, providerLabel } from '../lib/memberStats';

import type { MemberRow } from '@/features/admin-members/api/getMembers';

type MemberTableProps = { rows: MemberRow[] };

export const MemberTable = ({ rows }: MemberTableProps) => {
  if (rows.length === 0) {
    return <p className='text-sm text-text-subtle'>가입자가 없습니다.</p>;
  }
  return (
    <table className='w-full border-collapse text-sm'>
      <thead>
        <tr className='border-b border-line text-left text-text-subtle'>
          <th className='py-2'>회원</th>
          <th className='py-2'>가입 경로</th>
          <th className='py-2'>가입일</th>
          <th className='py-2'>최근 접속</th>
          <th
            className='py-2'
            title={`최근 ${ACTIVE_WINDOW_DAYS}일 중 들어온 날 수`}
          >
            활동일({ACTIVE_WINDOW_DAYS}일)
          </th>
          <th className='py-2'>등록 책</th>
          <th className='py-2'>상태</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id} className='border-b border-line'>
            <td className='py-2'>
              <Link href={`/admin/members/${m.id}`} className='hover:underline'>
                {m.nickname ?? m.username ?? m.id.slice(0, 8)}
              </Link>
              <div className='text-xs text-text-subtle'>{m.maskedEmail}</div>
            </td>
            <td className='py-2'>{providerLabel(m.provider)}</td>
            <td className='py-2'>{m.createdAt.slice(0, 10)}</td>
            <td className='py-2'>{m.lastSeen ?? '-'}</td>
            <td className='py-2'>{m.activeDays}일</td>
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
