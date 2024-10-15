'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { QueryClient, QueryClientProvider } from 'react-query';
import { RecoilRoot } from 'recoil';

// toast
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// context
import { AlertContextProvider } from '@contexts/AlertContext';
import { ModalContextProvider } from '@contexts/ModalContext';
import { ThemeProvider } from '@contexts/ThemeContext';

// components
import Header from './Header';
import Footer from './Footer';
import AuthGuard from '@components/auth/AuthGuard';

import styles from './Layout.module.scss';

const client = new QueryClient({
  defaultOptions: {
    //쿼리 실패 시 재시도 횟수를 0으로 설정. 기본값 3
    queries: {
      retry: 0,
    },
  },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  useReportWebVitals((metric) => {
    console.log(metric);
  });

  return (
    <RecoilRoot>
      <AuthGuard>
        <ToastContainer />
        <ThemeProvider>
          <AlertContextProvider>
            <ModalContextProvider>
              <QueryClientProvider client={client}>
                <div id="root-portal"></div>
                <div className={styles.layout}>
                  <Header />
                  <div className={styles.layout__contents}>{children}</div>
                  <Footer />
                </div>
              </QueryClientProvider>
            </ModalContextProvider>
          </AlertContextProvider>
        </ThemeProvider>
      </AuthGuard>
    </RecoilRoot>
  );
}
