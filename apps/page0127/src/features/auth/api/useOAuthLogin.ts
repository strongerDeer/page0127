'use client';

import { useState } from 'react';

import { createClient } from '@/shared/config/supabase/client';
import { toSafeRedirect } from '@/shared/lib/auth/safeRedirect';

import type { OAuthProvider } from '@/features/auth/model/providers';

/**
 * 소셜 로그인 훅 — 프로바이더를 인자로 받는다.
 *
 * 구글 전용이던 useGoogleLogin 을 대체한다. 카카오를 붙이면서 파일을 복사하면
 * 리디렉션 URL 조립 로직이 두 벌이 되고 한쪽만 고치는 사고가 난다.
 *
 * 로딩·에러 상태는 예전에 TODO 주석으로만 남아 있었다. 그동안 signInWithOAuth 가
 * 실패해도 console.error 만 찍히고 **화면은 아무 반응이 없어서** 사용자는 버튼이
 * 죽은 줄 알았다. 이제 둘 다 실제로 돌려준다.
 *
 * @example
 * const { login, isLoading, error } = useOAuthLogin();
 * <button onClick={() => login('kakao')} disabled={isLoading}>…</button>
 */
export const useOAuthLogin = () => {
  // 어느 프로바이더가 진행 중인지 — 버튼이 여러 개라 자기 것만 스피너를 돌려야 한다
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  /**
   * @param provider 로그인에 쓸 소셜 프로바이더
   * @param next 로그인 후 돌아갈 내부 경로. 없으면 콜백이 본인 서재로 보낸다
   */
  const login = async (provider: OAuthProvider, next?: string | null) => {
    setPendingProvider(provider);
    setError(null);

    const supabase = createClient();

    // OAuth 리디렉션 URL 설정
    // - 항상 "지금 접속 중인 브라우저 도메인"(location.origin)을 우선한다.
    //   → 로컬은 localhost:3000, 프로덕션은 배포 도메인이 자동으로 잡힘.
    // - NEXT_PUBLIC_* 는 빌드 타임에 값이 박혀서, localhost로 빌드하면
    //   프로덕션에서도 localhost로 돌아오는 문제가 있었음 → 환경변수는 폴백으로만.
    const siteUrl = location.origin || process.env.NEXT_PUBLIC_SITE_URL;

    // 로그인 뒤 돌아갈 곳을 콜백까지 들려 보낸다.
    // 여기서 한 번 걸러도 콜백에서 다시 검증한다 — 콜백 URL 은 사용자가 직접
    // 만들어 열 수 있어서 클라이언트 검증만으로는 못 막는다.
    const safeNext = toSafeRedirect(next);
    const callbackUrl = safeNext
      ? `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`
      : `${siteUrl}/auth/callback`;

    // signInWithOAuth 는 성공하면 즉시 외부 로그인 페이지로 리디렉션된다.
    // 그래서 성공 경로에서는 pendingProvider 를 되돌리지 않는다 — 되돌리면
    // 리디렉션 직전에 버튼이 잠깐 되살아나 두 번 눌릴 수 있다.
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });

    if (signInError) {
      console.error('소셜 로그인 오류:', signInError.message);
      setError('로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setPendingProvider(null);
    }
  };

  return {
    login,
    /** 진행 중인 프로바이더 (없으면 null) */
    pendingProvider,
    isLoading: pendingProvider !== null,
    error,
  };
};
