'use client';

/**
 * ActivityDetail 컴포넌트
 * 활동 상세 정보 표시
 *
 * 학습 포인트:
 * - 단일 활동 조회 및 표시
 * - ActivityCard 재사용
 * - 댓글 섹션 항상 펼친 상태
 */

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { Button } from '@/shared/ui/button';

import { ActivityCard } from './ActivityCard';

type ActivityDetailProps = {
  activityId: string;
}

export const ActivityDetail = ({ activityId }: ActivityDetailProps) => {
  const router = useRouter();

  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/activities/${activityId}`);
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className='rounded-lg border border-gray-200 bg-gray-50 py-12 text-center'>
        <p className='text-gray-600'>활동을 찾을 수 없습니다</p>
        <Button
          variant='ghost'
          onClick={() => router.push('/feed')}
          className='mt-4'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          피드로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 뒤로 가기 버튼 */}
      <Button variant='ghost' onClick={() => router.back()}>
        <ArrowLeft className='mr-2 h-4 w-4' />
        뒤로 가기
      </Button>

      {/* 활동 카드 (댓글 섹션 항상 펼침) */}
      <ActivityCard activity={activity} initialCommentsOpen={true} />
    </div>
  );
}
