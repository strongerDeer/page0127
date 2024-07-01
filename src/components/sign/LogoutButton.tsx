'use client';

//firebase
import { auth } from '@firebase/firebaeApp';
import { signOut } from 'firebase/auth';

// lib
import { toast } from 'react-toastify';

import Button from '../shared/Button';
import { useRouter } from 'next/navigation';
import { useModalContext } from '@contexts/ModalContext';
import React from 'react';

export default function LogoutButton({
  children,
  text,
  variant,
  color,
}: {
  children?: React.ReactNode;
  text?: string;
  variant?: 'outline' | 'solid' | 'link';
  color?: string;
}) {
  const router = useRouter();

  const { open, close } = useModalContext();

  const onClick = async () => {
    open({
      title: '로그아웃 하시겠습니까?',
      buttonLabel: '로그아웃',
      onButtonClick: async () => {
        try {
          await signOut(auth);
          router.push('/');
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
    <Button type="button" onClick={onClick} variant={variant} color={color}>
      {children ? children : text ? text : 'Logout'}
    </Button>
  );
}
