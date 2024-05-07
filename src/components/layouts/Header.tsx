import { useContext } from 'react';

import LogoutButton from '@components/LogoutButton';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="flex justify-between">
      <h1>
        <Link href="/">page0127</Link>
      </h1>
      <Link href="/auth/signin">로그인</Link>
      {/* <LogoutButton /> */}
    </header>
  );
}
