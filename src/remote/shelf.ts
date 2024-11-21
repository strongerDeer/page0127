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

export async function addBookInShelf(
  userId: string,
  bookId: string,
  data: Book,
) {
  try {
    await setDoc(
      doc(store, `users/${userId}/book/${bookId}`),
      {
        title: data.title,
        subTitle: data.subTitle,
        frontCover: data.frontCover,
        flipCover: data.flipCover,
        author: data.author,
        publisher: data.publisher,
        pubDate: data.pubDate,
        description: data.description,
        categoryName: data.categoryName,
        category: data.category,
        page: data.page,
        price: data.price,

        readDate: data.readDate,
        memo: data.memo,
        grade: data.grade,
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

export async function addCountData(
  userId: string,
  bookData: Book,
  myData: MyData,
) {
  const { category, publisher, page } = bookData;
  const { readDate, grade } = myData;

  const [year, month] = readDate.split('-');

  try {
    const totalQuery = doc(
      collection(store, `${COLLECTIONS.USER}/${userId}/counter`),
      year,
    );

    await setDoc(
      totalQuery,
      {
        totalBook: increment(1),
        totalPage: increment(page),
        date: {
          [`${year}-${month}`]: increment(1),
        },
        category: { [category.replaceAll('/', '')]: increment(1) },
        grade: {
          [`${grade}`]: increment(1),
        },
        publisher: { [publisher]: increment(1) },
      },
      { merge: true },
    );

    await setDoc(
      doc(store, `${COLLECTIONS.USER}/${userId}`),
      {
        totalBook: increment(1),
        totalPage: increment(page),
        totalCategory: { [category.replaceAll('/', '')]: increment(1) },
        totalPublisher: { [publisher]: increment(1) },
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
  userId: string,
  bookData: Book,
  myData: MyData,
) {
  const {
    readDate: prevReadDate,
    grade: prevGrade,
    page,
    category,
    publisher,
  } = bookData;

  const { readDate, grade } = myData;
  const [year, month] = readDate.split('-');
  const [prevYear, prevMonth] = prevReadDate.split('-');

  try {
    const yearQuery = doc(
      collection(store, `${COLLECTIONS.USER}/${userId}/counter`),
      year,
    );

    const prevQuery = doc(
      collection(store, `${COLLECTIONS.USER}/${userId}/counter`),
      prevYear,
    );

    const updateData: Record<string, any> = {};

    if (prevYear === year) {
      if (prevGrade !== grade) {
        updateData.grade = {
          [`${prevGrade}`]: increment(-1),
          [`${grade}`]: increment(1),
        };
      }
      if (prevMonth !== month) {
        updateData.date = {
          [`${prevYear}-${prevMonth}`]: increment(-1),
          [`${year}-${month}`]: increment(1),
        };
      }
      if (Object.keys(updateData).length > 0) {
        await setDoc(yearQuery, updateData, { merge: true });
      }
    } else {
      await updateDoc(prevQuery, {
        totalBook: increment(-1),
        totalPage: increment(-page),
        [`date.${prevYear}-${prevMonth}`]: increment(-1),
        [`category.${category.replaceAll('/', '')}`]: increment(-1),
        [`grade.${prevGrade}`]: increment(-1),
        [`publisher.${publisher}`]: increment(-1),
      });
      await setDoc(
        yearQuery,
        {
          totalBook: increment(1),
          totalPage: increment(page),
          date: {
            [`${year}-${month}`]: increment(1),
          },
          category: { [category.replaceAll('/', '')]: increment(1) },
          grade: {
            [`${grade}`]: increment(1),
          },
          publisher: { [publisher]: increment(1) },
        },
        { merge: true },
      );
    }
  } catch (error) {
    console.error('유저 데이터 업데이트 에러:', error);
    throw error;
  }
}
export async function addBook(
  userId: string,
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
        readUser: arrayUnion(userId),
        readUserCount: increment(1),
        grade: { [`${myData.grade}`]: arrayUnion(userId) },
        grade10Count: myData.grade === '10' ? increment(1) : increment(0),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}

export async function editBook(
  userId: string,
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
        readUser: arrayUnion(userId),
        readUserCount: increment(1),
        grade: {
          [`${data.grade}`]: arrayRemove(userId),
          [`${myData.grade}`]: arrayUnion(userId),
        },
        grade10Count:
          myData.grade === '10' && data.grade !== '10'
            ? increment(1)
            : myData.grade !== '10' && data.grade === '10'
              ? increment(-1)
              : increment(0),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}
