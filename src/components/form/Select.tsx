import styles from './Select.module.scss';

interface Option {
  value: number;
  text: string;
}
export default function Select({ options }: { options: Option[] }) {
  return (
    <div className={styles.wrap}>
      <label>점수</label>
      <select className={styles.select}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
    </div>
  );
}
