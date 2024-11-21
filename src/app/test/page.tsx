import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, doc, getDocs, query, setDoc } from 'firebase/firestore';

export default async function page() {
  const oldDocs = await getDocs(
    query(
      collection(
        store,
        `${COLLECTIONS.USER}/yfxfbwa1MEWHplpu4Fm1K8gklOS2/goal`,
      ),
    ),
  );

  // await setDoc(
  //   doc(collection(store, `${COLLECTIONS.USER}/dreamfulbud/book`)),
  //   data,
  //   { merge: true },
  // );

  // await Promise.all(
  //   oldDocs.docs.map(async (document) => {
  //     const data = document.data();
  //     await setDoc(
  //       doc(store, `${COLLECTIONS.USER}/dreamfulbud/goal`, document.id),
  //       data,
  //     );
  //   }),
  // );

  return <div>page</div>;
}
// 2. 새로운 ID로 문서 생성하고 데이터 복사
