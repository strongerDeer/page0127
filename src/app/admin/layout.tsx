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
        </div>

        <div className={styles.contents}> {children}</div>
      </div>
    </AdminRoute>
  );
}
