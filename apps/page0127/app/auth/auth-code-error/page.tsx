import Link from 'next/link';

/**
 * 인증 에러 페이지
 *
 * - OAuth 콜백 실패 시 표시되는 페이지
 * - 사용자에게 명확한 에러 메시지 제공
 */
const AuthCodeErrorPage = () => {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='mb-4 text-2xl font-bold'>인증 오류</h1>
        <p className='mb-6 text-gray-600'>
          로그인 중 문제가 발생했습니다. 다시 시도해주세요.
        </p>
        <Link
          href='/login'
          className='rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default AuthCodeErrorPage;
