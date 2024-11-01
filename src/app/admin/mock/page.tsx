'use client';
import Button from '@components/shared/Button';
import useUser from '@connect/user/useUser';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { YEAR_2024 } from '@mock/2024';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function page() {
  const user = useUser();
  const handleButtonClick = async () => {
    const batch = writeBatch(store);

    YEAR_2024.forEach((data) => {
      const ref2024 = doc(
        collection(store, `${COLLECTIONS.USER}/${user?.uid}/counter`),
        '2024',
      );
      batch.set(ref2024, data);
    });

    await batch.commit();

    toast.success('데이터 추가 완료');
  };
  return (
    <div>
      <Button onClick={handleButtonClick}>2024 user counter 데이터 추가</Button>
    </div>
  );
}
