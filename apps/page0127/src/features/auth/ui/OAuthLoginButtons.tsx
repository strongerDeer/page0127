'use client';

import { Button } from '@repo/ui';
import { Loader2 } from 'lucide-react';

import { useOAuthLogin } from '@/features/auth/api/useOAuthLogin';
import {
  LOGIN_PROVIDER_ORDER,
  OAUTH_PROVIDERS,
} from '@/features/auth/model/providers';

type OAuthLoginButtonsProps = {
  /** 로그인 후 돌아갈 내부 경로. 로그인 페이지가 ?redirect= 에서 받아 넘긴다 */
  next?: string | null;
};

/**
 * 소셜 로그인 버튼 묶음.
 *
 * 프로바이더별 문구·색·마크는 `model/providers` 하나가 갖는다. 프로바이더가
 * 늘어날 때 이 파일은 손대지 않는다.
 *
 * 실패했을 때 아무 말도 하지 않던 것을 고쳤다 — 예전에는 signInWithOAuth 가
 * 실패해도 console.error 만 찍혀서 사용자는 버튼이 죽은 줄 알았다.
 */
export const OAuthLoginButtons = ({ next }: OAuthLoginButtonsProps) => {
  const { login, pendingProvider, isLoading, error } = useOAuthLogin();

  return (
    <div className='space-y-3'>
      {LOGIN_PROVIDER_ORDER.map((provider) => {
        const { label, className, mark } = OAUTH_PROVIDERS[provider];
        const isPending = pendingProvider === provider;

        return (
          <Button
            key={provider}
            type='button'
            size='lg'
            // variant 를 주지 않고 색을 직접 얹는다 — 카카오는 브랜드가 색을
            // 규정해서 디자인 시스템의 어느 variant 에도 맞지 않는다
            variant='ghost'
            className={`w-full ${className}`}
            // 다른 버튼이 진행 중이면 전부 잠근다. 두 창을 동시에 여는 것을 막는다.
            disabled={isLoading}
            onClick={() => login(provider, next)}
          >
            {isPending ? (
              <Loader2 aria-hidden className='size-5 animate-spin' />
            ) : (
              mark
            )}
            {label}
          </Button>
        );
      })}

      {/* 오류는 버튼 바로 아래에 붙인다 — 페이지 최상단에 띄우면 못 찾는다 */}
      {error && (
        <p role='alert' className='text-center text-sm text-destructive'>
          {error}
        </p>
      )}
    </div>
  );
};
