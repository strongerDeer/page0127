import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageContainer, PageHeader } from '@repo/ui';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfile } from '@/entities/profile/api/getProfile';

import { LibraryManagement } from '@/features/bulk-management/ui/LibraryManagement';

export default async function LibraryManagePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=%2Flibrary%2Fmanage');
  const profile = await getProfile(user.id);
  return (
    <PageContainer width='content' className='space-y-6'>
      <PageHeader
        title='서재 관리'
        description='회독별 독서 기록을 선택해 공개 범위를 바꾸거나 삭제해요.'
        above={
          <Link
            className='text-sm text-text-body hover:underline'
            href={profile?.username ? `/${profile.username}` : '/dashboard'}
          >
            내 서재로
          </Link>
        }
      />
      <LibraryManagement userId={user.id} />
    </PageContainer>
  );
}
