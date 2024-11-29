import ShelfPage from '@components/templates/ShelfPage';
import { User } from '@connect/user';
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

  const userData = userDoc.data() as User;

  if (!userData) {
    throw new Error('유저 데이터 없음.');
  }

  return <ShelfPage userData={userData} />;
}
