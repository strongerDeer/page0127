import { useState } from 'react';
import styles from './Select.module.scss';
import { BookData } from '@components/templates/TemplateBookCreate';

interface Option {
  value: number;
  text: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  setValue?: React.Dispatch<React.SetStateAction<number | BookData>>;
}

export default function Select({ options, id, value, setValue }: SelectProps) {
  const [state, setState] = useState<number | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    if (setValue) {
      setValue((prev) => {
        if (typeof prev === 'number') {
          return Number(value);
        } else {
          return { ...prev, [id]: Number(value) };
        }
      });
    } else {
      setState(Number(value));
    }
  };
  return (
    <div className={styles.wrap}>
      <label>점수</label>
      <select className={styles.select} onChange={onChange} id={id}>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            selected={option.value === value}
          >
            {option.text}
          </option>
        ))}
      </select>
    </div>
  );
}
