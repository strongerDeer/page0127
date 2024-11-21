import ShelfPage from '@components/templates/ShelfPage';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

export const dynamicParams = true;
export const revalidate = 60;

export default async function page({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const userDoc = await getDoc(doc(store, COLLECTIONS.USER, userId));
  if (!userDoc.exists()) {
    notFound();
  }

  return <ShelfPage userId={userId} />;
}
