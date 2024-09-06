'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import styles from './HomeTemplate.module.scss';

import BookList from '@components/book/BookList';
import Visual from '@components/home/Visual';
import useBooks from '@hooks/useBooks';
import Club from '@components/home/Club';
import { BannerSkeleton } from '@components/home/Banner';
import Input from '@components/form/Input';
import { useRouter } from 'next/navigation';

const Banners = dynamic(() => import('@components/home/Banner'), {
  ssr: false,
  loading: () => <BannerSkeleton />,
});

export default function HomeTemplate() {
  const router = useRouter();
  const { data } = useBooks();

  return (
    <div>
      <Visual />

      <div className="max-width">
        <Banners />
        <Club />

        <main>
          <Input
            label="책 검색"
            hiddenLabel
            placeholder="도서를 검색해보세요"
            onFocus={() => router.push('/book/search')}
          />
          <div className={styles.titleWrap}>
            <h2>인기 도서</h2>

            {data && <BookList data={data.slice(0, 8)} />}
            <Link href="/book">도서 더보기</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
