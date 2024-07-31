'use client';

import { InputArr } from '@models/sign';

import styles from './TemplateSign.module.scss';
import EditPasswordForm from '@components/sign/EditPasswordForm';

export default function TemplateEditPassword({
  inputArr,
}: {
  inputArr: InputArr[];
}) {
  return (
    <div className={styles.signContainer}>
      <h2>비밀번호 수정</h2>
      <EditPasswordForm inputArr={inputArr} />
    </div>
  );
}
