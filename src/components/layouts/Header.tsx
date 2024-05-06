import { useContext } from 'react';
import { AuthContext } from '@contexts/AuthContext';

import LogoutButton from '@components/LogoutButton';
import Link from 'next/link';

export default function Header() {
  const { user } = useContext(AuthContext);

  return (
    <header>
      {!user ? <Link href="/auth/signin">로그인</Link> : <LogoutButton />}
    </header>
  );
}
