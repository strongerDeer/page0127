'use client';

import { useState, useTransition } from 'react';

import { setTestAccount } from '@/features/admin-members/api/testAccountActions';

/**
 * 회원 상세의 "테스트 계정" 표시 토글.
 * 체험 계정은 시드 스크립트가 관리하므로 여기서 바꾸지 않고 안내만 한다.
 */
export const TestAccountToggle = ({
  userId,
  isTest,
  isDemo,
}: {
  userId: string;
  isTest: boolean;
  isDemo: boolean;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isDemo) {
    return (
      <p className='rounded border border-line p-4 text-sm text-text-subtle'>
        체험 계정이에요. 회원 수·지표에서 이미 빠져 있어요.
      </p>
    );
  }

  const onToggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setTestAccount(userId, !isTest);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : '변경 중 오류가 발생했습니다.'
        );
      }
    });
  };

  return (
    <div className='rounded border border-line p-4'>
      <div className='mb-1 text-sm font-medium'>
        테스트 계정 {isTest ? '(켜짐)' : ''}
      </div>
      <p className='mb-3 text-xs text-text-subtle'>
        켜면 회원 수·활성 지표에서 빠지고, 탈퇴해도 탈퇴 기록에 남지 않아요.
        다시 가입하면 새 계정이라 다시 켜야 해요.
      </p>
      <button
        type='button'
        onClick={onToggle}
        disabled={isPending}
        className='rounded border border-line px-3 py-2 text-sm hover:bg-accent disabled:opacity-50'
      >
        {isTest ? '테스트 계정 해제' : '테스트 계정으로 표시'}
      </button>
      {error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
    </div>
  );
};
