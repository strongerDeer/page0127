import { useMutation, useQuery, useQueryClient } from 'react-query';
import useUser from '@connect/user/useUser';
import { getReviews, removeReview, writeReview } from './review';
import { getUser } from '@connect/user/user';

export function useReview({ bookId }: { bookId: string }) {
  const user = useUser();
  const client = useQueryClient();

  // 리뷰데이터 가져오기
  const { data, isLoading } = useQuery(['reviews', bookId], async () => {
    const reviewsData = await getReviews({ bookId });

    const reviewsWithUsers = await Promise.all(
      reviewsData.map(async (review) => {
        try {
          const userData = await getUser(review.userId);
          return {
            ...review,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
          };
        } catch (error) {
          return {
            ...review,
            displayName: '',
            photoURL: '',
          };
        }
      }),
    );

    return reviewsWithUsers;
  });

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
