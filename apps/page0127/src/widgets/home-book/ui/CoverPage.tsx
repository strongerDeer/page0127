/**
 * 책의 첫 쪽 = 표지(홈 첫 화면 AboutHero)를 감싸는 틀
 *
 * 서버 컴포넌트. HomeBook 이 이 쪽 안의 data-cover-* 부분(책·표지·첫 쪽·버튼)을 스크롤에 맞춰 움직여
 * 표지를 열고 책 속으로 들어간다. 책 모드가 아니면 그냥 감싸기만 한다.
 */
export const CoverPage = ({ children }: { children: React.ReactNode }) => (
  <div id='book-cover' data-book-page='cover'>
    {children}
  </div>
);
