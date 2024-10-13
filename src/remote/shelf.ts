import { MyData } from '@components/templates/TemplateBookCreate';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book } from '@connect/book';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  setDoc,
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

export async function addBookInShelf(uid: string, bookId: string, data: Book) {
  try {
    await setDoc(
      doc(store, `users/${uid}/book/${bookId}`),
      {
        flipCover: data.flipCover,
        frontCover: data.frontCover,
        title: data.title,
        subTitle: data.subTitle,
        author: data.author,
        memo: data.memo,
        grade: data.grade,
        readDate: data.readDate,
        category: data.category,
        lastUpdatedTime: new Date(),
        createdTime: new Date(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
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

    await setDoc(
      doc(store, `${COLLECTIONS.USER}/${uid}`),
      { currentBook: increment(1), totalBook: increment(1) },
      {
        merge: true,
      },
    );
  } catch (error) {
    console.error('유저 데이터 추가 에러:', error);
    throw error;
  }
}

export async function addBook(
  uid: string,
  bookId: string,
  data: Book,
  myData: MyData,
) {
  try {
    await setDoc(
      doc(store, 'books', bookId),
      {
        ...data,
        createdTime: new Date(),
        lastUpdatedTime: new Date(),
        readUser: arrayUnion(uid),
        grade: { [`${myData.grade}`]: arrayUnion(uid) },
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}
