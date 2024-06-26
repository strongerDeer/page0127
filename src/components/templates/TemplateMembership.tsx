'use client';
import BasicInfo, { InfoValues } from '@components/membership/BasicInfo';
import CardInfo from '@components/membership/CardInfo';
import Terms from '@components/membership/Terms';
import { MembershipValues } from '@models/membership';
import { useState } from 'react';

export default function TemplateMembership() {
  const [step, setStep] = useState(1);

  const handleTermsChange = (terms: MembershipValues['terms']) => {};
  const handleBasicInfoChange = (infoValues: InfoValues) => {};
  return (
    <div>
      {step === 0 ? <Terms onNext={handleTermsChange} /> : null}
      {step === 1 ? <BasicInfo onNext={handleBasicInfoChange} /> : null}
      {step === 2 ? <CardInfo /> : null}
    </div>
  );
}
