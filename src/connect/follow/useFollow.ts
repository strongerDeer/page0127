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
    myUserId,
    targetUserId,
  }: {
    myUserId: string;
    targetUserId: string;
  }) => {
    const q = query(
      collection(store, `${COLLECTIONS.USER}/${myUserId}/following`),
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => doc.id);

    if (data.includes(targetUserId)) {
      // 나의 팔로잉 삭제
      deleteDoc(
        doc(store, `${COLLECTIONS.USER}/${myUserId}/following/${targetUserId}`),
      );
      // 나의 팔로잉 카운터 감소
      updateDoc(doc(store, `${COLLECTIONS.USER}/${myUserId}`), {
        followingCount: increment(-1),
      });
      // 상대방 팔로워 삭제
      deleteDoc(
        doc(store, `${COLLECTIONS.USER}/${targetUserId}/follower/${myUserId}`),
      );
      // 상대방 팔로워 카운터 감소
      updateDoc(doc(store, `${COLLECTIONS.USER}/${targetUserId}`), {
        followersCount: increment(-1),
      });
    } else {
      // 나의 팔로잉 카운터 추가
      updateDoc(doc(store, `${COLLECTIONS.USER}/${myUserId}`), {
        followingCount: increment(1),
      });
      // 나의 팔로잉 추가
      setDoc(
        doc(
          collection(store, `${COLLECTIONS.USER}/${myUserId}/following`),
          targetUserId,
        ),
        { userId: targetUserId, createdTime: new Date() },
        { merge: true },
      );

      // 상대방 팔로워 카운터 추가
      updateDoc(doc(store, `${COLLECTIONS.USER}/${targetUserId}`), {
        followersCount: increment(1),
      });
      // 상대방 팔로워 추가
      setDoc(
        doc(
          collection(store, `${COLLECTIONS.USER}/${targetUserId}/follower`),
          myUserId,
        ),
        { userId: myUserId, createdTime: new Date() },
        { merge: true },
      );
    }
  };
  return {
    toggleFollow,
  };
}
