'use client';
import BasicInfo, { InfoValues } from '@components/membership/BasicInfo';
import CardInfo, { CardInfoValues } from '@components/membership/CardInfo';
import Terms from '@components/membership/Terms';
import useUser from '@hooks/auth/useUser';
import { APPLY_STATUS, MembershipValues } from '@models/membership';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Membership({
  onSubmit,
}: {
  onSubmit: (membershipValues: MembershipValues) => void;
}) {
  const user = useUser();
  const { id } = useParams() as { id: string };
  const [step, setStep] = useState(0);
  const [membershipValues, setMembershipValues] = useState<
    Partial<MembershipValues>
  >({ userId: user?.uid });

  useEffect(() => {
    if (step === 3) {
      onSubmit({
        ...membershipValues,
        appliedAt: new Date(),
        status: APPLY_STATUS.READY,
      } as MembershipValues);
    }
  }, [step, membershipValues, onSubmit]);

  const handleTermsChange = (terms: MembershipValues['terms']) => {
    setMembershipValues((prev) => ({ ...prev, terms }));
    setStep((prev) => prev + 1);
  };
  const handleBasicInfoChange = (infoValues: InfoValues) => {
    setMembershipValues((prev) => ({ ...prev, ...infoValues }));
    setStep((prev) => prev + 1);
  };
  const handleCardInfoChange = (cardInfoValues: CardInfoValues) => {
    setMembershipValues((prev) => ({ ...prev, ...cardInfoValues }));
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
