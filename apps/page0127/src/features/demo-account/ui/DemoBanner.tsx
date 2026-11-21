'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useLogout } from '@/features/auth/api/useLogout';

/**
 * 체험 계정으로 둘러보는 동안 GNB 위에 늘 떠 있는 띠.
 *
 * 저장·수정·삭제를 누르면 각 화면이 "체험 계정은 저장되지 않아요" 안내를 띄우지만,
 * 누르기 전에도 지금이 체험 중이라는 것과 "직접 써 보려면 가입"이라는 길을 보여 준다.
 * 가입 버튼은 체험 세션을 끝내고 로그인 화면으로 보낸다(공용 계정에 소셜 계정이 연결되면 안 된다).
 */
export const DemoBanner = () => {
  const router = useRouter();
  const { logout } = useLogout();
  const [leaving, setLeaving] = useState(false);

  const handleSignup = async () => {
    setLeaving(true);
    await logout();
    // logout 은 보호 경로에서만 홈으로 보낸다 — 가입 버튼은 항상 로그인 화면으로 간다
    router.push('/login');
  };

  return (
    <div
      role='status'
      className='border-b border-line bg-primary/5 text-sm text-foreground'
    >
      <div className='mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center break-keep'>
        <p>
          <span
            aria-hidden
            className='mr-2 inline-block size-2 rounded-full bg-mint align-middle'
          />
          체험 계정으로 둘러보는 중이에요. 저장은 되지 않아요.
        </p>
        <button
          type='button'
          onClick={handleSignup}
          disabled={leaving}
          className='font-medium text-primary underline underline-offset-4 disabled:opacity-60'
        >
          가입하고 내 서재 만들기
        </button>
      </div>
    </div>
  );
};
