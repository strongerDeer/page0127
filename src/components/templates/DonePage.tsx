'use client';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';

import { useRouter, useSearchParams } from 'next/navigation';

export default function DonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  return (
    <div>
      {success === 'true'
        ? '카드가 발급되었습니다'
        : '카드발급에 실패하였습니다.'}

      <ButtonFixedBottom text="확인" onClick={() => router.back()} />
    </div>
  );
}
