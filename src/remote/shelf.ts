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
  increment,
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
        page: data.page,
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}
// 년도별, 카테고리별, 점수별, 출판사 데이터 추가

export async function addCountData(
  uid: string,
  bookData: Book,
  myData: MyData,
) {
  const { category, publisher, id: bookId, page } = bookData;
  const { readDate, grade } = myData;

  const [year, month] = readDate.split('-');

  try {
    const totalQuery = doc(
      collection(store, `${COLLECTIONS.USER}/${uid}/counter`),
      year,
    );

    await setDoc(
      totalQuery,
      {
        totalBook: arrayUnion(bookId),
        totalBookCount: increment(1),
        totalPage: increment(page || 0),
        date: {
          [`${year}-${month}`]: arrayUnion(bookId),
        },
        category: { [category.replaceAll('/', '')]: arrayUnion(bookId) },
        grade: {
          [`${grade}`]: arrayUnion(bookId),
        },
        publisher: { [publisher]: arrayUnion(bookId) },
      },
      { merge: true },
    );

    await setDoc(
      doc(store, `${COLLECTIONS.USER}/${uid}`),
      {
        totalBook: increment(1),
        totalPage: increment(page),
      },
      {
        merge: true,
      },
    );
  } catch (error) {
    console.error('유저 데이터 추가 에러:', error);
    throw error;
  }
}

export async function updateCountData(
  bookId: string,
  uid: string,
  bookData: Book,
  myData: MyData,
) {
  const { readDate: prevReadDate, grade: prevGrade } = bookData;
  const { readDate, grade } = myData;
  const [year, month] = readDate.split('-');
  const [prevYear, prevMonth] = prevReadDate.split('-');

  try {
    const totalQuery = doc(
      collection(store, `${COLLECTIONS.USER}/${uid}/counter`),
      'total',
    );

    const updateData: Record<string, any> = {};

    if (prevGrade !== grade) {
      updateData.grade = {
        [`${prevGrade}`]: arrayRemove(bookId),
        [`${grade}`]: arrayUnion(bookId),
      };
    }

    if (prevYear !== year || prevMonth !== month) {
      updateData.date = {
        [`${prevYear}-${prevMonth}`]: arrayRemove(bookId),
        [`${year}-${month}`]: arrayUnion(bookId),
      };
    }

    if (Object.keys(updateData).length > 0) {
      await setDoc(totalQuery, updateData, { merge: true });
    }
  } catch (error) {
    console.error('유저 데이터 업데이트 에러:', error);
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
