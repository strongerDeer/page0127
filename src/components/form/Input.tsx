'use client';

interface InputProps<T> extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hasError?: boolean;
  helpMessage?: React.ReactNode;
  setValue?: React.Dispatch<React.SetStateAction<T>>;
}

import { clsx } from 'clsx';
import styles from './Input.module.scss';
import { useState } from 'react';

export default function Input<T>({
  type = 'text',
  label,
  id,
  name,
  className,
  value,
  hasError,
  helpMessage,
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
      <label htmlFor={id}>{label}</label>
      {type === 'number' ? (
        <input
          id={id}
          name={name}
          type={type}
          value={value || state}
          onChange={onChange}
          autoComplete={
            type === 'email'
              ? 'email'
              : type === 'displayName'
                ? 'displayName'
                : 'off'
          }
          min={1}
          max={1000}
          {...rest}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value || state}
          onChange={onChange}
          autoComplete={
            type === 'email'
              ? 'email'
              : type === 'displayName'
                ? 'displayName'
                : 'off'
          }
          {...rest}
        />
      )}
      {helpMessage && <p className={styles.helpMessage}>{helpMessage}</p>}
    </div>
  );
}
