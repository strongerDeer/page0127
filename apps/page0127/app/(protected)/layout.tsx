import { AppShell } from '@/widgets/AppShell';

/**
 * 보호된 페이지 레이아웃 (로그인 필수)
 *
 * 학습 포인트:
 * - 인증 체크와 네비게이션을 AppShell(Server Component)에 위임
 * - 레이아웃은 셸로 children을 감싸기만 한다
 */
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return <AppShell>{children}</AppShell>;
};

export default ProtectedLayout;
