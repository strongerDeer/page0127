'use client';

import { Button } from '@repo/ui';
import { Loader2 } from 'lucide-react';

import { useLinkedAccounts } from '../api/useLinkedAccounts';
import { UNLINK_BLOCKED_MESSAGE } from '../model/linkedAccounts';
import { OAUTH_PROVIDERS } from '../model/providers';

/**
 * 설정 화면의 "연결된 계정" 섹션.
 *
 * 대부분의 사용자는 여기 올 일이 없다 — 같은 이메일이면 Supabase 가 알아서
 * 붙여 준다. 구글과 카카오에 **다른 이메일**을 쓴 사람이 계정을 직접 합치는 자리다.
 */
export const LinkedAccountsSection = () => {
  const { rows, isPending, error, pendingProvider, link, unlink } =
    useLinkedAccounts();

  return (
    <section className='mt-6 rounded-2xl bg-sunken px-5 py-4'>
      <h2 className='text-sm font-medium text-text-strong'>연결된 계정</h2>
      <p className='mt-1 text-sm text-text-subtle'>
        연결해 두면 어느 쪽으로 로그인해도 같은 서재로 들어옵니다.
      </p>

      {/* 목록을 읽기 전에는 빈 자리를 두지 않는다 — 갑자기 항목이 튀어나오면
          레이아웃이 흔들린다 */}
      {isPending || !rows ? (
        <p className='mt-4 text-sm text-text-subtle'>불러오는 중…</p>
      ) : (
        <ul className='mt-4 space-y-2'>
          {rows.map(({ provider, isLinked, canUnlink }) => {
            const { label, mark } = OAUTH_PROVIDERS[provider];
            const isPending = pendingProvider === provider;

            return (
              <li
                key={provider}
                className='flex items-center justify-between gap-4'
              >
                <span className='flex items-center gap-2 text-sm text-text-body'>
                  {mark}
                  {label}
                </span>

                {isLinked ? (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={!canUnlink || isPending}
                    // 비활성 버튼은 title 이 안 뜨는 브라우저가 있어 aria 로도 남긴다
                    title={canUnlink ? undefined : UNLINK_BLOCKED_MESSAGE}
                    aria-describedby={
                      canUnlink ? undefined : `unlink-blocked-${provider}`
                    }
                    onClick={() => unlink(provider)}
                  >
                    {isPending ? (
                      <Loader2 aria-hidden className='size-4 animate-spin' />
                    ) : (
                      '연결 끊기'
                    )}
                  </Button>
                ) : (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={isPending}
                    onClick={() => link(provider)}
                  >
                    {isPending ? (
                      <Loader2 aria-hidden className='size-4 animate-spin' />
                    ) : (
                      '연결하기'
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 마지막 하나를 못 끊는 이유는 항상 글로도 보여 준다 —
          비활성 버튼만 두면 사용자는 고장으로 읽는다 */}
      {rows?.some((r) => r.isLinked && !r.canUnlink) && (
        <p
          id={`unlink-blocked-${rows.find((r) => r.isLinked && !r.canUnlink)?.provider}`}
          className='mt-3 text-xs text-text-subtle'
        >
          {UNLINK_BLOCKED_MESSAGE}
        </p>
      )}

      {error && (
        <p role='alert' className='mt-3 text-sm text-destructive'>
          {error}
        </p>
      )}
    </section>
  );
};
