import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { store } from './firebaeApp';
import { COLLECTIONS } from '@constants';
import { Book } from '@models/Book';

export async function getBooks() {
  const bookQuery = query(
    collection(store, COLLECTIONS.BOOKS),
    orderBy('lastUpdatedTime', 'desc'),
  );
  const bookSnapshot = await getDocs(bookQuery);

  const books = bookSnapshot.docs.map((doc) => ({
    ...(doc.data() as Book),
  }));

  return books;
}
