'use client';
import styles from './Form.module.scss';

import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import Input from '@components/form/Input';
import InputFileImg from '@components/form/InputFileImg';
import { useSignUpForm } from '@connect/sign/useSignUpForm';
import { InputArr } from '@connect/sign';

export default function SignUpForm({ inputArr }: { inputArr: InputArr[] }) {
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
  } = useSignUpForm();

  return (
    <form className={styles.form}>
      <InputFileImg value={profileImage} setValue={setProfileImg} />
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
          text="회원가입"
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
          회원가입
        </Button>
      )}
    </form>
  );
}
