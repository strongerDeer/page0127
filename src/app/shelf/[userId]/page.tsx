import ShelfPage from '@components/templates/ShelfPage';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';

export const dynamicParams = true;
export const revalidate = 60;

export default async function page({ params }: { params: { userId: string } }) {
  const userId = params.userId;

  const userDoc = await getDocs(
    query(
      collection(store, COLLECTIONS.USER),
      where('userId', '==', userId),
      limit(1),
    ),
  );

  if (userDoc.empty) {
    notFound();
  }

  return <ShelfPage userId={userId} />;
}
