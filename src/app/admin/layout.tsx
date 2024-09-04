import AdminRoute from '@components/auth/AdminRoute';

export default function layout({ children }: { children: React.ReactNode }) {
  return <AdminRoute>{children}</AdminRoute>;
}
