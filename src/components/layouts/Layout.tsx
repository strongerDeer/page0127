'use client';

// query
import { QueryClient, QueryClientProvider } from 'react-query';

// toast
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// context
// import { AuthContextProvider } from '@contexts/AuthContext';
// import { ModalContextProvider } from '@contexts/ModalContext';
// import { AlertContextProvider } from '@contexts/AlertContext';

// components
import Header from './Header';
import Footer from './Footer';

const client = new QueryClient({
  defaultOptions: {},
});

import styles from './Layout.module.scss';
import { RecoilRoot } from 'recoil';
import AuthGuard from '@components/auth/AuthGuard';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RecoilRoot>
      <AuthGuard>
        <ToastContainer />
        <div id="root-portal"></div>
        <div className={styles.layout}>
          <Header />
          <div className={styles.layout__contents}>{children}</div>
          <Footer />
        </div>
        {/* <AuthContextProvider>
        <ModalContextProvider>
          <QueryClientProvider client={client}>
            <AlertContextProvider>



            </AlertContextProvider>
          </QueryClientProvider>
        </ModalContextProvider>
      </AuthContextProvider> */}
      </AuthGuard>
    </RecoilRoot>
  );
}
