'use client';

// query
import { QueryClient, QueryClientProvider } from 'react-query';

// toast
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// context
import { AuthContextProvider } from '@contexts/AuthContext';
import { ModalContextProvider } from '@contexts/ModalContext';
import { AlertContextProvider } from '@contexts/AlertContext';

// components
import Header from './Header';

const client = new QueryClient({
  defaultOptions: {},
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthContextProvider>
        <ModalContextProvider>
          <QueryClientProvider client={client}>
            <AlertContextProvider>
              <ToastContainer />
              <Header />
              <div className="max-width">{children}</div>
            </AlertContextProvider>
          </QueryClientProvider>
        </ModalContextProvider>
      </AuthContextProvider>
    </>
  );
}
