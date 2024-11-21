import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { User } from '@connect/user';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

export async function getShelfReviews({
  shelfUserId,
  bookId,
}: {
  shelfUserId: string;
  bookId: string;
}) {
  const bookRef = doc(
    store,
    `${COLLECTIONS.USER}/${shelfUserId}/book/${bookId}`,
  );
  const reviewQuery = query(
    collection(bookRef, COLLECTIONS.REVIEW),
    orderBy('createdAt', 'desc'),
  );

  const reviewSnapshot = await getDocs(reviewQuery);

  const reviews = reviewSnapshot.docs.map((doc) => {
    const review = doc.data();

    return {
      id: doc.id,
      ...review,
      createdAt: review.createdAt.toDate() as Date,
    } as Review;
  });

  const userMap: {
    [key: string]: User;
  } = {};

  const results: Array<Review & { user: User }> = [];

  for (let review of reviews) {
    const cachedUser = userMap[review.userId];

    if (cachedUser === null || cachedUser === undefined) {
      const userSnapshot = await getDoc(
        doc(collection(store, COLLECTIONS.USER), review.userId),
      );

      const user = userSnapshot.data() as User;
      userMap[review.userId] = user;
      results.push({
        ...review,
        user,
      });
    } else {
      results.push({
        ...review,
        user: cachedUser,
      });
    }
  }
  return results;
}

export function writeShelfReview(review: Omit<Review, 'id'>) {
  const bookRef = doc(
    store,
    `${COLLECTIONS.USER}/${review.userId}/book/${review.bookId}`,
  );
  const reviewRef = doc(collection(bookRef, COLLECTIONS.REVIEW));

  return setDoc(reviewRef, review);
}

export function removeShelfReview({
  userId,
  reviewId,
  bookId,
}: {
  userId: string;
  reviewId: string;
  bookId: string;
}) {
  const bookRef = doc(store, `${COLLECTIONS.USER}/${userId}/book/${bookId}`);
  const reviewRef = doc(collection(bookRef, COLLECTIONS.REVIEW), reviewId);

  return deleteDoc(reviewRef);
}
