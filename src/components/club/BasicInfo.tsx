import Select from '@components/form/Select';
import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import { InfoValues } from '@connect/club';

import { useState } from 'react';

export default function BasicInfo({
  onNext,
}: {
  onNext: (infoValues: InfoValues) => void;
}) {
  const isMobile = false;
  const [infoValues, setInfoValues] = useState<InfoValues>({
    option1: '',
    option2: '',
    option3: '',
  });

  const isAllSelected = Object.values(infoValues).every((value) => value);

  return (
    <div>
      {/* <Select
        label="option1"
        options={option1}
        placeholder="값을 선택해주세요!"
        value={infoValues.option1}
        setValue={setInfoValues}
        id="option1"
        name="option1"
        required
      />
      <Select
        label="option2"
        options={option2}
        placeholder="값을 선택해주세요!"
        value={infoValues.option2}
        setValue={setInfoValues}
        id="option2"
        name="option2"
        required
      />
      <Select
        label="option3"
        options={option3}
        value={infoValues.option3}
        setValue={setInfoValues}
        placeholder="값을 선택해주세요!"
        id="option3"
        name="option3"
        required
      /> */}

      {isMobile ? (
        <ButtonFixedBottom
          text="다음"
          disabled={!isAllSelected}
          onClick={() => onNext(infoValues)}
        />
      ) : (
        <Button
          size="lg"
          full
          disabled={!isAllSelected}
          onClick={() => onNext(infoValues)}
        >
          다음
        </Button>
      )}
    </div>
  );
}
