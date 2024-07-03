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
  const [step, setStep] = useState(0);

  const [applyClubValues, setApplyClubValues] = useState<
    Partial<ApplyClubValues>
  >({
    userId: user?.uid,
    clubId: id,
  });

  useEffect(() => {
    if (step === 3) {
      onSubmit({
        ...applyClubValues,
        appliedAt: new Date(),
        status: APPLY_STATUS.READY,
      } as ApplyClubValues);
    }
  }, [step, applyClubValues, onSubmit]);

  const handleTermsChange = (terms: ApplyClubValues['terms']) => {
    setApplyClubValues((prev) => ({ ...prev, terms }));
    setStep((prev) => prev + 1);
  };
  const handleBasicInfoChange = (infoValues: InfoValues) => {
    setApplyClubValues((prev) => ({ ...prev, ...infoValues }));
    setStep((prev) => prev + 1);
  };
  const handleCardInfoChange = (cardInfoValues: CardInfoValues) => {
    setApplyClubValues((prev) => ({ ...prev, ...cardInfoValues }));
    setStep((prev) => prev + 1);
  };
  return (
    <div>
      {step === 0 ? <Terms onNext={handleTermsChange} /> : null}
      {step === 1 ? <BasicInfo onNext={handleBasicInfoChange} /> : null}
      {step === 2 ? <CardInfo onNext={handleCardInfoChange} /> : null}
    </div>
  );
}
