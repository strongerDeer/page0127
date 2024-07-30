'use client';
import styles from './Form.module.scss';

import { useSignInForm } from '@hooks/useSignInForm';
import { InputArr, SignInFormValues } from '@models/sign';

import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import Input from '@components/form/Input';

export default function SignUpForm({ inputArr }: { inputArr: InputArr[] }) {
  const isMobile = false;

  const {
    formValues,
    inputDirty,
    errors,
    isSubmit,
    handleFormValues,
    handleBlur,
    handleSubmit,
  } = useSignInForm();

  return (
    <form className={styles.form}>
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
        <ButtonFixedBottom
          type="submit"
          text="로그인"
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
          로그인
        </Button>
      )}
    </form>
  );
}
