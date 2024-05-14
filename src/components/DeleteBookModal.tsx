import { useModalContext } from '@contexts/ModalContext';
import { useEffect } from 'react';

export default function DeleteBookModal() {
  const { open, close } = useModalContext();

  useEffect(() => {
    open &&
      open({
        title: 'dddd',
        body: 'dddd',
        actionClickEvent: () => {
          console.log('삭제하였습니다');
        },
        closeModal: () => {
          close();
        },
      });
  }, []); // eslint-disable-line

  return null;
}
