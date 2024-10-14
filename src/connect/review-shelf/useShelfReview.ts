import { useMutation, useQuery, useQueryClient } from 'react-query';
import useUser from '@connect/user/useUser';
import {
  getShelfReviews,
  removeShelfReview,
  writeShelfReview,
} from './shelfReview';

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

      await writeShelfReview(newReview);

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
      return removeShelfReview({ uid, reviewId, bookId });
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['shelf-reviews', shelfUid, bookId]);
      },
    },
  );

  return { data, isLoading, write, remove };
}
