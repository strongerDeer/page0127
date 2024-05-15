'use client';
interface InputProps {
  id: string;
  label: string;
  type?: string;
  value?: string;
  setValue?: React.Dispatch<React.SetStateAction<string>>;
  className?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
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
  setValue,
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
    <div className={clsx([styles.wrap, className])}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value || state} onChange={onChange} />
    </div>
  );
}
