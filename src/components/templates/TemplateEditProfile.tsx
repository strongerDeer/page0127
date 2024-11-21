'use client';

import { InputArr } from '@connect/sign';
import styles from './TemplateSign.module.scss';
import EditProfileForm from '@components/sign/EditProfileForm';
import Button from '@components/shared/Button';
import useUser from '@connect/user/useUser';
import useLogin from '@connect/sign/useLogin';

export default function TemplateEditProfile({
  inputArr,
}: {
  inputArr: InputArr[];
}) {
  const user = useUser();
  const { deleteProviderAccount } = useLogin();
  return (
    <div className={styles.signContainer}>
      <h2>프로필 수정</h2>
      <EditProfileForm inputArr={inputArr} />

      {user?.provider ? (
        <Button
          onClick={() =>
            deleteProviderAccount({
              userId: user?.userId,
              provider: user.provider || '',
            })
          }
          color="grayLv4"
          variant="outline"
        >
          회원탈퇴
        </Button>
      ) : (
        <Button href="/leave" color="grayLv4" variant="outline">
          회원탈퇴
        </Button>
      )}
    </div>
  );
}
