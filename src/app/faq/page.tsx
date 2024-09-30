// SSG
// 'use client';
import { FAQ } from '@connect/faq';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, getDocs } from 'firebase/firestore';
// import { useEffect, useState } from 'react';

interface FAQProps extends FAQ {
  id: string;
}
export default async function FAQPage() {
  const faqs = await getFAQs();

  // CSR
  // const [faqs, setFaqs] = useState<FAQProps[] >([]);
  // useEffect(() => {
  //   getDocs(collection(store, COLLECTIONS.FAQ)).then((snapshot) => {
  //     const data = snapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...(doc.data() as FAQ),
  //     }));
  //     setFaqs(data);
  //   });
  // }, []);

  return (
    <div>
      {faqs.map((faq) => (
        <div key={faq.id}>
          <h3> {faq.question}</h3>
          <p> {faq.answer}</p>
        </div>
      ))}
    </div>
  );
}

async function getFAQs() {
  const snapshot = await getDocs(collection(store, COLLECTIONS.FAQ));
  const faqs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as FAQ),
  }));

  return faqs;
}
