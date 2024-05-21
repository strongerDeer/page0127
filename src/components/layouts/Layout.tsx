'use client';
import { AuthContextProvider } from '@contexts/AuthContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ModalContextProvider } from '@contexts/ModalContext';
import { AlertContextProvider } from '@contexts/AlertContext';

import Header from './Header';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthContextProvider>
        <ModalContextProvider>
          <AlertContextProvider>
            <ToastContainer />
            <Header />
            <div className="max-width">{children}</div>
          </AlertContextProvider>
        </ModalContextProvider>
      </AuthContextProvider>
    </>
  );
}
