import { forwardRef } from 'react';
import styles from './Select.module.scss';
import { Option } from '@connect/club';

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  placeholder?: string;
  options: Option[];
  value: string;
  hiddenLabel?: boolean;
  onChange: (value: string) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, placeholder, options, onChange, hiddenLabel, ...props },
  ref,
) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={styles.wrap}>
      {!hiddenLabel && <label>{label}</label>}
      <select
        ref={ref}
        className={styles.select}
        onChange={handleChange}
        {...props}
      >
        <option disabled hidden value="">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

export default Select;
