'use client';

import BookList from '@components/book/BookList';
import useUser from '@connect/user/useUser';

import styles from './MyPage.module.scss';
import { useState } from 'react';

import useReadBooks from '@hooks/useReadBooks';
import useLikeBook from '@connect/like/useLikeBook';
import useFilteredBook from '@connect/book/useFilteredBook';

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<'read' | 'like'>('read');
  const user = useUser();

  const { data: likeData } = useLikeBook();
  const { data: readBook } = useReadBooks({ userId: user?.uid as string });
  const { data: likes } = useFilteredBook({ like: likeData || [] });

  return (
    <div className={styles.myPage}>
      <div className={styles.tab}>
        <button
          type="button"
          className={activeTab === 'read' ? styles.active : ''}
          onClick={() => setActiveTab('read')}
        >
          읽은 책
        </button>
        <button
          type="button"
          className={activeTab === 'like' ? styles.active : ''}
          onClick={() => setActiveTab('like')}
        >
          좋아요
        </button>
      </div>

      <section className={styles.contents}>
        {activeTab === 'read' && readBook ? (
          <BookList myList data={readBook} />
        ) : (
          <BookList myList data={likes || []} />
        )}
      </section>
    </div>
  );
}
