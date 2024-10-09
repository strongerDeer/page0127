'use client';
import styles from './Form.module.scss';

import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import Input from '@components/form/Input';
import { useSignInForm } from '@connect/sign/useSignInForm';
import { InputArr, SignInFormValues } from '@connect/sign';
import useLogin from '@connect/sign/useLogin';

export default function SignUpForm({ inputArr }: { inputArr: InputArr[] }) {
  const isMobile = false;

  const {
    formValues,
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
  } = useSignInForm();

  const { emailLogin } = useLogin();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        emailLogin(formValues);
      }}
    >
      {inputArr.map(({ id, type, label, placeholder }) => (
        <Input
          key={id}
          type={type}
          id={id}
          name={id}
          label={label}
          placeholder={placeholder}
          value={formValues[id as keyof SignInFormValues]}
          hasError={Boolean(inputDirty[id]) && Boolean(errors?.[id])}
          helpMessage={
            Boolean(inputDirty[id]) && errors[id] ? errors[id] : null
          }
          onChange={handleFormValues}
          onBlur={handleBlur}
        />
      ))}

      {isMobile ? (
        <ButtonFixedBottom type="submit" text="로그인" disabled={!isSubmit} />
      ) : (
        <Button type="submit" size="lg" disabled={!isSubmit}>
          로그인
        </Button>
      )}
    </form>
  );
}
