'use client';
import { useState } from 'react';

import useFilteredUser from '@connect/follow/useFilteredUser';
import useFollowing from '@connect/follow/useFollowing';
import useFollower from '@connect/follow/useFollower';
import ProfileImage from '@components/shared/ProfileImage';
import { useRouter } from 'next/navigation';
import FollowButton from '@components/follow/FollowButton';

import styles from './Page.module.scss';

export default function Page() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'following' | 'follower'>(
    'following',
  );

  const { data: following } = useFollowing();
  const { data: follower } = useFollower();

  const { data: followingUsers } = useFilteredUser({ array: following || [] });
  const { data: followerUsers } = useFilteredUser({ array: follower || [] });
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
        {activeTab === 'follower' ? (
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
      </section>
    </div>
  );
}
