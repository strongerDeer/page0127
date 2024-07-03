import PrivateRoute from '@components/auth/PrivateRoute';
import TemplateApplyClub from '@components/templates/TemplateApplyClub';

export default function page({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <PrivateRoute>
      <TemplateApplyClub id={id} />
    </PrivateRoute>
  );
}
