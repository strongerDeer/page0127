import { CardInfoValues } from '@components/membership/CardInfo';
import styles from './InputRadio.module.scss';
export default function InputRadio({
  title,
  name,
  list,

  setValue,
}: {
  title?: string;
  name: string;
  list: { value: boolean; label: string }[];
  setValue: React.Dispatch<React.SetStateAction<CardInfoValues>>;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValue((prev: any) => ({ ...prev, [name]: Boolean(value) }));
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
              defaultChecked={item.value === true}
            />
            <label htmlFor={`${name}${index}`}>{item.label}</label>
          </div>
        ))}
      </div>
    </div>
  );
}
