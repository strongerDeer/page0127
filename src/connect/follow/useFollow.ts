'use client';

import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

export default function useFollow() {
  const toggleFollow = async ({
    myUid,
    myId,
    targetUid,
    targetId,
  }: {
    myUid: string;
    myId: string;
    targetUid: string;
    targetId: string;
  }) => {
    const q = query(
      collection(store, `${COLLECTIONS.USER}/${myUid}/following`),
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => doc.id);

    if (data.includes(targetUid)) {
      // 나의 팔로잉 삭제
      deleteDoc(
        doc(store, `${COLLECTIONS.USER}/${myUid}/following/${targetUid}`),
      );
      // 나의 팔로잉 카운터 감소
      updateDoc(doc(store, `${COLLECTIONS.USER}/${myUid}`), {
        followingCount: increment(-1),
      });
      // 상대방 팔로워 삭제
      deleteDoc(
        doc(store, `${COLLECTIONS.USER}/${targetUid}/follower/${myUid}`),
      );
      // 상대방 팔로워 카운터 감소
      updateDoc(doc(store, `${COLLECTIONS.USER}/${targetUid}`), {
        followersCount: increment(-1),
      });
    } else {
      // 나의 팔로잉 카운터 추가
      updateDoc(doc(store, `${COLLECTIONS.USER}/${myUid}`), {
        followingCount: increment(1),
      });
      // 나의 팔로잉 추가
      setDoc(
        doc(
          collection(store, `${COLLECTIONS.USER}/${myUid}/following`),
          targetUid,
        ),
        { userId: targetId, createdTime: new Date() },
        { merge: true },
      );

      // 상대방 팔로워 카운터 추가
      updateDoc(doc(store, `${COLLECTIONS.USER}/${targetUid}`), {
        followersCount: increment(1),
      });
      // 상대방 팔로워 추가
      setDoc(
        doc(
          collection(store, `${COLLECTIONS.USER}/${targetUid}/follower`),
          myUid,
        ),
        { userId: myId, createdTime: new Date() },
        { merge: true },
      );
    }
  };
  return {
    toggleFollow,
  };
}
