import Link from 'next/link';

type ProfileLinkProps = {
  /** 없으면(탈퇴·미설정) 링크를 걸지 않는다 */
  username: string | null;
  className?: string;
  children: React.ReactNode;
};

/**
 * 공개 프로필(/{username})로 가는 링크
 *
 * 학습 포인트:
 * - 경로는 반드시 username 기준이다. 표시용 nickname 으로 만들면 닉네임을 바꾼 사람의
 *   링크가 404가 된다(둘이 같은 계정에서만 우연히 동작한다).
 * - username 이 없으면 링크 없이 그대로 그린다. 없는 값으로 경로를 만들어 두면
 *   "누를 수 있지만 깨진 링크"가 되는데, "누를 수 없는 표시"가 낫다.
 */
export const ProfileLink = ({
  username,
  className,
  children,
}: ProfileLinkProps) => {
  if (!username) return <span className={className}>{children}</span>;

  return (
    <Link href={`/${username}`} className={className}>
      {children}
    </Link>
  );
};
