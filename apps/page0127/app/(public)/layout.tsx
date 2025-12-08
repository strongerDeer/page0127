/**
 * 공개 페이지 레이아웃 (모두 접근 가능)
 *
 * 학습 포인트:
 * - 별도의 접근 제어 없음
 * - 명시적으로 공개 페이지임을 표시
 * - 향후 공개 페이지 전용 레이아웃 추가 가능 (헤더, 푸터 등)
 */
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PublicLayout;
