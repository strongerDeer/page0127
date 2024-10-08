import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { ApplyClubValues, Club } from '@connect/club';

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

export async function club(club: Club) {
  return addDoc(collection(store, COLLECTIONS.CLUBS), club);
}

export async function updateClub({
  userId,
  applyClubValues,
}: {
  userId: string;
  applyClubValues: Partial<ApplyClubValues>;
}) {
  const snapshot = await getDocs(
    query(collection(store, COLLECTIONS.CLUBS), where('userId', '==', userId)),
  );

  const [applied] = snapshot.docs;

  updateDoc(applied.ref, applyClubValues);
}
