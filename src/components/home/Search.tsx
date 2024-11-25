'use client';
import Input from '@components/form/Input';
import { useRouter } from 'next/navigation';

import styles from './Search.module.scss';
import { ROUTES } from '@constants';
export default function Search() {
  const router = useRouter();

  return (
    <section className={styles.section}>
      <div className="max-width">
        <h3 className="title2">당신의 인생책을 찾아보세요</h3>
        <Input
          label="책 검색"
          hiddenLabel
          placeholder="도서를 검색해보세요"
          onFocus={() => router.push(ROUTES.BOOK_SEARCH)}
        />
      </div>
    </section>
  );
}
