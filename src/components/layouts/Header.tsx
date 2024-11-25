import Link from 'next/link';

import styles from './Header.module.scss';

import { cormorant } from '@font';
import useUser, { useUserLoading } from '@connect/user/useUser';

import { ROUTES } from '@constants';
import AuthButtons from './AuthButtons';
import UserButtons from './UserButtons';
import Icon from '@components/icon/Icon';
import ProfileImage from '@components/shared/ProfileImage';
import clsx from 'clsx';

export default function Header() {
  const user = useUser();
  const isLoading = useUserLoading();

  return (
    <header className={styles.header}>
      <Link href={ROUTES.HOME} className={styles.header__h1}>
        <h1 className={cormorant.className}>
          page 0127<span>.</span>
        </h1>
      </Link>

      {!isLoading && (
        <div className={styles.header__right}>
          {user ? <UserButtons user={user} /> : <AuthButtons />}
        </div>
      )}
    </header>
  );
}

export function HeaderSkeleton() {
  return (
    <header className={clsx(styles.header, styles.skeleton)}>
      <Link href={ROUTES.HOME} className={styles.header__h1}>
        <h1 className={cormorant.className}>
          page 0127<span>.</span>
        </h1>
      </Link>
    </header>
  );
}
