import PrivateRoute from '@components/auth/PrivateRoute';
import MyPage from '@components/templates/MyPage';

export default function page() {
  return (
    <PrivateRoute>
      <MyPage />
    </PrivateRoute>
  );
}
