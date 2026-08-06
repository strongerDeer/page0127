/**
 * 온보딩 레이아웃
 *
 * 보호 라우트와 달리 **AppShell(헤더·네비게이션)을 씌우지 않는다.**
 * 아직 아이디도 정하지 않은 사람에게 앱을 돌아다닐 메뉴를 주면,
 * 온보딩을 마쳐야 한다는 사실이 흐려지고 실제로 빠져나갈 수도 있다.
 *
 * 로그인 여부와 온보딩 완료 여부는 페이지가 직접 본다 — 화면이 하나뿐이라
 * 레이아웃에 두면 오히려 흐름이 흩어진다.
 */
const OnboardingLayout = ({ children }: { children: React.ReactNode }) => (
  <div className='min-h-screen bg-background'>{children}</div>
);

export default OnboardingLayout;
