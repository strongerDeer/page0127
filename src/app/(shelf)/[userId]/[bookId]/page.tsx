import MyBookDetail from '@components/book/MyBookDetail';
import { Book } from '@connect/book';

import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: { userId: string; bookId: string };
}) {
  const { userId, bookId } = params;

  const book = await getDoc(
    doc(collection(store, `${COLLECTIONS.USER}/${userId}/book/`), bookId),
  );
  const bookData = book.data() as Book;

  if (!bookData) {
    notFound();
  }

  return (
    <div>
      <MyBookDetail userId={userId} bookId={bookId} data={bookData} />
    </div>
  );
}
