import { createClient } from '@/shared/config/supabase/server';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';

import { UserSearch } from '@/features/user';

/**
 * 사용자 검색 페이지
 * 경로: /search
 *
 * 학습 포인트:
 * - Server Component에서 사용자 정보 가져오기
 * - Client Component에 props로 전달
 */
export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageContainer width='narrow' className='space-y-6'>
      <PageHeader
        title='사용자 검색'
        description='닉네임이나 아이디로 함께 읽는 사람을 찾아보세요'
      />

      <UserSearch currentUserId={user?.id} />
    </PageContainer>
  );
}
