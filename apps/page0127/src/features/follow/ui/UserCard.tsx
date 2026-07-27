import Image from 'next/image';
import Link from 'next/link';

import { UserWithFollowInfo } from '@/entities/follow';
import {
  profileHref,
  toDisplayName,
  toInitial,
} from '@/entities/profile/model/displayName';

import { FollowButton } from './FollowButton';

/**
 * 사용자 카드 (검색 결과·팔로워/팔로잉 목록에서 사용)
 *
 * 학습 포인트:
 * - 사용자 정보 + 팔로우 버튼 조합
 * - 표시 이름과 링크는 displayName 모듈이 정한다 (nickname은 null일 수 있다)
 */
type UserCardProps = {
  user: UserWithFollowInfo;
  currentUserId?: string; // 현재 로그인한 사용자 ID (본인은 팔로우 버튼 숨김)
};

export const UserCard = ({ user, currentUserId }: UserCardProps) => {
  const isCurrentUser = currentUserId === user.id;
  const displayName = toDisplayName(user);
  const href = profileHref(user);

  const content = (
    <>
      {/* 프로필 이미지 */}
      {user.photo_url ? (
        <div className='relative h-12 w-12 overflow-hidden rounded-full'>
          <Image
            src={user.photo_url}
            alt={displayName}
            fill
            sizes='48px'
            className='object-cover'
          />
        </div>
      ) : (
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground'>
          {toInitial(user)}
        </div>
      )}

      {/* 사용자 정보 */}
      <div className='flex-1'>
        <h3 className='font-semibold text-foreground'>
          {displayName}
          {isCurrentUser && (
            <span className='ml-2 text-sm font-normal text-primary'>(나)</span>
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
    </>
  );

  return (
    <div className='flex items-center justify-between rounded-2xl bg-sunken p-4 transition-colors hover:bg-accent/50'>
      {/* username이 없으면 갈 수 있는 서재가 없다 → 깨진 링크 대신 링크를 걸지 않는다 */}
      {href ? (
        <Link href={href} className='flex flex-1 items-center gap-3'>
          {content}
        </Link>
      ) : (
        <div className='flex flex-1 items-center gap-3'>{content}</div>
      )}

      {/* 팔로우 버튼 (본인은 숨김) */}
      {!isCurrentUser && (
        <div className='ml-4'>
          <FollowButton userId={user.id} variant='outline' size='sm' />
        </div>
      )}
    </div>
  );
};
