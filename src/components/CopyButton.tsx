'use client';
import { useState } from 'react';
import styles from './CopyButton.module.scss';
import clsx from 'clsx';
import Icon from '@components/icon/Icon';
import { toast } from 'react-toastify';

export default function CopyButton({
  copy,
  buttonLabel = '복사',
}: {
  copy: string;
  buttonLabel: string;
}) {
  const TIME = 1200;
  const [isClicked, setIsClicked] = useState<boolean | null>(null);

  const copyText = async () => {
    if (copy !== '') {
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(copy);
          setIsClicked(true);
          setTimeout(() => {
            setIsClicked(false);
          }, TIME / 2);
          setTimeout(() => {
            setIsClicked(null);
          }, TIME);
        } catch (e) {
          alert('실패하였습니다. 다시 시도해주세요.');
        }
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = copy;
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.position = 'fixed';

        // 흐름 4.
        document.body.appendChild(textarea);
        // focus() -> 사파리 브라우저 서포팅
        textarea.focus();
        // select() -> 사용자가 입력한 내용을 영역을 설정할 때 필요
        textarea.select();
        // 흐름 5.
        document.execCommand('copy');
        // 흐름 6.
        document.body.removeChild(textarea);

        setIsClicked(true);
        setTimeout(() => {
          setIsClicked(false);
        }, TIME / 2);
        setTimeout(() => {
          setIsClicked(null);
        }, TIME);
      }
    } else {
      toast.error('복사할 콘텐츠가 없습니다.');
    }
  };
  return (
    <button
      type="button"
      onClick={copyText}
      className={clsx([
        isClicked === null
          ? styles.button
          : isClicked
            ? styles.button_clicked
            : styles.button_unClicked,
      ])}
    >
      {isClicked ? (
        <Icon name="check" color="primary" />
      ) : (
        <Icon name="link" color="grayLv3" />
      )}
      {isClicked ? (
        <span>복사 완료!</span>
      ) : (
        <span className="a11y-hidden">코드 복사</span>
      )}
    </button>
  );
}
