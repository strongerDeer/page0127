import Link from 'next/link';

import { ACTIVE_WINDOW_DAYS, providerLabel } from '../lib/memberStats';

import type { MemberRow } from '@/features/admin-members/api/getMembers';

type MemberTableProps = {
  rows: MemberRow[];
  /**
   * 첫 줄 번호. 목록이 최신 가입순이라 맨 위가 가장 큰 번호(= 전체 회원 수)이고
   * 아래로 1씩 줄어든다 — 마지막 페이지 맨 아래가 1번(첫 가입자)이다.
   */
  firstNumber: number;
};

export const MemberTable = ({ rows, firstNumber }: MemberTableProps) => {
  if (rows.length === 0) {
    return <p className='text-sm text-text-subtle'>가입자가 없습니다.</p>;
  }
  return (
    <table className='w-full border-collapse text-sm'>
      <thead>
        <tr className='border-b border-line text-left text-text-subtle'>
          <th className='w-12 py-2 pr-2 text-right font-normal'>#</th>
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
        {rows.map((m, i) => (
          <tr key={m.id} className='border-b border-line'>
            <td className='py-2 pr-2 text-right tabular-nums text-text-subtle'>
              {firstNumber - i}
            </td>
            <td className='py-2'>
              <Link href={`/admin/members/${m.id}`} className='hover:underline'>
                {m.nickname ?? m.username ?? m.id.slice(0, 8)}
              </Link>
              {m.username && (
                <a
                  href={`/${m.username}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='ml-1.5 text-xs text-text-subtle underline hover:text-text-strong'
                  aria-label={`${m.nickname ?? m.username} 서재 새 탭에서 열기`}
                >
                  서재 ↗
                </a>
              )}
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
