'use client';

import Membership from '@components/membership';
import { useState } from 'react';

export default function TemplateMembership() {
  const [step, setStep] = useState(0);

  const handleSubmit = () => {
    // 카드신청
  };

  return <Membership step={step} onSubmit={handleSubmit} />;
}
