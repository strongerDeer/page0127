import PrivateRoute from '@components/auth/PrivateRoute';

export default function layout({ children }: { children: React.ReactNode }) {
  return <PrivateRoute>{children}</PrivateRoute>;
}
