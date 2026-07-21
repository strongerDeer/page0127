import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { DeleteBookButton } from '@/features/book/ui/DeleteBookButton';

import { BookDetailContent } from '@/widgets/book/ui/BookDetailContent';

import type { Book } from '@/entities/book';

/**
 * 도서 상세 페이지 (Server Component)
 *
 * 학습 포인트:
 * - Server Component: async/await로 직접 데이터 페칭
 * - notFound() 함수: 데이터 없을 시 not-found.tsx 렌더링
 * - Dynamic Route: [id] 파라미터로 동적 라우팅
 * - Client Component 분리: 삭제 버튼만 Client Component로
 */
async function getBook(id: string): Promise<Book | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('책 조회 실패:', error);
    return null;
  }

  return data;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const book = await getBook(id);

  // 책이 없으면 not-found.tsx 렌더링
  if (!book) {
    notFound();
  }

  return (
    <PageContainer width='content'>
      {/* 헤더 — 소유자 액션 (목록으로·수정·삭제) */}
      <div className='mb-6 flex items-center justify-between'>
        <Link href='/books'>
          <Button variant='outline'>← 목록으로</Button>
        </Link>
        <div className='flex gap-2'>
          <Link href={`/books/${book.id}/edit`}>
            <Button variant='outline'>수정</Button>
          </Link>
          <DeleteBookButton bookId={book.id} />
        </div>
      </div>

      {/* 표시 본문은 공개 서재 상세와 공유 (isOwner=true → 메모·공개여부 노출) */}
      <BookDetailContent book={book} isOwner />
    </PageContainer>
  );
}
