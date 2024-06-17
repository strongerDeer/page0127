import { useState } from 'react';
import styles from './Select.module.scss';
import { BookData } from '@components/templates/TemplateBookCreate';

interface Option {
  value: number;
  text: string;
}

interface SelectProps<T> extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  setValue?: React.Dispatch<React.SetStateAction<T>>;
}

export default function Select<T>({
  options,
  id,
  value,
  setValue,
}: SelectProps<T>) {
  const [state, setState] = useState<T | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    if (setValue) {
      setValue((prev) => {
        if (typeof prev === 'number') {
          return Number(value) as unknown as T;
        } else {
          return { ...prev, [id]: Number(value) as unknown as T };
        }
      });
    } else {
      setState(Number(value) as unknown as T);
    }
  };
  return (
    <div className={styles.wrap}>
      <label>점수</label>
      <select
        className={styles.select}
        onChange={onChange}
        id={id}
        defaultValue={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value.toString()}>
            {option.text}
          </option>
        ))}
      </select>
    </div>
  );
}
