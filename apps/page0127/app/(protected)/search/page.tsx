import { createClient } from '@/shared/config/supabase/server';
import { PageContainer } from '@/shared/ui/PageContainer';

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
      <div>
        <h1 className='text-2xl font-bold'>사용자 검색</h1>
        <p className='mt-2 text-muted-foreground'>
          닉네임이나 사용자명으로 다른 사용자를 찾아보세요
        </p>
      </div>

      <UserSearch currentUserId={user?.id} />
    </PageContainer>
  );
}
