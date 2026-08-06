import Link from 'next/link';

import type { AuthErrorReason } from '@/shared/lib/auth/authErrorReason';

/**
 * 인증 실패 안내 페이지
 *
 * - OAuth 콜백이 ?reason= 으로 실어 준 사유에 맞는 문구를 고른다
 *
 * 학습 포인트: searchParams 를 Server Component 에서 직접 읽는다.
 * 로그인 페이지가 ?redirect= 를 다루는 방식과 같다 — 클라이언트에서
 * useSearchParams 로 읽으면 Suspense 경계가 필요해진다.
 */

const MESSAGES: Record<AuthErrorReason, string> = {
  cancelled: '로그인을 완료하지 않았어요. 다시 시도해 주세요.',
  expired: '로그인 요청이 만료됐어요. 다시 시도해 주세요.',
  unknown: '로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
};

/** 쿼리는 사용자가 손으로 고칠 수 있다 — 아는 값만 통과시킨다 */
const toReason = (raw: string | undefined): AuthErrorReason =>
  raw === 'cancelled' || raw === 'expired' ? raw : 'unknown';

type AuthCodeErrorPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

const AuthCodeErrorPage = async ({ searchParams }: AuthCodeErrorPageProps) => {
  const { reason } = await searchParams;

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        {/* '인증 오류'라고 하지 않는다 — 사용자가 스스로 취소한 경우가 가장 흔하고,
            그건 오류가 아니다 */}
        <h1 className='heading-1 mb-4'>로그인하지 못했어요</h1>
        <p className='mb-6 text-muted-foreground'>
          {MESSAGES[toReason(reason)]}
        </p>
        <Link
          href='/login'
          className='rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default AuthCodeErrorPage;
