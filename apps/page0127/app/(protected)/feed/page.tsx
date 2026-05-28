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
    <div className='mx-auto max-w-3xl space-y-6 p-6'>
      <div>
        <h1 className='text-2xl font-bold'>활동 피드</h1>
        <p className='mt-2 text-muted-foreground'>
          팔로잉한 친구들의 독서 활동을 확인해보세요
        </p>
      </div>

      <ActivityFeed />
    </div>
  );
}
