'use client';

import styles from './LogoutButton.module.scss';
//firebase
import { auth } from '@firebase/firebaseApp';
import { signOut } from 'firebase/auth';

// lib
import { toast } from 'react-toastify';

import { useModalContext } from '@contexts/ModalContext';
import React from 'react';

export default function LogoutButton({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { open, close } = useModalContext();

  const onClick = async () => {
    open({
      title: '로그아웃 하시겠습니까?',
      buttonLabel: '로그아웃',
      onButtonClick: async () => {
        try {
          await signOut(auth);
          close();
          toast.success('로그아웃 되었습니다!');
        } catch (error) {
          console.log(error);
        }
      },
      closeButtonLabel: '취소',
      closeModal: () => {
        close();
      },
    });
  };

  return (
    <button className={styles.logout} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
