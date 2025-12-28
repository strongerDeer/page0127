'use client';

import Image from 'next/image';
import { useState } from 'react';

import { FollowButton, FollowListModal, FollowStats } from '@/features/follow';

/**
 * 공개 서재 헤더 (Client Component)
 *
 * 학습 포인트:
 * - 팔로우 기능은 클라이언트 인터랙션이 필요하므로 'use client'
 * - 프로필 정보는 props로 받아옴 (Server Component에서 전달)
 * - 모달 상태 관리
 */
type PublicLibraryHeaderProps = {
  profile: {
    id: string;
    nickname: string | null;
    bio: string | null;
    photo_url: string | null;
  };
  username: string;
  isOwnProfile: boolean; // 본인 프로필 여부
  currentUserId?: string; // 현재 로그인한 사용자 ID
};

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
      <div className='mb-8 rounded-lg border bg-white p-6 shadow-sm'>
        <div className='flex items-start gap-4'>
          {/* 프로필 이미지 */}
          {profile.photo_url ? (
            <div className='relative h-20 w-20 overflow-hidden rounded-full'>
              <Image
                src={profile.photo_url}
                alt={profile.nickname || username}
                fill
                sizes='80px'
                className='object-cover'
                priority
              />
            </div>
          ) : (
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-600'>
              {(profile.nickname || username).charAt(0).toUpperCase()}
            </div>
          )}

          {/* 프로필 정보 */}
          <div className='flex-1'>
            <h1 className='text-2xl font-bold'>
              {profile.nickname || username}의 서재
            </h1>
            {profile.bio && (
              <p className='mt-2 text-gray-600'>{profile.bio}</p>
            )}
            <p className='mt-1 text-sm text-gray-500'>@{username}</p>

            {/* 팔로우 통계 */}
            <div className='mt-3'>
              <FollowStats
                userId={profile.id}
                onFollowersClick={() => setFollowersModalOpen(true)}
                onFollowingClick={() => setFollowingModalOpen(true)}
              />
            </div>
          </div>

          {/* 팔로우 버튼 (본인 프로필이 아닐 때만) */}
          {!isOwnProfile && (
            <div>
              <FollowButton userId={profile.id} />
            </div>
          )}
        </div>
      </div>

      {/* 팔로워 목록 모달 */}
      <FollowListModal
        userId={profile.id}
        type='followers'
        open={followersModalOpen}
        onOpenChange={setFollowersModalOpen}
        currentUserId={currentUserId}
      />

      {/* 팔로잉 목록 모달 */}
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
