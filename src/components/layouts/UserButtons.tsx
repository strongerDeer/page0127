import Button from '@components/shared/Button';
import { User } from '@connect/user';
import { ROUTES } from '@constants';
import Link from 'next/link';

import styles from './UserButtons.module.scss';
import Icon from '@components/icon/Icon';
import ProfileMenu from './ProfileMenu';
import AlarmBtn from './AlarmBtn';

export default function UserButtons({ user }: { user: User }) {
  return (
    <>
      {user?.uid === process.env.NEXT_PUBLIC_ADMIN_ID && (
        <Button href={ROUTES.ADMIN}>관리자</Button>
      )}

      <Link href={ROUTES.BOOK_CREATE} className={styles.iconBtn}>
        <Icon name="addBook" color="#29D063" />
        <span className="a11y-hidden">읽은 책 등록</span>
      </Link>
      {/* <AlarmBtn /> */}
      <ProfileMenu user={user} />
    </>
  );
}
