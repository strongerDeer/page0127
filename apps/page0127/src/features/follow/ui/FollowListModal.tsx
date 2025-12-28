'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

import { followApi } from '@/entities/follow';

import { UserCard } from './UserCard';

/**
 * 팔로워/팔로잉 목록 모달
 *
 * 학습 포인트:
 * - 하나의 컴포넌트로 팔로워/팔로잉 목록 모두 처리
 * - type prop으로 API 호출 분기
 */
type FollowListModalProps = {
  userId: string;
  type: 'followers' | 'following';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string; // 현재 로그인한 사용자 ID
};

export const FollowListModal = ({
  userId,
  type,
  open,
  onOpenChange,
  currentUserId,
}: FollowListModalProps) => {
  // 팔로워 또는 팔로잉 목록 조회
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['follow', type, userId],
    queryFn: () =>
      type === 'followers'
        ? followApi.getFollowers(userId)
        : followApi.getFollowing(userId),
    enabled: open, // 모달이 열렸을 때만 조회
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] max-w-md overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {type === 'followers' ? '팔로워' : '팔로잉'} ({users.length})
          </DialogTitle>
        </DialogHeader>

        <div className='mt-4 space-y-3'>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
            </div>
          ) : users.length === 0 ? (
            <div className='py-8 text-center text-sm text-gray-500'>
              {type === 'followers'
                ? '아직 팔로워가 없습니다.'
                : '아직 팔로잉한 사용자가 없습니다.'}
            </div>
          ) : (
            users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
