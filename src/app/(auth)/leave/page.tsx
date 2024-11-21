'use client';
import Input from '@components/form/Input';
import Button from '@components/shared/Button';
import useLogin from '@connect/sign/useLogin';
import useUser from '@connect/user/useUser';
import { useState } from 'react';

export default function Page() {
  const user = useUser();
  const [password, setPassword] = useState('');
  const { deleteAccount } = useLogin();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    deleteAccount({
      password: password,
      userId: user.userId,
      email: user.email,
    });
  };
  return (
    <>
      <h2 className="title1">회원탈퇴</h2>
      <p> 회원탈퇴 시 데이터는 바로 삭제되며 복구 할 수 없습니다.</p>

      <p>회원 탈퇴를 원하면 비밀번호를 입력해주세요</p>
      <form onSubmit={onSubmit}>
        <Input
          label="비밀번호"
          id="password"
          type="password"
          setValue={setPassword}
          value={password}
        />
        <Button type="submit">확인</Button>
      </form>
    </>
  );
}
