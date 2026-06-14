'use client';

import { useFormStatus } from 'react-dom';

import { Button } from '@/shared/ui/button';

type SubmitButtonProps = {
  /** 평상시 라벨 */
  label?: string;
  /** 제출 중 라벨 */
  pendingLabel?: string;
};

/**
 * 폼 제출 버튼 (useFormStatus)
 *
 * 학습 포인트 — Day 57:
 * - 부모 <form>의 제출 상태(pending)를 "직접" 읽는다 → isPending을 prop으로 안 받음
 * - ⚠️ 반드시 <form>의 "자식"으로 렌더돼야 동작 (같은 컴포넌트 안의 form은 못 읽음)
 * - useFormStatus는 'react'가 아니라 'react-dom'에서 import
 */
export const SubmitButton = ({
  label = '저장',
  pendingLabel = '저장 중...',
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
};
