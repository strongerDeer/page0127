import { notFound } from 'next/navigation';

import { getMemberDetail } from '@/features/admin-members/api/getMemberDetail';
import {
  formatKstDateTime,
  providerLabel,
} from '@/features/admin-members/lib/memberStats';
import { RevealEmail } from '@/features/admin-members/ui/RevealEmail';
import { SuspendForm } from '@/features/admin-members/ui/SuspendForm';

const ACTION_LABEL: Record<string, string> = {
  suspend: '정지',
  unsuspend: '정지 해제',
  view_email: '이메일 열람',
};

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMemberDetail(id);
  if (!m) notFound();

  return (
    <section className='flex flex-col gap-6'>
      <div>
        <h1 className='text-base font-medium'>
          {m.nickname ?? m.username ?? m.id.slice(0, 8)}
        </h1>
        <RevealEmail userId={m.id} maskedEmail={m.maskedEmail} />
      </div>

      <dl className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-3'>
        <div>
          <dt className='text-text-subtle'>가입 경로</dt>
          <dd>{providerLabel(m.provider)}</dd>
        </div>
        <div>
          <dt className='text-text-subtle'>가입일</dt>
          <dd>{m.createdAt.slice(0, 10)}</dd>
        </div>
        <div>
          <dt className='text-text-subtle'>마지막 로그인</dt>
          <dd>{m.lastSignInAt ? formatKstDateTime(m.lastSignInAt) : '-'}</dd>
        </div>
        <div>
          <dt className='text-text-subtle'>등록 책</dt>
          <dd>{m.bookCount}권</dd>
        </div>
        <div>
          <dt className='text-text-subtle'>AI 호출</dt>
          <dd>{m.aiUsageCount}회</dd>
        </div>
        <div>
          <dt className='text-text-subtle'>상태</dt>
          <dd>{m.suspended ? '정지' : '정상'}</dd>
        </div>
      </dl>

      <SuspendForm userId={m.id} suspended={m.suspended} />

      <div>
        <h2 className='mb-2 text-sm font-medium'>최근 관리 기록</h2>
        {m.recentActions.length === 0 ? (
          <p className='text-sm text-text-subtle'>기록 없음</p>
        ) : (
          <ul className='flex flex-col gap-1 text-sm'>
            {m.recentActions.map((a) => (
              <li key={a.id} className='flex flex-wrap gap-x-3'>
                <span className='text-text-subtle'>
                  {formatKstDateTime(a.createdAt)}
                </span>
                <span>{ACTION_LABEL[a.action] ?? a.action}</span>
                <span className='text-text-subtle'>{a.adminEmail}</span>
                {a.reason && <span>— {a.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
