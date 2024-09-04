'use client';

import { clsx } from 'clsx';
import styles from './Input.module.scss';
import { useState } from 'react';

interface InputProps<T> extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hasError?: boolean;
  helpMessage?: React.ReactNode;
  hiddenLabel?: boolean;
  setValue?: React.Dispatch<React.SetStateAction<T>>;
}

export default function Input<T>({
  type = 'text',
  label,
  id,
  name,
  className,
  value,
  hasError,
  helpMessage,
  hiddenLabel,
  setValue,
  ...rest
}: InputProps<T>) {
  const [state, setState] = useState<string>('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (setValue) {
      setValue((prev: T) => {
        if (typeof prev === 'string') {
          return value as unknown as T;
        } else {
          return { ...prev, [name]: value } as unknown as T;
        }
      });
    } else {
      setState(value);
    }
  };

  return (
    <div className={clsx([styles.wrap, hasError && styles.error, className])}>
      <label htmlFor={id} className={clsx(hiddenLabel && 'a11y-hidden')}>
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value?.toString() || state}
        onChange={onChange}
        autoComplete={type === 'email' ? 'email' : 'off'}
        {...(type === 'number' ? { min: 1, max: 1000 } : {})}
        {...rest}
      />

      {helpMessage && <p className={styles.helpMessage}>{helpMessage}</p>}
    </div>
  );
}
