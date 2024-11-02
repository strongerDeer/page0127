'use client';

import BookList from '@components/book/BookList';
import ProfileImage from '@components/shared/ProfileImage';
import useUser from '@connect/user/useUser';

import styles from './MyPage.module.scss';
import Button from '@components/shared/Button';
import { useState } from 'react';
import ProgressBar from '@components/shared/ProgressBar';
import { DEFAULT_GOAL } from '@constants';
import useReadBooks from '@hooks/useReadBooks';
import useLikeBook from '@connect/like/useLikeBook';
import useFilteredBook from '@connect/book/useFilteredBook';
import useLogin from '@connect/sign/useLogin';
import useFollowing from '@connect/follow/useFollowing';
import useFilteredUser from '@connect/follow/useFilteredUser';
import useFollower from '@connect/follow/useFollower';
import { useRouter } from 'next/navigation';
import FollowButton from '@components/follow/FollowButton';

export default function MyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('read');
  const user = useUser();
  const { logOut } = useLogin();

  const { data: likeData } = useLikeBook();
  const { data: readBook } = useReadBooks({ userId: user?.uid as string });
  const { data: likes } = useFilteredBook({ like: likeData || [] });

  const { data: following } = useFollowing();
  const { data: follower } = useFollower();

  const { data: followingUsers } = useFilteredUser({ array: following || [] });
  const { data: followerUsers } = useFilteredUser({ array: follower || [] });

  return (
    <div className={styles.myPage}>
      <div className={styles.info}>
        <ProfileImage photoURL={user?.photoURL as string} />
        <p className={styles.displayName}>{user?.displayName}</p>
        <p className={styles.email}>{user?.email}</p>
        {user?.introduce && <p className={styles.intro}>{user?.introduce}</p>}

        <ProgressBar
          value={Number(user?.totalBook) || 0}
          total={Number(user?.currentGoal) || DEFAULT_GOAL}
        />
      </div>
      <div className={styles.btns}>
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

        <button
          type="button"
          className={activeTab === 'following' ? styles.active : ''}
          onClick={() => setActiveTab('following')}
        >
          팔로잉 {following?.length}
        </button>

        <button
          type="button"
          className={activeTab === 'follower' ? styles.active : ''}
          onClick={() => setActiveTab('follower')}
        >
          팔로워 {follower?.length}
        </button>
      </div>

      <section className={styles.contents}>
        {activeTab === 'read' && readBook ? (
          <BookList myList data={readBook} />
        ) : activeTab === 'like' ? (
          <BookList myList data={likes || []} />
        ) : activeTab === 'club' ? (
          <>참여중인 모임</>
        ) : activeTab === 'follower' ? (
          <>
            {followerUsers && followerUsers.length > 0 ? (
              <ul>
                {followerUsers?.map((user) => (
                  <li key={user.id} className="flex gap-4 align-center">
                    <button
                      onClick={() => {
                        router.push(`/shelf/${user.userId}`);
                      }}
                    >
                      <ProfileImage photoURL={user.photoURL || ''} width={40} />
                    </button>
                    <p>
                      {user.userId}| {user.displayName}{' '}
                    </p>

                    <FollowButton
                      isFollowing={following?.includes(user.uid) || false}
                      uid={user.uid}
                      userId={user.userId}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <>아직 팔로워하는 유저가 없어요</>
            )}
          </>
        ) : (
          <>
            {followingUsers && followingUsers.length > 0 ? (
              <ul>
                {followingUsers?.map((user) => (
                  <li key={user.id} className="flex gap-4 align-center">
                    <button
                      onClick={() => {
                        router.push(`/shelf/${user.userId}`);
                      }}
                    >
                      <ProfileImage photoURL={user.photoURL || ''} width={40} />
                    </button>
                    <p>
                      {user.userId}| {user.displayName}{' '}
                    </p>
                    <FollowButton
                      isFollowing={following?.includes(user.uid) || false}
                      uid={user.uid}
                      userId={user.userId}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <>아직 팔로우하는 유저가 없어요</>
            )}
          </>
        )}
        {/* {data && <BookList data={data} />} */}
      </section>
    </div>
  );
}
