'use client';

import { useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/config/supabase/client';

import { toLinkedAccountRows } from '../model/linkedAccounts';
import { OAUTH_PROVIDERS, type OAuthProvider } from '../model/providers';

/** 이 화면 하나만 쓰는 키지만, 무효화하려면 이름이 있어야 한다 */
export const linkedAccountKeys = {
  all: ['linkedAccounts'] as const,
};

const fetchLinkedAccounts = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUserIdentities();

  // useQuery 가 에러 상태로 넘어가도록 던진다 — null 을 돌려주면
  // "연결이 하나도 없음"과 "못 읽음"이 화면에서 같아 보인다.
  if (error) throw error;

  return toLinkedAccountRows(data?.identities ?? []);
};

/**
 * 연결된 소셜 계정 조회·연결·해제.
 *
 * 대부분의 사용자는 이 기능이 필요 없다 — 같은 이메일이면 Supabase 가 알아서
 * identity 를 붙여 준다. 구글과 카카오에 **다른 이메일**을 쓴 사람이 갈라진
 * 계정을 직접 합치는 자리다.
 *
 * ⚠️ linkIdentity 는 Supabase 의 **Manual Linking 이 켜져 있어야** 동작한다
 *    (로컬은 config.toml 의 enable_manual_linking, 운영·개발은 대시보드).
 *    꺼져 있으면 422 가 돌아온다.
 */
export const useLinkedAccounts = () => {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );

  const {
    data: rows,
    isPending,
    isError,
  } = useQuery({
    queryKey: linkedAccountKeys.all,
    queryFn: fetchLinkedAccounts,
  });

  /** 공급자를 새로 연결한다. 성공하면 브라우저가 공급자 페이지로 떠난다. */
  const link = async (provider: OAuthProvider) => {
    setPendingProvider(provider);
    setActionError(null);

    const supabase = createClient();
    const siteUrl = location.origin || process.env.NEXT_PUBLIC_SITE_URL;

    // 연결이 끝나면 설정 화면으로 돌아온다 — 시작한 자리로 돌려보내야
    // 사용자가 "됐나?" 하고 목록을 다시 찾아 헤매지 않는다.
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/settings')}`,
      },
    });

    // 성공하면 여기 아래는 실행되지 않는다(외부로 리디렉션).
    if (error) {
      console.error('계정 연결 실패:', error.message);
      setActionError(
        `${OAUTH_PROVIDERS[provider].label}에 연결하지 못했어요. 이미 다른 계정에서 쓰고 있는 계정일 수 있어요.`
      );
      setPendingProvider(null);
    }
  };

  /** 연결을 끊는다. 마지막 하나는 UI 가 막지만 서버 응답도 그대로 반영한다. */
  const unlink = async (provider: OAuthProvider) => {
    setPendingProvider(provider);
    setActionError(null);

    const supabase = createClient();

    // unlinkIdentity 는 provider 이름이 아니라 identity 객체를 받는다.
    // 목록을 지금 다시 읽는다 — 캐시된 행에는 그 객체가 없다.
    const { data, error: fetchError } = await supabase.auth.getUserIdentities();
    const target = data?.identities.find((i) => i.provider === provider);

    if (fetchError || !target) {
      console.error('해제할 계정을 찾지 못했습니다:', fetchError?.message);
      setActionError('연결을 끊지 못했어요. 새로고침 후 다시 시도해 주세요.');
      setPendingProvider(null);
      return;
    }

    const { error } = await supabase.auth.unlinkIdentity(target);

    if (error) {
      console.error('계정 해제 실패:', error.message);
      setActionError('연결을 끊지 못했어요. 잠시 후 다시 시도해 주세요.');
    }

    await queryClient.invalidateQueries({ queryKey: linkedAccountKeys.all });
    setPendingProvider(null);
  };

  return {
    /** 아직 못 읽었으면 undefined */
    rows,
    isPending,
    /** 조회 실패와 동작 실패를 한 자리에서 보여 준다 */
    error: isError ? '연결된 계정을 불러오지 못했어요.' : actionError,
    pendingProvider,
    link,
    unlink,
  };
};
