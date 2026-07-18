import Link from 'next/link';

import { cn } from '@/shared/lib/utils';

type UserLinkProps = {
  userId: string | null;
  username: string | null;
  nickname: string | null;
  className?: string;
  children?: React.ReactNode;
};

/**
 * 사용자 링크 컴포넌트
 *
 * 학습 포인트:
 * - 탈퇴한 사용자 처리 (userId가 null인 경우)
 * - 조건부 렌더링: 링크 vs 일반 텍스트
 * - 재사용 가능한 공통 컴포넌트
 *
 * @param userId - 사용자 ID (탈퇴한 경우 null)
 * @param username - 사용자 username (URL용)
 * @param nickname - 표시할 닉네임
 * @param className - 추가 스타일
 * @param children - 자식 요소 (없으면 nickname 표시)
 */
export const UserLink = ({
  userId,
  username,
  nickname,
  className,
  children,
}: UserLinkProps) => {
  // 탈퇴한 사용자인 경우 (userId가 null)
  if (!userId) {
    return (
      <span className={cn('text-text-subtle', className)}>
        {children || '탈퇴한 사용자'}
      </span>
    );
  }

  // 정상 사용자인 경우 프로필 링크 제공
  return (
    <Link
      href={`/${username}`}
      className={cn('hover:underline', className)}
    >
      {children || nickname || '알 수 없음'}
    </Link>
  );
};
