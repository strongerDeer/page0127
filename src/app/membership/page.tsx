import PrivateRoute from '@components/auth/PrivateRoute';
import TemplateMembership from '@components/templates/TemplateMembership';

export default function page() {
  return (
    <PrivateRoute>
      <TemplateMembership />
    </PrivateRoute>
  );
}
