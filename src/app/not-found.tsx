'use client';
import Button from '@components/shared/Button';
import { useRouter } from 'next/navigation';

import styles from './not-found.module.scss';
import clsx from 'clsx';
import { cormorant } from '@font';
import Icon from '@components/icon/Icon';
export default function NotFound() {
  const router = useRouter();
  return (
    <div className={styles.notFound}>
      <h2 className={cormorant.className}>
        Not Found<span>.</span>
      </h2>
      <p>
        페이지가 존재하지 않습니다.<span className="br"></span>입력하신 주소가
        정확한지 다시 한번 확인해 주세요!
      </p>
      <div className={styles.btnGroup}>
        <Button onClick={() => router.back()} size="lg" variant="outline">
          이전 페이지
        </Button>
        <Button onClick={() => router.push('/')} size="lg">
          <Icon name="home" color="#fff" />
          메인 페이지
        </Button>
      </div>
    </div>
  );
}
