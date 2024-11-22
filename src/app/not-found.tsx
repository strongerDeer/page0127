'use client';

import { useRouter } from 'next/navigation';
import { cormorant } from '@font';
import Button from '@components/shared/Button';
import Icon from '@components/icon/Icon';
import styles from './not-found.module.scss';

export default function NotFound() {
  const router = useRouter();

  const nav = {
    back: () => router.back(),
    home: () => router.push('/'),
  };

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
        <Button onClick={nav.back} size="lg" variant="outline">
          이전 페이지
        </Button>
        <Button onClick={nav.home} size="lg">
          <Icon name="home" color="#fff" />
          메인 페이지
        </Button>
      </div>
    </div>
  );
}
