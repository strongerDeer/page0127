'use client';
import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';
import { useEffect } from 'react';

export default function DeleteBookModal() {
  const { open, close } = useModalContext() as ModalContextValue;

  useEffect(() => {
    open({
      title: 'dddd',
      body: 'dddd',
      actionClickEvent: () => {
        console.log('삭제하였습니다');
      },
      closeModal: () => {
        close();
      },
    } as ModalProps);
  }, [open, close]);

  return null;
}
