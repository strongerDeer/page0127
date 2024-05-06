'use client';
import { auth } from '@firebase/firebaeApp';
import { signOut } from 'firebase/auth';
import { toast } from 'react-toastify';

export default function LogoutButton() {
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
    <button type="button" onClick={onClick}>
      Logout
    </button>
  );
}
