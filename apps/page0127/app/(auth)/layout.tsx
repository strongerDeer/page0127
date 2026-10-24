/**
 * 로그인 페이지의 공통 레이아웃.
 * 목적지와 선택 전달값을 함께 판단해야 하므로 인증 게이트는 페이지가 맡는다.
 */
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  // 인증 판정은 searchParams를 읽을 수 있는 login/page.tsx에서 한다.
  // 여기서 먼저 보내면 이미 로그인된 외부 브라우저에서 선택 복원이 실행되지 않는다.
  return <>{children}</>;
};

export default AuthLayout;
