import InputRadio from '@components/form/InputRadio';
import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import { MembershipValues } from '@models/membership';
import { useState } from 'react';

export type CardInfoValues = Pick<
  MembershipValues,
  'isRadio1' | 'isRadio2' | 'isRadio3'
>;

export default function CardInfo({
  onNext,
}: {
  onNext: (cardInfoValues: CardInfoValues) => void;
}) {
  const isMobile = false;
  const [cardInfoValues, setCardInfoValues] = useState<CardInfoValues>({
    isRadio1: false,
    isRadio2: false,
    isRadio3: false,
  });

  const { isRadio1, isRadio2, isRadio3 } = cardInfoValues;
  const list1 = [
    { value: true, label: 'Master' },
    { value: false, label: '국내전용' },
  ];

  const list2 = [
    { value: true, label: '신청' },
    { value: false, label: '신청안함' },
  ];

  const list3 = [
    { value: true, label: '신청' },
    { value: false, label: '신청안함' },
  ];
  return (
    <div className="max-width">
      <InputRadio
        title="해외결제"
        setValue={setCardInfoValues}
        name="isRadio1"
        list={list1}
      />
      <InputRadio
        setValue={setCardInfoValues}
        title="후불교통기능"
        name="isRadio2"
        list={list2}
      />
      <InputRadio
        setValue={setCardInfoValues}
        title="후불하이패스카드"
        name="isRadio3"
        list={list3}
      />

      {isMobile ? (
        <ButtonFixedBottom text="다음" onClick={() => onNext(cardInfoValues)} />
      ) : (
        <Button size="lg" full onClick={() => onNext(cardInfoValues)}>
          다음
        </Button>
      )}
    </div>
  );
}
