import dynamic from 'next/dynamic';
import PrivateRoute from '@components/auth/PrivateRoute';

const TemplateApplyClub = dynamic(
  () => import('@components/templates/TemplateApplyClub'),
  {
    ssr: false,
  },
);

export default function page({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <PrivateRoute>
      <TemplateApplyClub id={id} />
    </PrivateRoute>
  );
}
