'use client';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hasError?: boolean;
  helpMessage?: React.ReactNode;
  setValue?: React.Dispatch<React.SetStateAction<string>>;
}

import { clsx } from 'clsx';
import styles from './Input.module.scss';
import { useState } from 'react';

export default function Input({
  type = 'text',
  label,
  id,
  className,
  value,
  hasError,
  helpMessage,
  setValue,
  ...rest
}: InputProps) {
  const [state, setState] = useState<string>('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentValue = e.target.value;
    if (setValue) {
      setValue(currentValue);
    } else {
      setState(currentValue);
    }
  };
  return (
    <div className={clsx([styles.wrap, hasError && styles.error, className])}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value || state}
        onChange={onChange}
        autoComplete={
          type === 'email' ? 'email' : type === 'nickname' ? 'nickname' : 'off'
        }
        {...rest}
      />
      {helpMessage && <p className={styles.helpMessage}>{helpMessage}</p>}
    </div>
  );
}
