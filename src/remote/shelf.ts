import { MyData } from '@components/templates/TemplateBookCreate';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book } from '@connect/book';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

async function checkBookExistsInMyShelf(uid: string, bookId: string) {
  try {
    const bookDoc = await getDoc(doc(store, `users/${uid}/book/${bookId}`));
    return bookDoc.exists();
  } catch (error) {
    console.error('Error checking book existence:', error);
    throw error;
  }
}

async function createBookInMyShelf(uid: string, bookId: string, data: Book) {
  try {
    await setDoc(doc(store, `users/${uid}/book/${bookId}`), {
      flipCover: data.flipCover,
      frontCover: data.frontCover,
      title: data.title,
      subTitle: data.subTitle,
      author: data.author,
      memo: data.memo,
      grade: data.grade,
      readDate: data.readDate,

      lastUpdatedTime: new Date(),
      createdTime: new Date(),
    });
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}

async function updateBookInMyShelf(uid: string, bookId: string, data: Book) {
  try {
    await updateDoc(doc(store, `users/${uid}/book/${bookId}`), {
      memo: data.memo,
      grade: data.grade,
      readDate: data.readDate,
      lastUpdatedTime: new Date(),
    });
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

// 내 책장 추가
export async function addBookInShelf(uid: string, bookId: string, data: Book) {
  let hasBook = await checkBookExistsInMyShelf(uid, bookId);
  if (!hasBook) {
    await createBookInMyShelf(uid, bookId, data);
  } else {
    await updateBookInMyShelf(uid, bookId, data);
  }
}

// 년도별, 카테고리별, 점수별, 출판사 데이터 추가
export async function addUserData(uid: string, bookData: Book, myData: MyData) {
  const { category, publisher, id: bookId } = bookData;
  const { readDate, grade } = myData;

  const [year, month] = readDate.split('-');

  try {
    const totalQuery = doc(
      collection(store, `${COLLECTIONS.USER}/${uid}/total`),
      year,
    );
    await setDoc(
      totalQuery,
      {
        books: arrayUnion(bookId),
        month: { [month]: arrayUnion(bookId) },
        category: { [category.replaceAll('/', '')]: arrayUnion(bookId) },
        grade: { [grade]: arrayUnion(bookId) },
        publisher: { [publisher]: arrayUnion(bookId) },
      },
      { merge: true },
    );
  } catch (error) {
    console.error('유저 데이터 추가 에러:', error);
    throw error;
  }
}

// 전체 북 추가

async function checkBookExists(bookId: string) {
  try {
    const bookDoc = await getDoc(doc(store, 'books', bookId));
    return bookDoc.exists();
  } catch (error) {
    console.error('Error checking book existence:', error);
    throw error;
  }
}

async function createBook(
  uid: string,
  bookId: string,
  data: Book,
  myData: MyData,
) {
  try {
    await setDoc(doc(store, 'books', bookId), {
      ...data,
      createdTime: new Date(),
      lastUpdatedTime: new Date(),
      readUser: arrayUnion(uid),
      grade: { [`${myData.grade}`]: arrayUnion(uid) },
    });
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}

async function updateBook(
  uid: string,
  bookId: string,
  data: Book,
  myData: MyData,
) {
  try {
    await updateDoc(doc(store, COLLECTIONS.BOOKS, bookId), {
      ...data,
      lastUpdatedTime: new Date(),
      readUser: arrayUnion(uid),
      grade: {
        0: arrayRemove(uid),
        1: arrayRemove(uid),
        2: arrayRemove(uid),
        3: arrayRemove(uid),
        4: arrayRemove(uid),
        5: arrayRemove(uid),
        10: arrayRemove(uid),
        [`${myData.grade}`]: arrayUnion(uid),
      },
    });
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

export async function addBook(
  uid: string,
  bookId: string,
  data: Book,
  myData: MyData,
) {
  let hasBook = await checkBookExists(bookId);
  if (!hasBook) {
    await createBook(uid, bookId, data, myData);
  } else {
    await updateBook(uid, bookId, data, myData);
  }
}
