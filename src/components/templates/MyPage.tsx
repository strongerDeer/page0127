'use client';

import BookList from '@components/book/BookList';
import ProfileImage from '@components/shared/ProfileImage';
import useUser from '@connect/user/useUser';

import styles from './MyPage.module.scss';
import Button from '@components/shared/Button';
import useSocialSignIn from '@components/sign/useSocialSignIn';
import { useState } from 'react';
import ProgressBar from '@components/shared/ProgressBar';
import { DEFAULT_GOAL } from '@constants';
import useReadBooks from '@hooks/useReadBooks';
import useLikeBook from '@connect/like/useLikeBook';
import useFilteredBook from '@connect/book/useFilteredBook';
export default function MyPage() {
  const [activeTab, setActiveTab] = useState('read');
  const user = useUser();
  const { logOut, deleteProviderAccount } = useSocialSignIn();

  const { data: likeData } = useLikeBook();
  const { data: readBook } = useReadBooks({ userId: user?.uid as string });
  const { data: likes } = useFilteredBook({ like: likeData || [] });

  return (
    <div className={styles.myPage}>
      <div className={styles.info}>
        <ProfileImage photoURL={user?.photoURL as string} />
        <p className={styles.displayName}>{user?.displayName}</p>
        <p className={styles.email}>{user?.email}</p>
        {user?.intro && <p className={styles.intro}>{user?.intro}</p>}

        <ProgressBar
          value={Number(user?.total?.length) || 0}
          total={Number(user?.goal) || DEFAULT_GOAL}
        />
      </div>
      <div className={styles.btns}>
        {user?.provider ? (
          <Button
            onClick={() =>
              deleteProviderAccount({
                uid: user?.uid,
                provider: user.provider || '',
              })
            }
          >
            회원탈퇴
          </Button>
        ) : (
          <Button href="/leave">회원탈퇴</Button>
        )}

        <Button size="sm" onClick={logOut}>
          로그아웃
        </Button>
        <Button size="sm" href="/my/edit-profile" variant="outline">
          프로필 수정
        </Button>

        <Button size="sm" href="/my/goal" variant="outline">
          목표 수정
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
        {activeTab === 'read' && readBook ? (
          <BookList data={readBook} />
        ) : activeTab === 'like' ? (
          <BookList data={likes || []} />
        ) : (
          <>참여중인 모임</>
        )}
        {/* {data && <BookList data={data} />} */}
      </section>
    </div>
  );
}
