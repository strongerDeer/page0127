import Icon from '@components/icon/Icon';

import useUser from '@hooks/auth/useUser';
import { LikeBook } from '@models/likeBook';

export default function LikeButton({
  bookId,
  bookLikes,
  bookLike,
}: {
  bookId: string;
  bookLikes: LikeBook[];
  bookLike: ({ bookId }: { bookId: string }) => void;
}) {
  const userId = useUser()?.uid;

  async function handleLike(e: React.MouseEvent<HTMLButtonElement>) {
    bookLike({ bookId });
  }
  const isLike = Boolean(bookLikes?.find((like) => like.userId === userId));

  return (
    <button type="button" onClick={handleLike}>
      {isLike ? <Icon name="heartFill" color="error" /> : <Icon name="heart" />}
    </button>
  );
}
