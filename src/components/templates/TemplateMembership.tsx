'use client';
import BasicInfo from '@components/membership/BasicInfo';
import CardInfo from '@components/membership/CardInfo';
import Terms from '@components/membership/Terms';
import { useState } from 'react';

export default function TemplateMembership() {
  const [step, setStep] = useState(1);

  const handleTermsChange = (terms: string[]) => {};
  return (
    <div>
      {step === 0 ? <Terms onNext={handleTermsChange} /> : null}
      {step === 1 ? <BasicInfo /> : null}
      {step === 2 ? <CardInfo /> : null}
    </div>
  );
}
