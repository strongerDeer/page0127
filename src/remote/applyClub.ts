import {
  addDoc,
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';
import { COLLECTIONS } from '@constants';
import { ApplyClubValues } from '@models/applyClub';

export async function applyClub(applyClubValues: ApplyClubValues) {
  return addDoc(collection(store, COLLECTIONS.CLUB_APPLY), applyClubValues);
}

export async function updateApplyClub({
  clubId,
  userId,
  applyClubValues,
}: {
  clubId: string;
  userId: string;
  applyClubValues: Partial<ApplyClubValues>;
}) {
  const snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.CLUB_APPLY),
      where('userId', '==', userId),
      where('clubId', '==', clubId),
    ),
  );

  const [applied] = snapshot.docs;

  updateDoc(applied.ref, applyClubValues);
}