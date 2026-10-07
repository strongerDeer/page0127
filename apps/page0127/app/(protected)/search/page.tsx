import { PageContainer, PageHeader } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';

import { UserSearch } from '@/features/user';
import { getRecommendedReaders } from '@/features/user/api/getRecommendedReaders';
import { RecommendedReaders } from '@/features/user/ui/RecommendedReaders';

/**
 * 리더 찾기 페이지
 * 경로: /search
 *
 * 학습 포인트:
 * - Server Component에서 사용자 정보 가져오기
 * - Client Component에 props로 전달 — 데이터뿐 아니라 서버에서 그린 JSX 도 넘길 수 있다
 */
export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 검색어를 몰라도 만날 수 있게 — 본인은 빼고 추천한다
  const readers = await getRecommendedReaders(user?.id);

  return (
    <PageContainer width='narrow' className='space-y-6'>
      <PageHeader
        title='리더 찾기'
        description='닉네임으로 찾거나, 최근 기록한 리더를 둘러보세요'
      />

      <UserSearch
        currentUserId={user?.id}
        emptyState={
          readers.length > 0 ? <RecommendedReaders readers={readers} /> : null
        }
      />
    </PageContainer>
  );
}
