'use client';

import { useId, useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import { updateReadingGoal } from '@/entities/profile/api/updateProfile';

type Props = {
  /** 다이얼로그 열림 상태 */
  isOpen: boolean;

  /** 다이얼로그 닫기 핸들러 */
  onClose: () => void;

  /** 사용자 ID */
  userId: string;

  /** 현재 연도 */
  currentYear: number;

  /** 현재 목표 (없으면 null) */
  currentGoal: { year: number; target: number } | null;

  /** 업데이트 성공 콜백 */
  onSuccess: () => void;
};

/**
 * 연간 독서 목표 설정 다이얼로그
 *
 * 학습 포인트:
 * - Dialog 컴포넌트 사용
 * - 폼 상태 관리
 * - Supabase 업데이트 호출
 * - 낙관적 업데이트 (선택 사항)
 */
export const ReadingGoalDialog = ({
  isOpen,
  onClose,
  userId,
  currentYear,
  currentGoal,
  onSuccess,
}: Props) => {
  // 학습 포인트: props를 state 초기값으로만 사용 (derived state 패턴)
  // isOpen이 변경될 때마다 리셋하려면 부모에서 key prop으로 제어하거나
  // 여기서는 초기값만 사용하고 onClose에서 리셋
  const formId = useId();
  const ids = {
    year: `${formId}-year`,
    target: `${formId}-target`,
  };

  const [year, setYear] = useState(currentGoal?.year ?? currentYear);
  const [target, setTarget] = useState(currentGoal?.target ?? 50);
  const [isLoading, setIsLoading] = useState(false);

  // 다이얼로그 닫기 시 state 초기화
  const handleClose = () => {
    setYear(currentGoal?.year ?? currentYear);
    setTarget(currentGoal?.target ?? 50);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (target < 1) {
      toast.error('목표는 최소 1권 이상이어야 합니다.');
      return;
    }

    if (target > 1000) {
      toast.error('목표는 최대 1,000권까지 설정할 수 있습니다.');
      return;
    }

    setIsLoading(true);

    const success = await updateReadingGoal(userId, { year, target });

    if (success) {
      toast.success('독서 목표가 설정되었습니다! 🎯');
      onSuccess();
      onClose();
    } else {
      toast.error('독서 목표 설정에 실패했습니다.');
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>📚 연간 독서 목표 설정</DialogTitle>
          <DialogDescription>
            올해 읽고 싶은 책의 권수를 설정하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            {/* 연도 선택 */}
            <div className='space-y-2'>
              <Label htmlFor={ids.year}>목표 연도</Label>
              <Input
                id={ids.year}
                type='number'
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={2030}
              />
            </div>

            {/* 목표 권수 */}
            <div className='space-y-2'>
              <Label htmlFor={ids.target}>목표 권수</Label>
              <Input
                id={ids.target}
                type='number'
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                min={1}
                max={1000}
                placeholder='예: 50'
              />
              <p className='text-xs text-gray-500'>
                {year}년에 읽고 싶은 책의 권수를 입력하세요 (1~1,000권)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={handleClose}>
              취소
            </Button>
            <Button type='submit' disabled={isLoading}>
              {isLoading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
