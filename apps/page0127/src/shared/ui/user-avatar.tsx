import Image from 'next/image';

import { cn } from '@/shared/lib/utils';

type UserAvatarProps = {
  photoUrl: string | null;
  nickname: string | null;
  isDeleted?: boolean; // 탈퇴한 사용자 여부
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

/**
 * 사용자 아바타 컴포넌트
 *
 * 학습 포인트:
 * - 탈퇴한 사용자 처리 (기본 아바타 표시)
 * - 이미지 로딩 에러 처리
 * - 크기별 스타일 변형
 *
 * @param photoUrl - 프로필 이미지 URL
 * @param nickname - 사용자 닉네임 (alt 텍스트용)
 * @param isDeleted - 탈퇴한 사용자 여부
 * @param size - 아바타 크기
 */
export const UserAvatar = ({
  photoUrl,
  nickname,
  isDeleted = false,
  size = 'md',
  className,
}: UserAvatarProps) => {
  const sizeClass = sizeMap[size];

  // 탈퇴한 사용자 또는 이미지가 없는 경우 기본 아바타
  if (isDeleted || !photoUrl) {
    return (
      <div
        className={cn(
          'rounded-full bg-sunken flex items-center justify-center text-text-faint',
          sizeClass,
          isDeleted && 'opacity-50', // 탈퇴한 사용자는 흐리게
          className
        )}
      >
        <svg
          className='w-2/3 h-2/3'
          fill='currentColor'
          viewBox='0 0 24 24'
        >
          <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
        </svg>
      </div>
    );
  }

  // 프로필 이미지 표시
  return (
    <div className={cn('rounded-full overflow-hidden', sizeClass, className)}>
      <Image
        src={photoUrl}
        alt={nickname || '사용자'}
        width={48}
        height={48}
        className='w-full h-full object-cover'
      />
    </div>
  );
};
