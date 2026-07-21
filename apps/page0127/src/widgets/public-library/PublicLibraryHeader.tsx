'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { FollowButton, FollowListModal, FollowStats } from '@/features/follow';

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

export const PublicLibraryHeader = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
}: PublicLibraryHeaderProps) => {
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const displayName = profile.nickname || username;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${username}`
      );
      toast.success('서재 주소를 복사했어요.');
    } catch {
      toast.error('서재 주소를 복사하지 못했어요.');
    }
  };

  return (
    <>
      <header className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
        <div className='flex min-w-0 items-center gap-5'>
          {profile.photo_url ? (
            <div className='relative size-20 shrink-0 overflow-hidden rounded-full bg-muted'>
              <Image
                src={profile.photo_url}
                alt={`${displayName} 프로필`}
                fill
                sizes='80px'
                className='object-cover'
                priority
              />
            </div>
          ) : (
            <div className='flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary'>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className='min-w-0'>
            <p className='mb-1 text-sm font-medium text-primary'>공개 서재</p>
            <h1 className='heading-1 truncate text-text-strong'>
              {displayName}님의 서재
            </h1>
            <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className='text-sm text-text-subtle'>@{username}</span>
              <FollowStats
                userId={profile.id}
                onFollowersClick={() => setFollowersModalOpen(true)}
                onFollowingClick={() => setFollowingModalOpen(true)}
              />
            </div>
            {profile.bio && (
              <p className='mt-3 max-w-2xl break-keep text-sm leading-relaxed text-text-body'>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        <div className='flex shrink-0 flex-wrap items-center gap-2 md:justify-end'>
          {!isOwnProfile && <FollowButton userId={profile.id} />}

          {!isOwnProfile ? (
            <Button asChild variant='outline' className='shadow-none'>
              <Link href={`/${username}/compatibility`}>
                <Sparkles className='h-4 w-4' />
                독서 궁합
              </Link>
            </Button>
          ) : (
            <Button asChild variant='outline' className='shadow-none'>
              <Link href='/settings'>프로필 편집</Link>
            </Button>
          )}

          <Button
            variant='outline'
            size='icon'
            className='shadow-none'
            onClick={handleCopyUrl}
            title='공개 서재 주소 복사'
          >
            <span className='sr-only'>공개 서재 주소 복사</span>
            <Link2 className='h-4 w-4' />
          </Button>
        </div>
      </header>

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
