import { Dispatch, useRef } from 'react';

import styles from './InputFileImg.module.scss';

import Image from 'next/image';
import { NO_PROFILE } from '@constants';
import clsx from 'clsx';
import Icon from '@components/icon/Icon';

interface InputFileLabelProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string;
  label?: string;
  className?: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}

export default function InputFileImg(props: InputFileLabelProps) {
  const {
    id = 'image',
    label = 'image',
    className,
    value,
    setValue,
    ...rest
  } = props;

  const fileRef = useRef<HTMLInputElement | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { files },
    } = e;

    const file = files?.[0];
    const fileReader = new FileReader();
    if (file) {
      fileReader?.readAsDataURL(file);
      fileReader.onloadend = (e: any) => {
        const { result } = e?.currentTarget;
        setValue(result);
      };
    }
  };

  const handleDeletePreviewImg = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (fileRef.current) {
      fileRef.current.value = '';
    }

    setValue('');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.input_btn}>
        <input
          className={clsx([styles.input, className])}
          type="file"
          id={id}
          name={id}
          onChange={onChange}
          ref={fileRef}
          {...rest}
        />
        <label className={styles.label} htmlFor={id}>
          <Icon name="image" color="#fff" />
          <span className="a11y-hidden">{label}</span>
        </label>
      </div>

      <Image
        className={styles.preview}
        src={value ? value : NO_PROFILE}
        width={120}
        height={120}
        alt=""
      />

      {value && (
        <button
          type="button"
          className={styles.del_btn}
          onClick={handleDeletePreviewImg}
        >
          <Icon name="close" color="warn-text" />
          <span className="a11y-hidden">삭제</span>
        </button>
      )}
    </div>
  );
}
