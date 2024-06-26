import { forwardRef } from 'react';
import styles from './Select.module.scss';
import { Option } from '@models/membership';
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  options: Option[];
  setValue: React.Dispatch<React.SetStateAction<any>>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, placeholder, options, setValue, ...props },
  ref,
) {
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    setValue((prev: any) => ({ ...prev, [id]: value }));
  };

  return (
    <div className={styles.wrap}>
      <label>{label}</label>
      <select
        ref={ref}
        className={styles.select}
        onChange={onChange}
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
