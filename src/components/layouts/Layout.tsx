'use client';
import { AuthContextProvider } from '@contexts/AuthContext';

import Header from './Header';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      <ToastContainer />
      <Header />
      {children}
    </AuthContextProvider>
  );
}
