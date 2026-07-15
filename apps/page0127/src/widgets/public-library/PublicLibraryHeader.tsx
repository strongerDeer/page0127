'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/shared/ui/button';

import { FollowButton, FollowListModal, FollowStats } from '@/features/follow';

/**
 * 공개 서재 헤더 (Client Component)
 *
 * 학습 포인트:
 * - 팔로우 기능은 클라이언트 인터랙션이 필요하므로 'use client'
 * - 프로필 정보는 props로 받아옴 (Server Component에서 전달)
 * - 모달 상태 관리
 */
type Profile = {
  id: string;
  nickname: string | null;
  bio: string | null;
  photo_url: string | null;
};

type PublicLibraryHeaderProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
};

type PublicLibraryHeaderAvatarProps = {
  profile: Pick<Profile, 'photo_url' | 'nickname'>;
  username: string;
};

type PublicLibraryHeaderInfoProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
};

const PublicLibraryHeaderAvatar = ({
  profile,
  username,
}: PublicLibraryHeaderAvatarProps) => {
  if (profile.photo_url) {
    return (
      <div className='relative h-24 w-24 overflow-hidden rounded-xl border border-border'>
        <Image
          src={profile.photo_url}
          alt={profile.nickname || username}
          fill
          sizes='96px'
          className='object-cover'
          priority
        />
      </div>
    );
  }

  return (
    <div className='flex h-24 w-24 items-center justify-center rounded-xl bg-primary text-3xl font-bold text-primary-foreground'>
      {(profile.nickname || username).charAt(0).toUpperCase()}
    </div>
  );
};

const PublicLibraryHeaderInfo = ({
  profile,
  username,
  isOwnProfile,
  onFollowersClick,
  onFollowingClick,
}: PublicLibraryHeaderInfoProps) => (
  <div className='flex flex-1 items-start gap-6'>
    <div className='flex-1'>
      <h1 className='text-3xl font-bold tracking-tight text-foreground'>
        {profile.nickname || username}
      </h1>
      {profile.bio && (
        <p className='mt-2 text-base text-muted-foreground'>{profile.bio}</p>
      )}
      <p className='mt-1 text-sm font-medium text-muted-foreground'>@{username}</p>

      <div className='mt-4'>
        <FollowStats
          userId={profile.id}
          onFollowersClick={onFollowersClick}
          onFollowingClick={onFollowingClick}
        />
      </div>
    </div>

    {!isOwnProfile && (
      <div className='flex flex-col items-end gap-2'>
        <FollowButton userId={profile.id} />
        {/* 독서 궁합 — 두 책장을 비교하는 소셜 진입점 */}
        <Link href={`/${username}/compatibility`}>
          <Button variant='outline' size='sm'>
            독서 궁합 보기
          </Button>
        </Link>
      </div>
    )}
  </div>
);

export const PublicLibraryHeader = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
}: PublicLibraryHeaderProps) => {
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);

  return (
    <>
      <div className='rounded-xl border border-border bg-card p-6 sm:p-8'>
        <div className='flex items-start gap-5 sm:gap-6'>
          <PublicLibraryHeader.Avatar profile={profile} username={username} />
          <PublicLibraryHeader.Info
            profile={profile}
            username={username}
            isOwnProfile={isOwnProfile}
            onFollowersClick={() => setFollowersModalOpen(true)}
            onFollowingClick={() => setFollowingModalOpen(true)}
          />
        </div>
      </div>

      <FollowListModal
        userId={profile.id}
        type='followers'
        open={followersModalOpen}
        onOpenChange={setFollowersModalOpen}
        currentUserId={currentUserId}
      />
      <FollowListModal
        userId={profile.id}
        type='following'
        open={followingModalOpen}
        onOpenChange={setFollowingModalOpen}
        currentUserId={currentUserId}
      />
    </>
  );
};

PublicLibraryHeader.Avatar = PublicLibraryHeaderAvatar;
PublicLibraryHeader.Info = PublicLibraryHeaderInfo;
