import Button from '@components/shared/Button';
import useUser from '@connect/user/useUser';
import useFollow from '@connect/follow/useFollow';

export default function FollowButton({
  isFollowing,
  userId,
}: {
  isFollowing: boolean;

  userId: string;
}) {
  const myData = useUser();
  const { toggleFollow } = useFollow();

  if (userId === myData?.userId || !myData?.userId) {
    return null;
  }

  return (
    <Button
      onClick={() =>
        toggleFollow({
          myUserId: myData?.userId,
          targetUserId: userId,
        })
      }
      size="sm"
      variant={isFollowing ? 'outline' : 'solid'}
      color={isFollowing ? 'error' : 'primary'}
    >
      {isFollowing ? '팔로우 취소' : '팔로우 하기'}
    </Button>
  );
}
