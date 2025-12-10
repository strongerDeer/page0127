import { redirect } from 'next/navigation';

/**
 * 도서 목록 페이지 → 대시보드로 리다이렉트
 *
 * 학습 포인트:
 * - Next.js redirect() 함수 사용
 * - 대시보드가 도서 목록 기능을 통합함
 * - URL 쿼리 파라미터는 대시보드에서 처리
 */
const BooksPage = () => {
  redirect('/dashboard');
};

export default BooksPage;
