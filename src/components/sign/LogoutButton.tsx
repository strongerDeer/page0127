'use client';

//firebase
import { auth } from '@firebase/firebaeApp';
import { signOut } from 'firebase/auth';

// lib
import { toast } from 'react-toastify';

import Button from '../shared/Button';

export default function LogoutButton({ text }: { text?: string }) {
  const onClick = async () => {
    const confirm = window.confirm('로그아웃 하시겠습니까?');

    if (confirm) {
      try {
        await signOut(auth);
        toast.success('로그아웃 되었습니다!');
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <Button type="button" onClick={onClick}>
      {text ? text : 'Logout'}
    </Button>
  );
}
