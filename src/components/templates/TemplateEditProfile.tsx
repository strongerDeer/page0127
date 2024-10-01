'use client';

import { InputArr } from '@connect/sign';
import styles from './TemplateSign.module.scss';
import EditProfileForm from '@components/sign/EditProfileForm';

export default function TemplateEditProfile({
  inputArr,
}: {
  inputArr: InputArr[];
}) {
  return (
    <div className={styles.signContainer}>
      <h2>프로필 수정</h2>
      <EditProfileForm inputArr={inputArr} />
    </div>
  );
}
