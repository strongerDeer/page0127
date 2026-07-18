import { PageContainer } from '@/shared/ui/PageContainer';

import { ActivityFeed } from '@/widgets/activity';

/**
 * 활동 피드 페이지
 * 경로: /feed
 *
 * 학습 포인트:
 * - 팔로잉한 사용자들의 활동 타임라인
 * - 무한 스크롤로 과거 활동 로드
 */
export default function FeedPage() {
  return (
    <PageContainer width='content' className='space-y-8'>
      <header>
        <h1 className='heading-1 text-text-strong'>피드</h1>
        <p className='mt-2 text-sm text-text-subtle'>
          함께 읽는 사람들의 새로운 독서 기록을 만나보세요.
        </p>
      </header>

      <ActivityFeed />
    </PageContainer>
  );
}
