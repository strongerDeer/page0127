'use client';

import { useActionState, useEffect, useId } from 'react';

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
import { SubmitButton } from '@/shared/ui/SubmitButton';

import {
  type ReadingGoalActionState,
  updateReadingGoalAction,
} from '@/features/profile/api/updateReadingGoalAction';

type Props = {
  /** 다이얼로그 열림 상태 */
  isOpen: boolean;

  /** 다이얼로그 닫기 핸들러 */
  onClose: () => void;

  /** 현재 연도 */
  currentYear: number;

  /** 현재 목표 (없으면 null) */
  currentGoal: { year: number; target: number } | null;

  /** 업데이트 성공 콜백 */
  onSuccess: () => void;
};

// useActionState의 초기 상태 (아직 제출 전)
const initialState: ReadingGoalActionState = { status: 'idle', message: '' };

/**
 * 연간 독서 목표 설정 다이얼로그
 *
 * 학습 포인트 (useActionState 전환):
 * - useState 3개(year, target, isLoading) → useActionState 하나로 통합
 * - 입력값은 value/onChange 대신 name + defaultValue (FormData가 자동 수집)
 * - 제출은 onSubmit/preventDefault 대신 <form action={formAction}>
 * - 성공/실패 후처리(toast·콜백)는 state 변화를 useEffect로 감지
 */
export const ReadingGoalDialog = ({
  isOpen,
  onClose,
  currentYear,
  currentGoal,
  onSuccess,
}: Props) => {
  const formId = useId();
  const ids = {
    year: `${formId}-year`,
    target: `${formId}-target`,
  };

  // [state, formAction] — Server Action을 연결
  // isPending은 제출 버튼(SubmitButton)이 useFormStatus로 직접 읽으므로 구조분해하지 않음
  const [state, formAction] = useActionState(
    updateReadingGoalAction,
    initialState
  );

  // action이 반환한 state가 바뀌면 후처리 (toast + 성공 시 부모 콜백)
  // 콜백은 부모에서 useCallback으로 안정화돼 있어 deps에 넣어도 재실행 안전
  useEffect(() => {
    if (state.status === 'success') {
      toast.success(state.message);
      onSuccess();
      onClose();
    } else if (state.status === 'error') {
      toast.error(state.message);
    }
  }, [state, onSuccess, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>연간 독서 목표 설정</DialogTitle>
          <DialogDescription>
            올해 읽고 싶은 책의 권수를 설정하세요.
          </DialogDescription>
        </DialogHeader>

        {/* onSubmit 대신 action에 Server Action을 연결 */}
        <form action={formAction}>
          <div className='space-y-4 py-4'>
            {/* 연도 선택 — name으로 FormData에 수집됨 */}
            <div className='space-y-2'>
              <Label htmlFor={ids.year}>목표 연도</Label>
              <Input
                id={ids.year}
                name='year'
                type='number'
                defaultValue={currentGoal?.year ?? currentYear}
                min={2020}
                max={2030}
              />
            </div>

            {/* 목표 권수 */}
            <div className='space-y-2'>
              <Label htmlFor={ids.target}>목표 권수</Label>
              <Input
                id={ids.target}
                name='target'
                type='number'
                defaultValue={currentGoal?.target ?? 50}
                min={1}
                max={1000}
                placeholder='예: 50'
              />
              <p className='text-xs text-muted-foreground'>
                읽고 싶은 책의 권수를 입력하세요 (1~1,000권)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              취소
            </Button>
            {/* useFormStatus가 부모 <form>의 pending을 직접 읽음 → isPending prop 불필요 */}
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
