'use client';

import { Target, Trophy } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';

type Props = {
  /** 목표 연도 */
  year: number;

  /** 목표 권수 */
  target: number;

  /** 현재 읽은 권수 (해당 연도) */
  current: number;

  /** 목표 설정 버튼 클릭 핸들러 (공개 서재는 undefined) */
  onSetGoal?: () => void;
};

/**
 * 연간 독서 목표 진행률 카드
 *
 * 학습 포인트:
 * - Progress 컴포넌트 사용
 * - 진행률 계산 (current / target * 100)
 * - 목표 달성 여부에 따른 메시지 변경
 * - 목표 미설정 시 설정 유도 UI
 */
export const ReadingGoalProgress = ({
  year,
  target,
  current,
  onSetGoal,
}: Props) => {
  // 목표가 설정되지 않은 경우
  if (!target || target === 0) {
    return (
      <Card className='shadow-none'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg text-foreground'>
            <Target className='h-5 w-5 text-primary' />
            {year}년 독서 목표
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-6'>
            <p className='mb-4 text-sm text-muted-foreground'>
              {onSetGoal ? '올해의 독서 목표를 설정해보세요!' : '아직 독서 목표가 설정되지 않았습니다.'}
            </p>
            {onSetGoal && <Button onClick={onSetGoal}>목표 설정하기</Button>}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 진행률 계산
  const progress = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  const isAchieved = current >= target;

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-lg text-foreground'>
            <Target className='h-5 w-5 text-primary' />
            {year}년 독서 목표
          </CardTitle>
          {onSetGoal && (
            <Button variant='outline' size='sm' onClick={onSetGoal}>
              수정
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className='space-y-4 px-0 pb-0'>
        {/* 진행률 표시 */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='font-medium text-foreground'>
              {current} / {target}권
            </span>
            <span className='text-muted-foreground'>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className='h-3' />
        </div>

        {/* 메시지 */}
        <div className='text-center'>
          {isAchieved ? (
            <p className='flex items-center justify-center gap-2 text-sm font-medium text-primary'>
              <Trophy className='h-4 w-4' /> 목표를 달성했어요! 축하합니다!
            </p>
          ) : (
            <p className='text-sm text-muted-foreground'>
              목표까지 <span className='font-semibold text-primary'>{remaining}권</span> 남았어요!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
