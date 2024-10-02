import { CardInfoValues } from '@models/applyClub';
import styles from './InputRadio.module.scss';

type RadioValue = boolean | string;

export default function InputRadio<T extends { [key: string]: any }>({
  title,
  name,
  list,
  setValue,
}: {
  title?: string;
  name: string;
  list: { value: RadioValue; label: string }[];
  setValue: React.Dispatch<React.SetStateAction<T>>;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValue((prev: T) => ({ ...prev, [name]: value }));
  };
  return (
    <div className={styles.box}>
      {title && <p>{title}</p>}
      <div className={styles.radioWrap}>
        {list.map((item, index) => (
          <div key={index}>
            <input
              type="radio"
              id={`${name}${index}`}
              name={name}
              value={String(item.value)}
              onChange={onChange}
              defaultChecked={item.value === true || item.value === 'all'}
            />
            <label htmlFor={`${name}${index}`}>{item.label}</label>
          </div>
        ))}
      </div>
    </div>
  );
}
