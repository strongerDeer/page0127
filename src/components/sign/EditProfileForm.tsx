'use client';
import styles from './Form.module.scss';

import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import Input from '@components/form/Input';
import InputFileImg from '@components/form/InputFileImg';
import { useEditProfileForm } from '@hooks/useEditProfileForm';
import useUser from '@connect/user/useUser';
import { InputArr } from '@connect/sign';

export default function EditProfileForm({
  inputArr,
}: {
  inputArr: InputArr[];
}) {
  const user = useUser();
  const isMobile = false;

  const {
    formValues,
    profileImage,
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
    setProfileImg,
    handleSubmit,
  } = useEditProfileForm();

  return (
    <form className={styles.form}>
      <InputFileImg value={profileImage} setValue={setProfileImg} />
      <Input label="이메일" value={user?.email} disabled />
      {inputArr.map(({ id, type, label, placeholder }) => (
        <Input
          key={id}
          type={type}
          id={id}
          name={id}
          label={label}
          placeholder={placeholder}
          value={formValues[id]}
          hasError={Boolean(inputDirty[id]) && Boolean(errors?.[id])}
          helpMessage={
            Boolean(inputDirty[id]) && errors[id] ? errors[id] : null
          }
          onChange={handleFormValues}
          onBlur={handleBlur}
        />
      ))}

      {isMobile ? (
        <ButtonFixedBottom
          type="submit"
          text="수정"
          disabled={!isSubmit}
          onClick={handleSubmit}
        />
      ) : (
        <Button
          type="submit"
          size="lg"
          disabled={!isSubmit}
          onClick={handleSubmit}
        >
          수정
        </Button>
      )}
    </form>
  );
}
