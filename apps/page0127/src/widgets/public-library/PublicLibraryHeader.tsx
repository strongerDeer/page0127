'use client';

import { useState } from 'react';

import Image from 'next/image';

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
      <div className='relative h-24 w-24 overflow-hidden rounded-2xl shadow-md ring-4 ring-white/50'>
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
    <div className='flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-sky-500 text-3xl font-bold text-white shadow-md ring-4 ring-white/50'>
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
      <h1 className='text-3xl font-bold tracking-tight text-gray-900'>
        {profile.nickname || username}
      </h1>
      {profile.bio && (
        <p className='mt-2 text-base text-gray-600'>{profile.bio}</p>
      )}
      <p className='mt-1 text-sm font-medium text-gray-500'>@{username}</p>

      <div className='mt-4'>
        <FollowStats
          userId={profile.id}
          onFollowersClick={onFollowersClick}
          onFollowingClick={onFollowingClick}
        />
      </div>
    </div>

    {!isOwnProfile && (
      <div>
        <FollowButton userId={profile.id} />
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
      <div className='relative mb-12 overflow-hidden rounded-3xl border-2 border-white/60 bg-white/40 p-8 shadow-xl backdrop-blur-2xl'>
        {/* 배경 장식 */}
        <div className='absolute right-0 top-0 h-64 w-64 bg-gradient-to-br from-blue-100/30 to-transparent blur-3xl' />
        <div className='absolute bottom-0 left-0 h-48 w-48 bg-gradient-to-tr from-sky-100/30 to-transparent blur-3xl' />

        <div className='relative flex items-start gap-6'>
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
