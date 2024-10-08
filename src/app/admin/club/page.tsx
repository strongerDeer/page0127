'use client';
import Button from '@components/shared/Button';
import { deleteBanner } from '@connect/banner/banner';
import { deleteFAQ } from '@connect/faq/faq';
import useFaq from '@connect/faq/useFaq';

import {
  ModalContextValue,
  ModalProps,
  useModalContext,
} from '@contexts/ModalContext';
import { toast } from 'react-toastify';

export default function ClubPage() {
  const { data } = useFaq();

  const { open: modalOpen, close: modalClose } =
    useModalContext() as ModalContextValue;

  return (
    <div className="max-width">
      <h2 className="title1">FAQ</h2>

      {data && data.length > 0 && (
        <ul>
          {data.map((data) => (
            <li key={data.id}>
              <h3>{data.question}</h3>
              <p>{data.answer}</p>

              <Button
                onClick={() => {
                  modalOpen({
                    title: `${data.question} 삭제`,
                    body: '해당 FAQ를 삭제하시겠습니까?',
                    buttonLabel: '삭제',
                    closeButtonLabel: '취소',
                    onButtonClick: () => {
                      deleteFAQ(data.id);
                      modalClose();
                      toast.success('FAQ가 삭제되었습니다');
                    },
                    closeModal: () => {
                      modalClose();
                    },
                  } as ModalProps);
                }}
              >
                삭제
              </Button>
              <Button href={`/admin/faq/${data.id}`}>faq 수정</Button>
            </li>
          ))}
        </ul>
      )}

      <Button href="/admin/faq/create">faq 생성</Button>
    </div>
  );
}
