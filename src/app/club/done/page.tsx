import DonePage from '@components/templates/DonePage';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DonePage />
    </Suspense>
  );
}
