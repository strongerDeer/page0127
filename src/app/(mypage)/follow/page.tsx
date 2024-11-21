'use client';
import { useState } from 'react';

import useFilteredUser from '@connect/follow/useFilteredUser';
import useFollowing from '@connect/follow/useFollowing';
import useFollower from '@connect/follow/useFollower';
import ProfileImage from '@components/shared/ProfileImage';
import { useRouter } from 'next/navigation';
import FollowButton from '@components/follow/FollowButton';

import styles from './Page.module.scss';
import { User } from '@connect/user';

interface ExtendedUser extends User {
  id: string;
}

export default function Page() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'following' | 'follower'>(
    'following',
  );

  const { data: following } = useFollowing();
  const { data: follower } = useFollower();
  const { data: followingUsers } = useFilteredUser({ array: following || [] });
  const { data: followerUsers } = useFilteredUser({ array: follower || [] });

  const handleUserClick = (userId: string) => {
    router.push(`/${userId}`);
  };
  return (
    <div className={styles.wrap}>
      <div className={styles.tab}>
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
        <UserList
          users={activeTab === 'following' ? followingUsers : followerUsers}
          following={following || []}
          onClick={handleUserClick}
          activeTab={activeTab}
        />
      </section>
    </div>
  );
}

const UserList = ({
  users,
  following,
  onClick,
  activeTab,
}: {
  users: ExtendedUser[] | null | undefined;
  following: string[];
  onClick: (userId: string) => void;
  activeTab: 'following' | 'follower';
}) => {
  if (!users || users.length === 0)
    return (
      <p className={styles.nodata}>
        {activeTab === 'following' ? '팔로우' : '팔로워'}하는 유저가 없어요
      </p>
    );
  return (
    <ul className={styles.lists}>
      {users?.map((user: User & { id: string }) => (
        <UserListItem
          key={user.id}
          user={user}
          isFollowing={following?.includes(user.userId) || false}
          onClick={onClick}
        />
      ))}
    </ul>
  );
};
const UserListItem = ({
  user,
  isFollowing,
  onClick,
}: {
  user: ExtendedUser;
  isFollowing: boolean;
  onClick: (userId: string) => void;
}) => {
  return (
    <li>
      <button onClick={() => onClick(user.userId)}>
        <ProfileImage photoURL={user.photoURL || ''} width={40} />
      </button>
      <p className={styles.text}>
        <span className={styles.userId}>{user.userId}</span>
        <span className={styles.displayName}>{user.displayName}</span>
      </p>

      <FollowButton isFollowing={isFollowing} userId={user.userId} />
    </li>
  );
};
