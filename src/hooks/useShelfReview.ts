import { getShelfReviews, removeReview, writeReview } from '@remote/review';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import useUser from '@connect/user/useUser';

export function useShelfReview({
  shelfUid,
  bookId,
}: {
  shelfUid: string;
  bookId: string;
}) {
  const user = useUser();
  const client = useQueryClient();

  const { data, isLoading } = useQuery(
    ['shelf-reviews', shelfUid, bookId],
    () => getShelfReviews({ shelfUid, bookId }),
  );

  const { mutateAsync: write } = useMutation(
    async (text: string) => {
      const newReview = {
        createdAt: new Date(),
        bookId,
        uid: user?.uid as string,
        userId: user?.userId as string,
        text,
      };

      await writeReview(newReview);

      return true;
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['shelf-reviews', shelfUid, bookId]);
      },
    },
  );

  const { mutate: remove } = useMutation(
    ({
      uid,
      reviewId,
      bookId,
    }: {
      uid: string;
      reviewId: string;
      bookId: string;
    }) => {
      return removeReview({ uid, reviewId, bookId });
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['shelf-reviews', shelfUid, bookId]);
      },
    },
  );

  return { data, isLoading, write, remove };
}
