import { useMutation, useQuery, useQueryClient } from 'react-query';
import useUser from '@connect/user/useUser';
import {
  getShelfReviews,
  removeShelfReview,
  writeShelfReview,
} from './shelfReview';

export function useShelfReview({
  shelfUserId,
  bookId,
}: {
  shelfUserId: string;
  bookId: string;
}) {
  const user = useUser();
  const client = useQueryClient();

  const { data, isLoading } = useQuery(
    ['shelf-reviews', shelfUserId, bookId],
    () => getShelfReviews({ shelfUserId, bookId }),
  );

  const { mutateAsync: write } = useMutation(
    async (text: string) => {
      const newReview = {
        createdAt: new Date(),
        bookId,
        userId: user?.userId as string,
        text,
      };

      await writeShelfReview(newReview);

      return true;
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['shelf-reviews', shelfUserId, bookId]);
      },
    },
  );

  const { mutate: remove } = useMutation(
    ({
      userId,
      reviewId,
      bookId,
    }: {
      userId: string;
      reviewId: string;
      bookId: string;
    }) => {
      return removeShelfReview({ userId, reviewId, bookId });
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['shelf-reviews', shelfUserId, bookId]);
      },
    },
  );

  return { data, isLoading, write, remove };
}
