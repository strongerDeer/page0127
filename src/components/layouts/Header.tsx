import { Suspense, useContext } from 'react';
import { AuthContext } from '@contexts/AuthContext';

import LogoutButton from '@components/LogoutButton';
import Link from 'next/link';
import Loading from '@components/Loading';
import Chart from '@components/Chart';

export default function Header() {
  const { user } = useContext(AuthContext);

  return (
    <header className="flex justify-between items-center px-8 h-16 border-b mb-16">
      <h1>
        <Link href="/">page0127</Link>
      </h1>

      <div className="flex gap-4">
        {!user ? (
          <Link href="/auth/signin">로그인</Link>
        ) : (
          <>
            <Link href="/my">마이페이지</Link>
            <LogoutButton />
          </>
        )}
      </div>
    </header>
  );
}
