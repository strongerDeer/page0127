'use client';

import BookList from '@components/book/BookList';
import ProfileImage from '@components/shared/ProfileImage';
import useUser from '@hooks/auth/useUser';
import useLikeBooks from '@hooks/useLikeBooks';

import styles from './MyPage.module.scss';
import Button from '@components/shared/Button';
import useSocialSignIn from '@components/sign/useSocialSignIn';
import { useState } from 'react';
import useMyBooks from '@hooks/useMyBooks';
import ProgressBar from '@components/shared/ProgressBar';
export default function MyPage() {
  const user = useUser();
  const { data } = useLikeBooks();
  const { data: myBook } = useMyBooks({ userId: user?.uid as string });
  const { logOut } = useSocialSignIn();

  const [activeTab, setActiveTab] = useState('read');

  return (
    <div className={styles.myPage}>
      <div className={styles.info}>
        <ProfileImage photoURL={user?.photoURL as string} />
        <p className={styles.displayName}>{user?.displayName}</p>
        <p className={styles.email}>{user?.email}</p>
        {user?.intro && <p className={styles.intro}>{user?.intro}</p>}

        <ProgressBar
          value={Number(user?.total?.length) || 0}
          total={Number(user?.goal) || 1}
        />
      </div>
      <div className={styles.btns}>
        <Button size="sm" onClick={logOut}>
          로그아웃
        </Button>
        <Button size="sm" href="/my/edit-profile" variant="outline">
          프로필 수정
        </Button>

        {!user?.provider && (
          <Button size="sm" href="/my/edit-password" variant="outline">
            비밀번호 변경
          </Button>
        )}
      </div>

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
        <button
          type="button"
          className={activeTab === 'club' ? styles.active : ''}
          onClick={() => setActiveTab('club')}
        >
          참여중인 모임
        </button>
      </div>

      <section className={styles.contents}>
        {activeTab === 'read' && myBook ? (
          <BookList data={myBook} />
        ) : activeTab === 'like' && data ? (
          <BookList data={data} />
        ) : (
          <>참여중인 모임</>
        )}
        {/* {data && <BookList data={data} />} */}
      </section>
    </div>
  );
}
