'use client';

import { toast } from 'react-toastify';
import { doc, writeBatch } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { banner_list, book_list } from '@mock/data';
import { grade_list } from '@mock/grade';
import { my_book_list } from '@mock/myBook';
import { user_data } from '@mock/user';

import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';

import {
  AlertContextValue,
  AlertProps,
  useAlertContext,
} from '@contexts/AlertContext';

import Button from '@components/shared/Button';
import Input from '@components/form/Input';

import { COLLECTIONS } from '@constants';

export default function TestPage() {
  const { open: alertOpen } = useAlertContext() as AlertContextValue;
  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;

  const addMockData = async (text: string) => {
    const batch = writeBatch(store);

    let list;
    let collect = '';

    switch (text) {
      case 'book':
        list = book_list;
        collect = COLLECTIONS.BOOKS;
        break;
      case 'myBook':
        list = my_book_list;
        collect = `${COLLECTIONS.USER}/7Wokh8fs9pN5J2qQDZYfEExyxB03/book`;
        break;
      case 'banner':
        list = banner_list;
        collect = COLLECTIONS.BANNERS;
        break;
    }

    if (list && collect) {
      list.map((data) => {
        const docRef = doc(store, collect, data.id);
        batch.set(docRef, data);
      });

      await batch.commit();
      toast.success(`${text} 리스트 추가완료!`);
    }
  };

  const addGradeData = async () => {
    const batch = writeBatch(store);

    grade_list.map((data) => {
      const docRef = doc(
        store,
        `${COLLECTIONS.BOOKS}/${data.id}/grade/7Wokh8fs9pN5J2qQDZYfEExyxB03`,
      );
      batch.set(docRef, data);
    });

    await batch.commit();
    toast.success('점수 리스트 추가완료!');
  };

  const addUserData = async () => {
    const batch = writeBatch(store);

    const docRef = doc(
      store,
      `${COLLECTIONS.USER}/7Wokh8fs9pN5J2qQDZYfEExyxB03`,
    );
    batch.set(docRef, user_data);

    await batch.commit();
    toast.success('점수 리스트 추가완료!');
  };
  return (
    <main>
      <div className="flex gap-2 mb-10">
        <Button variant="outline" onClick={() => addMockData('book')}>
          북 리스트 추가하기
        </Button>
        <Button variant="outline" onClick={() => addMockData('myBook')}>
          나의 북 리스트 추가하기
        </Button>
        <Button onClick={() => addGradeData()}>나의 점수 추가하기</Button>
        <Button onClick={() => addUserData()}>내정보 추가하기</Button>
        <Button onClick={() => addMockData('banner')}>
          배너 리스트 추가하기
        </Button>
      </div>

      <h2>링크</h2>

      <h3>Solid</h3>
      <div className="flex gap-4">
        <Button href="https://naver.com" size="sm">
          링크
        </Button>
        <Button href="https://naver.com">링크</Button>
        <Button href="https://naver.com" size="lg">
          링크
        </Button>
      </div>

      <h3>Outline</h3>
      <div className="flex gap-4">
        <Button href="#" variant="outline" size="sm">
          링크
        </Button>
        <Button href="#" variant="outline">
          링크
        </Button>
        <Button href="#" variant="outline" size="lg">
          링크
        </Button>
      </div>
      <h2>버튼</h2>

      <h3>Solid</h3>
      <div className="flex gap-4">
        <Button size="sm">버튼</Button>
        <Button>버튼</Button>
        <Button size="lg">버튼</Button>

        <Button size="sm" disabled>
          버튼
        </Button>
        <Button disabled>버튼</Button>
        <Button size="lg" disabled>
          버튼
        </Button>
      </div>

      <h3>Outline</h3>
      <div className="flex gap-4">
        <Button variant="outline" size="sm">
          버튼
        </Button>
        <Button variant="outline">버튼</Button>
        <Button variant="outline" size="lg">
          버튼
        </Button>

        <Button variant="outline" size="sm" disabled>
          버튼
        </Button>
        <Button variant="outline" disabled>
          버튼
        </Button>
        <Button variant="outline" size="lg" disabled>
          버튼
        </Button>
      </div>

      <h2>Input</h2>
      <Input id="id1" label="아이디" />
      <Input id="id2" label="아이디" placeholder="아이디" />
      <Input
        id="id2"
        label="아이디"
        placeholder="아이디"
        helpMessage="정확한 이메일을 입력해주세요"
      />
      <Input
        id="id3"
        label="아이디"
        hasError
        helpMessage="정확한 이메일을 입력해주세요"
      />
      <div className="flex gap-2 my-4">
        <Button
          onClick={() => {
            modalOpen({
              title: 'dddd',
              body: 'dddd',
              onButtonClick: () => {
                console.log('삭제하였습니다');
              },
              closeModal: () => {
                modalClose();
              },
            } as ModalProps);
          }}
        >
          Modal
        </Button>
        <Button
          onClick={() => {
            alertOpen({
              title: 'dddd',
              body: 'dddd',
            } as AlertProps);
          }}
        >
          Alert
        </Button>
      </div>
    </main>
  );
}
