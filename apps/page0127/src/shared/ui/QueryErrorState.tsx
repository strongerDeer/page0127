'use client';

import { Button } from '@repo/ui';

type QueryErrorStateProps = {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
};

/** 목록 0건과 조회 실패를 구분하고, 해당 요청만 다시 시도한다. */
export const QueryErrorState = ({
  message,
  onRetry,
  isRetrying,
}: QueryErrorStateProps) => (
  <div
    role='alert'
    className='flex flex-col items-center gap-3 rounded-2xl bg-sunken px-4 py-8 text-center'
  >
    <p className='text-sm text-text-body'>{message}</p>
    <Button
      type='button'
      variant='outline'
      onClick={onRetry}
      loading={isRetrying}
    >
      {isRetrying ? '다시 불러오는 중…' : '다시 시도'}
    </Button>
  </div>
);
