'use client';
import BasicInfo from '@components/club/BasicInfo';
import CardInfo from '@components/club/CardInfo';
import Terms from '@components/club/Terms';
import useUser from '@hooks/auth/useUser';
import {
  APPLY_STATUS,
  CardInfoValues,
  ApplyClubValues,
  InfoValues,
} from '@models/applyClub';
import { useEffect, useState } from 'react';

export default function ApplyClub({
  id,
  onSubmit,
}: {
  id: string;
  onSubmit: (applyClubValues: ApplyClubValues) => void;
}) {
  const user = useUser();
  const storageKey = `applied-${user?.uid}-${id}`;

  /*
    초기 상태를 함수로 설정
    1. 지연초기화
      함수를 사용하면 초기 상태가 컴포넌트가 마운트될 때 한번만 계산 됨!
    2. 불필요한 재계산 방지:
      일반적인 값을 직접 전달: 컴포넌트가 리렌더링 될때마다 값이 재생성. 
    3. 사이드 이펙트 방지
    4. 조건부 로직처리
    5. 성능 최적화
  */
  const [applyClubValues, setApplyClubValues] = useState<
    Partial<ApplyClubValues>
  >(() => {
    const applied = localStorage.getItem(storageKey);

    if (applied === null) {
      return {
        userId: user?.uid,
        clubId: id,
        step: 0,
      };
    }
    return JSON.parse(applied);
  });

  useEffect(() => {
    if (applyClubValues.step === 3) {
      localStorage.removeItem(storageKey);
      onSubmit({
        ...applyClubValues,
        appliedAt: new Date(),
        status: APPLY_STATUS.READY,
      } as ApplyClubValues);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(applyClubValues));
    }
  }, [applyClubValues, onSubmit, storageKey]);

  const handleTermsChange = (terms: ApplyClubValues['terms']) => {
    setApplyClubValues((prev) => ({
      ...prev,
      terms,
      step: (prev.step as number) + 1,
    }));
  };
  const handleBasicInfoChange = (infoValues: InfoValues) => {
    setApplyClubValues((prev) => ({
      ...prev,
      ...infoValues,
      step: (prev.step as number) + 1,
    }));
  };
  const handleCardInfoChange = (cardInfoValues: CardInfoValues) => {
    setApplyClubValues((prev) => ({
      ...prev,
      ...cardInfoValues,
      step: (prev.step as number) + 1,
    }));
  };
  return (
    <div>
      {applyClubValues.step === 0 ? <Terms onNext={handleTermsChange} /> : null}
      {applyClubValues.step === 1 ? (
        <BasicInfo onNext={handleBasicInfoChange} />
      ) : null}
      {applyClubValues.step === 2 ? (
        <CardInfo onNext={handleCardInfoChange} />
      ) : null}
    </div>
  );
}
