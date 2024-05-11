import { InputBookInterface } from '@app/form/page';
import { store } from '@firebase/firebaeApp';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export async function getBooks() {
  const bookQuery = query(
    collection(store, 'books'),
    orderBy('createdAt', 'desc'),
  );

  const snapshot = await getDocs(bookQuery);

  const books = snapshot.docs.map((doc) => ({
    ...(doc.data() as InputBookInterface),
  }));

  return books;
}
