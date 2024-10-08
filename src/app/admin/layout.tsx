import AdminRoute from '@components/auth/AdminRoute';
import Button from '@components/shared/Button';

import styles from './AdminLayout.module.scss';
import clsx from 'clsx';

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className={clsx('max-width', styles.wrap)}>
        <div className={styles.menu}>
          <Button href="/admin/banner" variant="link">
            배너
          </Button>
          <Button href="/admin/faq" variant="link">
            FAQ
          </Button>
          <Button href="/admin/club" variant="link">
            모임
          </Button>
        </div>

        <div className={styles.contents}> {children}</div>
      </div>
    </AdminRoute>
  );
}
