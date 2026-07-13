import { BookDetailSkeleton } from '@/widgets/book/ui/BookDetailSkeleton';

/**
 * /books/info/[id] 라우트 로딩 UI
 *
 * 학습 포인트:
 * - page.tsx의 11개 await (책 + stats + user + isInLibrary)가 끝나기 전 fallback
 * - 동적 라우트에도 loading.tsx가 동일하게 작동
 */
export default function Loading() {
  return <BookDetailSkeleton />;
}
