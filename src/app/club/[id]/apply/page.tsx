import PrivateRoute from '@components/auth/PrivateRoute';
import TemplateApplyClub from '@components/templates/TemplateApplyClub';
import { Suspense } from 'react';

export default function page({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <PrivateRoute>
      <Suspense fallback={<></>}>
        <TemplateApplyClub id={id} />
      </Suspense>
    </PrivateRoute>
  );
}
