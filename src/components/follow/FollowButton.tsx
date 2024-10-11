import Button from '@components/shared/Button';
import useUser from '@connect/user/useUser';
import useFollow from '@connect/follow/useFollow';

export default function FollowButton({
  isFollowing,
  uid,
  userId,
}: {
  isFollowing: boolean;
  uid: string;
  userId: string;
}) {
  const myData = useUser();
  const { toggleFollow } = useFollow();

  if (uid === myData?.uid || !myData?.uid) {
    return null;
  }

  return (
    <Button
      onClick={() =>
        toggleFollow({
          targetUid: uid,
          targetId: userId,
          myUid: myData.uid,
          myId: myData.userId,
        })
      }
      variant={isFollowing ? 'outline' : 'solid'}
      color={isFollowing ? 'error' : 'primary'}
    >
      {isFollowing ? '팔로우 취소' : '팔로우 하기'}
    </Button>
  );
}
