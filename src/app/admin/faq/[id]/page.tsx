'use client';

import Input from '@components/form/Input';
import Button from '@components/shared/Button';
import { FAQ } from '@connect/faq';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function CreateFaq({ params }: { params: { id: string } }) {
  const { id } = params;

  const [faq, setFaq] = useState<FAQ>({
    question: '',
    answer: '',
  });

  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    getDoc(doc(collection(store, COLLECTIONS.FAQ), id)).then((snapshot) => {
      const data = () => ({
        id: snapshot.id,
        ...(snapshot.data() as FAQ),
      });

      setFaq(data);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await updateDoc(doc(collection(store, COLLECTIONS.FAQ), id), { ...faq });
      toast.success('FAQ가 수정되었습니다');
      router.push('/admin/faq');
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  };

  const isSubmit = Object.values(faq).every((value) => value !== '');
  return (
    <div>
      FAQ 수정
      <form onSubmit={onSubmit}>
        <Input
          label="질문"
          id="question"
          name="question"
          value={faq.question}
          setValue={setFaq}
        />
        <Input
          label="답변"
          id="answer"
          name="answer"
          value={faq.answer}
          setValue={setFaq}
        />

        <Button type="submit" disabled={!isSubmit}>
          질문 등록
        </Button>
      </form>
    </div>
  );
}
