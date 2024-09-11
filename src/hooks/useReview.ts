import { getReviews, removeReview, writeReview } from '@remote/review';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import useUser from '@connect/user/useUser';

export function useReview({ bookId }: { bookId: string }) {
  const user = useUser();
  const client = useQueryClient();

  const { data, isLoading } = useQuery(['reviews', bookId], () =>
    getReviews({ bookId }),
  );

  const { mutateAsync: write } = useMutation(
    async (text: string) => {
      const newReview = {
        createdAt: new Date(),
        bookId,
        userId: user?.uid as string,
        text,
      };

      await writeReview(newReview);

      return true;
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['reviews', bookId]);
      },
    },
  );

  const { mutate: remove } = useMutation(
    ({ reviewId, bookId }: { reviewId: string; bookId: string }) => {
      return removeReview({ reviewId, bookId });
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['reviews', bookId]);
      },
    },
  );

  return { data, isLoading, write, remove };
}
