import Image from 'next/image';

import { isPreOptimizedImageSrc } from '@repo/ui';

import { UserWithFollowInfo } from '@/entities/follow';
import { toDisplayName, toInitial } from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import { FollowButton } from './FollowButton';

/**
 * 사용자 카드 (검색 결과·팔로워/팔로잉 목록에서 사용)
 *
 * 학습 포인트:
 * - 사용자 정보 + 팔로우 버튼 조합
 * - 표시 이름은 displayName 모듈이 정한다 (nickname은 null일 수 있다)
 * - 프로필 이동은 ProfileLink 가 맡는다 (username 없으면 링크를 안 건다)
 */
type UserCardProps = {
  user: UserWithFollowInfo;
  currentUserId?: string; // 현재 로그인한 사용자 ID (본인은 팔로우 버튼 숨김)
};

export const UserCard = ({ user, currentUserId }: UserCardProps) => {
  const isCurrentUser = currentUserId === user.id;
  const displayName = toDisplayName(user);

  return (
    <div className='flex items-center justify-between rounded-2xl bg-sunken p-4 transition-colors hover:bg-accent/50'>
      <ProfileLink
        username={user.username}
        className='flex flex-1 items-center gap-3'
      >
        {/* 프로필 이미지 */}
        {user.photo_url ? (
          <div className='relative h-12 w-12 overflow-hidden rounded-full'>
            <Image
              src={user.photo_url}
              alt={displayName}
              fill
              sizes='48px'
              className='object-cover'
              unoptimized={isPreOptimizedImageSrc(user.photo_url)}
            />
          </div>
        ) : (
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground'>
            {toInitial(user)}
          </div>
        )}

        {/* 사용자 정보 */}
        <div className='flex-1'>
          <h3 className='font-medium text-foreground'>
            {displayName}
            {isCurrentUser && (
              <span className='ml-2 text-sm font-normal text-primary'>
                (나)
              </span>
            )}
          </h3>
          {user.bio && (
            <p className='line-clamp-1 text-sm text-muted-foreground'>
              {user.bio}
            </p>
          )}
          <div className='mt-1 flex items-center gap-3 text-xs text-muted-foreground'>
            <span>팔로워 {user.followers_count}</span>
            <span>팔로잉 {user.following_count}</span>
          </div>
        </div>
      </ProfileLink>

      {/* 팔로우 버튼 (본인은 숨김) */}
      {!isCurrentUser && (
        <div className='ml-4'>
          <FollowButton userId={user.id} variant='outline' size='sm' />
        </div>
      )}
    </div>
  );
};
