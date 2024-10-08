'use client';

import Input from '@components/form/Input';
import Button from '@components/shared/Button';
import { FAQ } from '@connect/faq';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function CreateFaq() {
  const [faq, setFaq] = useState<FAQ>({
    question: '',
    answer: '',
  });

  const router = useRouter();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = doc(collection(store, COLLECTIONS.FAQ));

    try {
      await setDoc(q, faq, { merge: true });
      toast.success('배너가 등록되었습니다');
      router.push('/admin/faq');
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  };

  const isSubmit = Object.values(faq).every((value) => value !== '');
  return (
    <div>
      FAQ 등록
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
