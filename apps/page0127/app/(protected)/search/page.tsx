import Link from 'next/link';

import { PageContainer, PageHeader } from '@repo/ui';
import { ChevronLeft } from 'lucide-react';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

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
  const user = await getCurrentUser();

  // 검색어를 몰라도 만날 수 있게 — 제작자 + 팔로우로 이어진 리더만(모르는 사람은 노출하지 않는다)
  const readers = await getRecommendedReaders(user?.id);

  return (
    <PageContainer className='space-y-6'>
      <PageHeader
        title='리더 찾기'
        description='닉네임으로 리더를 찾아보세요'
        // 메뉴 칸이 아니라 라운지 안에서 들어오는 곳이 됐다(2026-11-26 HJ) → 돌아갈 길
        above={
          <Link
            href='/feed'
            className='inline-flex items-center gap-0.5 text-sm text-text-subtle hover:text-text-strong'
          >
            <ChevronLeft aria-hidden='true' className='size-4' />
            라운지로
          </Link>
        }
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
