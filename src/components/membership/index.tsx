'use client';
import BasicInfo, { InfoValues } from '@components/membership/BasicInfo';
import CardInfo, { CardInfoValues } from '@components/membership/CardInfo';
import Terms from '@components/membership/Terms';
import { MembershipValues } from '@models/membership';
import { useState } from 'react';

export default function Membership({
  step,
  onSubmit,
}: {
  step: number;
  onSubmit: () => void;
}) {
  const handleTermsChange = (terms: MembershipValues['terms']) => {};
  const handleBasicInfoChange = (infoValues: InfoValues) => {};
  const handleCardInfoChange = (cardInfoValues: CardInfoValues) => {};
  return (
    <div>
      {step === 0 ? <Terms onNext={handleTermsChange} /> : null}
      {step === 1 ? <BasicInfo onNext={handleBasicInfoChange} /> : null}
      {step === 2 ? <CardInfo onNext={handleCardInfoChange} /> : null}
    </div>
  );
}
