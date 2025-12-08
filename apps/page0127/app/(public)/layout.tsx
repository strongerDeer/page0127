import { Header } from '@/widgets/Header';

/**
 * 공개 페이지 레이아웃 (모두 접근 가능)
 *
 * 학습 포인트:
 * - 별도의 접근 제어 없음
 * - 공통 헤더 포함
 * - 로그인 전 사용자가 보는 레이아웃
 */
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Header />
      {children}
    </>
  );
};

export default PublicLayout;
