import { BookData, MyData } from '@components/templates/TemplateBookCreate';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import {
  arrayRemove,
  arrayUnion,
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

async function createBookInMyShelf(
  uid: string,
  bookId: string,
  data: BookData,
) {
  try {
    await setDoc(doc(store, `users/${uid}/book/${bookId}`), {
      ...data,
      createdTime: new Date(),
      lastUpdatedTime: new Date(),
    });
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}

async function updateBookInMyShelf(
  uid: string,
  bookId: string,
  data: BookData,
) {
  try {
    await updateDoc(doc(store, `users/${uid}/book/${bookId}`), {
      ...data,
      lastUpdatedTime: new Date(),
    });
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

// 내 책장 추가
export async function addBookInShelf(
  uid: string,
  bookId: string,
  data: BookData,
) {
  let hasBook = await checkBookExistsInMyShelf(uid, bookId);
  if (!hasBook) {
    await createBookInMyShelf(uid, bookId, data);
  } else {
    await updateBookInMyShelf(uid, bookId, data);
  }
}

// 카테고리 추가
export async function addCategory(
  uid: string,
  bookId: string,
  category: string,
) {
  let categoryText = '기타';
  switch (category) {
    case '컴퓨터/모바일':
      categoryText = '컴퓨터모바일';
      break;
    case '소설/시/희곡':
      categoryText = '소설시희곡';
      break;
    case '에세이':
      categoryText = '에세이';
      break;
    case '경제경영':
      categoryText = '경제경영';
      break;
    case '인문학':
      categoryText = '인문학';
      break;
    case '자기계발':
      categoryText = '자기계발';
      break;
  }

  try {
    await updateDoc(doc(store, `users/${uid}`), {
      total: arrayUnion(bookId),
      [`category.${categoryText}`]: arrayUnion(bookId),
    });
  } catch (error) {
    console.error('Error updating book:', error);
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
  data: BookData,
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
  data: BookData,
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
  data: BookData,
  myData: MyData,
) {
  let hasBook = await checkBookExists(bookId);
  if (!hasBook) {
    await createBook(uid, bookId, data, myData);
  } else {
    await updateBook(uid, bookId, data, myData);
  }
}
