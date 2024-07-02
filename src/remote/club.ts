import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';
import { COLLECTIONS } from '@constants';
import { Club } from '@models/club';

export async function getClubs() {
  const snapshot = await getDocs(collection(store, COLLECTIONS.CLUBS));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Club),
  }));
}

export async function getClub(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.CLUBS, id));
  return {
    id,
    ...(snapshot.data() as Club),
  };
}
