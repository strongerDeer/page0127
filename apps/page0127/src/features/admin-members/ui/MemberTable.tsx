import Link from 'next/link';

import { toKstDateKey } from '@/shared/lib/date';

import { ACTIVE_WINDOW_DAYS, providerLabel } from '../lib/memberStats';

import type {
  MemberExclusion,
  MemberRow,
} from '@/features/admin-members/api/getMembers';

const EXCLUSION_LABEL: Record<MemberExclusion, string> = {
  admin: '운영자',
  demo: '체험',
  test: '테스트',
};

// 칸 공통 — 숫자 칸은 오른쪽, 글 칸은 왼쪽 정렬. 머리글도 같은 쪽으로 맞춘다
const th = 'whitespace-nowrap px-3 py-2 font-normal';
const td = 'whitespace-nowrap px-3 py-2.5';

type MemberTableProps = {
  /** 번호는 각 행의 number(가입 순서) — 정렬을 바꿔도 사람마다 그대로다 */
  rows: MemberRow[];
};

export const MemberTable = ({ rows }: MemberTableProps) => {
  if (rows.length === 0) {
    return <p className='text-sm text-text-subtle'>가입자가 없습니다.</p>;
  }
  return (
    <div className='overflow-x-auto'>
      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr className='border-b border-line text-xs text-text-subtle'>
            <th className={`${th} w-10 text-right`}>#</th>
            <th className={`${th} text-left`}>회원</th>
            <th className={`${th} text-left`}>가입 경로</th>
            <th className={`${th} text-left`}>가입일</th>
            <th className={`${th} text-left`}>최근 접속</th>
            <th
              className={`${th} text-right`}
              title={`최근 ${ACTIVE_WINDOW_DAYS}일 중 들어온 날 수`}
            >
              활동일({ACTIVE_WINDOW_DAYS}일)
            </th>
            <th className={`${th} text-right`}>등록 책</th>
            <th className={`${th} text-center`}>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr
              key={m.id}
              className='border-b border-line/60 align-middle hover:bg-accent'
            >
              <td className={`${td} text-right text-xs text-text-subtle`}>
                {m.number ?? '-'}
              </td>
              <td className={`${td} min-w-40`}>
                <div className='flex items-baseline gap-1.5'>
                  <Link
                    href={`/admin/members/${m.id}`}
                    className='font-medium hover:underline'
                  >
                    {m.nickname ?? m.username ?? m.id.slice(0, 8)}
                  </Link>
                  {m.excludedAs && (
                    <span
                      className='shrink-0 rounded bg-sunken px-1.5 py-0.5 text-[11px] text-text-subtle'
                      title='회원 수·지표에서 빠지는 계정'
                    >
                      {EXCLUSION_LABEL[m.excludedAs]}
                    </span>
                  )}
                  {m.username && (
                    <a
                      href={`/${m.username}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='shrink-0 text-xs text-text-subtle hover:text-text-strong hover:underline'
                      aria-label={`${m.nickname ?? m.username} 서재 새 탭에서 열기`}
                    >
                      서재 ↗
                    </a>
                  )}
                </div>
                <div className='mt-0.5 text-xs text-text-subtle'>
                  {m.maskedEmail}
                </div>
              </td>
              <td className={`${td} text-text-subtle`}>
                {providerLabel(m.provider)}
              </td>
              <td className={`${td} tabular-nums`}>
                {toKstDateKey(new Date(m.createdAt))}
              </td>
              <td className={`${td} tabular-nums`}>{m.lastSeen ?? '-'}</td>
              <td className={`${td} text-right tabular-nums`}>
                {m.activeDays}일
              </td>
              <td className={`${td} text-right tabular-nums`}>
                {m.bookCount}권
              </td>
              <td className={`${td} text-center`}>
                {m.suspended ? (
                  <span className='rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive'>
                    정지
                  </span>
                ) : (
                  <span className='text-xs text-text-subtle'>정상</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
