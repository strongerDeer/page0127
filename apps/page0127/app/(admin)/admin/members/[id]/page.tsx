import { notFound } from 'next/navigation';

import { getMemberDetail } from '@/features/admin-members/api/getMemberDetail';
import { SuspendForm } from '@/features/admin-members/ui/SuspendForm';

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
        <h1 className='text-base font-semibold'>
          {m.nickname ?? m.username ?? m.email ?? m.id.slice(0, 8)}
        </h1>
        <p className='text-sm text-text-subtle'>{m.email}</p>
      </div>

      <dl className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-4'>
        <div>
          <dt className='text-text-subtle'>가입일</dt>
          <dd>{m.createdAt.slice(0, 10)}</dd>
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
    </section>
  );
}
