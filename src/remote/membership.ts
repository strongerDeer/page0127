import {
  addDoc,
  collection,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';
import { COLLECTIONS } from '@constants';
import { Banner } from '@models/banner';
import { MembershipValues } from '@models/membership';

export async function membership(membership: MembershipValues) {
  return addDoc(collection(store, COLLECTIONS.MEMBERSHIP), membership);
}

export async function updateMembership({
  userId,
  membershipValues,
}: {
  userId: string;
  membershipValues: Partial<MembershipValues>;
}) {
  const snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.MEMBERSHIP),
      where('userId', '==', userId),
    ),
  );

  const [applied] = snapshot.docs;

  updateDoc(applied.ref, membershipValues);
}
