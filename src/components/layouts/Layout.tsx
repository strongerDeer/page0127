'use client';
import { AuthContextProvider } from '@contexts/AuthContext';

import Header from './Header';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeleteBookModal from '@components/DeleteBookModal';
import { ModalContext } from '@contexts/ModalContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      <ModalContext>
        <ToastContainer />
        <Header />
        <div className="max-width">{children}</div>
        {/* <DeleteBookModal /> */}
      </ModalContext>
    </AuthContextProvider>
  );
}
