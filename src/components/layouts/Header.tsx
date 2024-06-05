import { useContext } from 'react';
import { AuthContext } from '@contexts/AuthContext';

import LogoutButton from '@components/LogoutButton';
import Link from 'next/link';
import Button from '@components/shared/Button';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const showSignButton = pathname.includes('signup' || 'signin') === false;
  const { user } = useContext(AuthContext);

  return (
    <header className="flex justify-between items-center px-8 h-16 border-b">
      <h1>
        <Link href="/">page0127</Link>
      </h1>

      <div className="flex gap-4">
        {!user ? (
          <>
            {!pathname.includes('signin') && (
              <Link href="/auth/signin">로그인</Link>
            )}
            {!pathname.includes('signup') && (
              <Link href="/auth/signup">회원가입</Link>
            )}
          </>
        ) : (
          <>
            <Button href="/my">마이페이지</Button>

            <LogoutButton />
          </>
        )}
      </div>
    </header>
  );
}
