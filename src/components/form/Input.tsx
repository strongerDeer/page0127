'use client';

import { forwardRef, useState, ChangeEvent } from 'react';
import { clsx } from 'clsx';
import styles from './Input.module.scss';

type InputValue = string | number;

type InputChangeHandler =
  | ((value: InputValue, name: string) => void)
  | ((e: ChangeEvent<HTMLInputElement>) => void);

interface InputProps<T>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  hasError?: boolean;
  helpMessage?: React.ReactNode;
  hiddenLabel?: boolean;
  setValue?: React.Dispatch<React.SetStateAction<T>>;
  onChange?: InputChangeHandler;
}

function Input<T>(
  {
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
    onChange,
    ...rest
  }: InputProps<T>,
  ref: React.Ref<HTMLInputElement>,
) {
  const [internalValue, setInternalValue] = useState<InputValue>('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = type === 'number' ? Number(value) : value;

    if (setValue) {
      setValue((prev: T) => {
        if (typeof prev === 'object' && prev !== null) {
          return { ...prev, [name]: newValue } as T;
        }
        return newValue as unknown as T;
      });
    } else {
      setInternalValue(newValue);
    }

    if (onChange) {
      if (typeof onChange === 'function') {
        if (onChange.length === 2) {
          (onChange as (value: InputValue, name: string) => void)(
            newValue,
            name,
          );
        } else {
          (onChange as (e: ChangeEvent<HTMLInputElement>) => void)(e);
        }
      }
    }
  };

  const inputValue = value?.toString() || internalValue;

  return (
    <div className={clsx(styles.wrap, hasError && styles.error, className)}>
      <label htmlFor={id} className={clsx(hiddenLabel && 'a11y-hidden')}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={inputValue}
        onChange={handleChange}
        autoComplete={type === 'email' ? 'email' : 'off'}
        ref={ref}
        {...(type === 'number' ? { min: 1, max: 1000 } : {})}
        {...rest}
      />
      {helpMessage && <p className={styles.helpMessage}>{helpMessage}</p>}
    </div>
  );
}

export default forwardRef(Input) as <T>(
  props: InputProps<T> & { ref?: React.Ref<HTMLInputElement> },
) => JSX.Element;
