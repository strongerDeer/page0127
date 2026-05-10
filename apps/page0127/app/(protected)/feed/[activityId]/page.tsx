import { ActivityDetail } from '@/widgets/activity';

/**
 * 활동 상세 페이지
 * 경로: /feed/[activityId]
 *
 * 학습 포인트:
 * - 단일 활동의 상세 정보 표시
 * - 댓글 전체 보기
 * - 알림에서 특정 활동으로 이동
 */
export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;

  return (
    <div className='mx-auto max-w-3xl space-y-6 p-6'>
      <ActivityDetail activityId={activityId} />
    </div>
  );
}
