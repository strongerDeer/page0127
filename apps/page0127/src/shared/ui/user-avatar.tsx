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

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// 모노그램 배경색 후보 — 디자인 토큰의 primary/chart 중 흰 글자와 대비가 충분한 것만 골랐다
// (chart-3·chart-4는 밝은 톤이라 흰 글자 가독성이 떨어져 제외)
const MONOGRAM_COLORS = [
  'bg-primary',
  'bg-chart-2',
  'bg-chart-5',
  'bg-chart-6',
  'bg-chart-7',
];

/** 닉네임을 해시로 색 인덱스에 매핑 — 같은 닉네임은 항상 같은 색이 나온다 */
function getMonogramColor(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = (hash * 31 + nickname.charCodeAt(i)) | 0;
  }
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
}

/** 닉네임의 첫 글자를 추출 — Array.from은 서로게이트 페어(이모지 등)도 한 글자로 센다 */
function getInitial(nickname: string): string {
  return (Array.from(nickname)[0] ?? '?').toUpperCase();
}

/**
 * 사용자 아바타 컴포넌트
 *
 * 학습 포인트:
 * - 탈퇴한 사용자 처리 (기본 아바타 표시)
 * - 프로필 이미지가 없으면 닉네임 첫 글자 + 해시 기반 배경색(모노그램)으로 대체
 * - 이미지 로딩 에러 처리
 * - 크기별 스타일 변형
 *
 * @param photoUrl - 프로필 이미지 URL
 * @param nickname - 사용자 닉네임 (alt 텍스트용, 모노그램 소스)
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

  // 탈퇴한 사용자는 신원을 드러내지 않는 회색 실루엣으로 고정
  if (isDeleted) {
    return (
      <div
        className={cn(
          'rounded-full bg-sunken flex items-center justify-center text-text-faint opacity-50',
          sizeClass,
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

  // 이미지가 없지만 닉네임은 있는 경우 → 모노그램
  if (!photoUrl && nickname) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold text-white',
          sizeClass,
          textSizeMap[size],
          getMonogramColor(nickname),
          className
        )}
      >
        {getInitial(nickname)}
      </div>
    );
  }

  // 이미지도 닉네임도 없는 경우 (예: 알림 actor 정보 유실) → 회색 실루엣
  if (!photoUrl) {
    return (
      <div
        className={cn(
          'rounded-full bg-sunken flex items-center justify-center text-text-faint',
          sizeClass,
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
