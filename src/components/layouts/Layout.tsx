'use client';

import dynamic from 'next/dynamic';
import { useReportWebVitals } from 'next/web-vitals';

import styles from './Layout.module.scss';
import 'react-toastify/dist/ReactToastify.css';

import Providers from './Provider';
import AuthGuard from '@components/auth/AuthGuard';
import { HeaderSkeleton } from './Header';

const Header = dynamic(() => import('./Header'), {
  loading: () => <HeaderSkeleton />,
});
const Footer = dynamic(() => import('./Footer'));
// toast
const ToastContainer = dynamic(
  () => import('react-toastify').then((mod) => mod.ToastContainer),
  { ssr: false }, // 클라이언트만 사용
);

export default function Layout({ children }: { children: React.ReactNode }) {
  useReportWebVitals((metric: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(metric);
    }
  });

  return (
    <Providers>
      <AuthGuard>
        <ToastContainer />
        <div id="root-portal"></div>
        <div className={styles.layout}>
          <Header />
          <div className={styles.layout__contents}>{children}</div>
          <Footer />
        </div>
      </AuthGuard>
    </Providers>
  );
}
