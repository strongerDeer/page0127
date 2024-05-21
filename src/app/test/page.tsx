'use client';

import { useState } from 'react';

import Input from '@components/shared/Input';
import Button from '@components/shared/Button';

import {
  AlertContextValue,
  AlertProps,
  useAlertContext,
} from '@contexts/AlertContext';
import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';

export default function TestPage() {
  const { open: alertOpen } = useAlertContext() as AlertContextValue;
  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;

  return (
    <main>
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
      <Button
        onClick={() => {
          modalOpen({
            title: 'dddd',
            body: 'dddd',
            actionClickEvent: () => {
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
    </main>
  );
}
