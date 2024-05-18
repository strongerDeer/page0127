'use client';
import { AuthContextProvider } from '@contexts/AuthContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ModalContext } from '@contexts/ModalContext';

import Header from './Header';
import DeleteBookModal from '@components/DeleteBookModal';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthContextProvider>
        <ModalContext>
          <ToastContainer />
          <Header />
          <div className="max-width">{children}</div>
          {/* <DeleteBookModal />*/}
        </ModalContext>
      </AuthContextProvider>
    </>
  );
}
