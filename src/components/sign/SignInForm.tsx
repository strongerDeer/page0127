'use client';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';

import styles from './Form.module.scss';

import Input from '@components/shared/Input';
import FixedBottomButton from '@components/FixedBottomButton';
import { FormValues } from '@models/Sign';
import validate from '@utils/validate';

import Button from '@components/shared/Button';
import { InputArr } from '@models/Sign';

type SignInFormValues = Omit<FormValues, 'nickname' | 'rePassword'>;

export default function SignInForm({ inputArr }: { inputArr: InputArr[] }) {
  const isMoile = false;

  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<SignInFormValues>({
    email: '',
    password: '',
  });

  const [inputDirty, setInputDirty] = useState<Partial<SignInFormValues>>({});

  // 계속해서 리렌더링 발생. 외부 값의 영향을 받지 않음으로 useCallback 사용
  const handleFormValues = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setInputDirty((prev) => ({
      ...prev,
      [name]: 'true',
    }));
  }, []);

  const errors = useMemo(() => validate(formValues), [formValues]);

  console.log();

  const isSubmit = Object.keys(errors).length === 0;
  console.log(errors, isSubmit);
  const handleSubmit = async (formValues: SignInFormValues) => {
    const { email, password } = formValues;

    // 데이터 전송
    try {
    } catch (error) {
      if (error) {
      }
    }
  };

  return (
    <form className={styles.form}>
      {/* input */}
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

      {isMoile ? (
        <FixedBottomButton
          type="submit"
          text="로그인"
          disabled={isSubmit === false}
          onClick={() => handleSubmit(formValues)}
        />
      ) : (
        <Button
          type="submit"
          onClick={() => handleSubmit(formValues)}
          size="lg"
          disabled={isSubmit === false}
        >
          로그인
        </Button>
      )}
    </form>
  );
}
