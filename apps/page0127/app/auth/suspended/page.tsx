import Link from 'next/link';

/**
 * 계정 정지 안내 페이지
 *
 * - 정지(ban)된 계정이 로그인을 시도하면 세션 교환이 실패한다.
 * - 일반 '인증 오류'로 보내면 "다시 시도"를 권하게 되는데, 정지는 재시도로
 *   풀리지 않으므로 별도 안내로 분리한다.
 * - 미인증 요청이라 유저 신원을 알 수 없어, 사유·해제일 같은 개인 정보는 넣지 않는다.
 */
const SuspendedPage = () => {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='heading-1 mb-4 text-text-strong'>정지된 계정입니다</h1>
        <p className='mb-6 text-muted-foreground'>
          회원님의 계정은 현재 이용이 정지되어 로그인할 수 없습니다.
        </p>
        <Link
          href='/'
          className='rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default SuspendedPage;
