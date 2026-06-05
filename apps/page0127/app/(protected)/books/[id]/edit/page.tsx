'use client';

import { use, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { PageContainer } from '@/shared/ui/PageContainer';
import { Skeleton } from '@/shared/ui/skeleton';

import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import {
  type BookFormData,
  BookRegistrationForm,
} from '@/features/book/ui/BookRegistrationForm';

import type { AladinBook, Book } from '@/entities/book';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 도서 수정 페이지
 *
 * 학습 포인트:
 * - BookRegistrationForm 재사용
 * - 기존 데이터 불러오기
 * - PATCH API 호출
 * - 수정 후 상세 페이지로 리다이렉트
 */
const BookEditPage = ({ params }: PageProps) => {
  const { id } = use(params);
  const router = useRouter();
  const { getBookById, updateBook, isLoading } = useBookCRUD();
  const [book, setBook] = useState<Book | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 책 데이터 불러오기
  useEffect(() => {
    // AbortController: 컴포넌트 언마운트 시 진행 중인 fetch를 취소
    const controller = new AbortController();

    const loadBook = async () => {
      const data = await getBookById(id);
      // abort된 경우 setBook 호출하지 않음 (언마운트된 컴포넌트에 상태 변경 방지)
      if (!controller.signal.aborted) {
        setBook(data);
      }
    };

    loadBook();

    return () => controller.abort();
  }, [id, getBookById]);

  const handleSubmit = async (formData: BookFormData) => {
    setIsUpdating(true);

    const result = await updateBook(id, formData);

    if (result) {
      toast.success('도서 정보가 수정되었습니다!');
      router.push('/books'); // 도서 목록으로 이동
    } else {
      toast.error('도서 수정에 실패했습니다.');
    }

    setIsUpdating(false);
  };

  const handleCancel = () => {
    router.back();
  };

  // 로딩 중
  if (isLoading || !book) {
    return (
      <ErrorBoundary>
        <PageContainer width='content'>
          <Card>
            <CardHeader>
              <Skeleton className='h-8 w-32' />
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* 책 정보 미리보기 */}
              <div className='flex gap-4 rounded-lg bg-muted/50 p-4'>
                <Skeleton className='h-32 w-24 shrink-0' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-6 w-3/4' />
                  <Skeleton className='h-4 w-1/2' />
                  <Skeleton className='h-4 w-1/3' />
                </div>
              </div>

              {/* 폼 필드들 */}
              <div className='space-y-4'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>

              {/* 버튼 */}
              <div className='flex gap-3'>
                <Skeleton className='h-10 flex-1' />
                <Skeleton className='h-10 flex-1' />
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </ErrorBoundary>
    );
  }

  // Book 타입을 AladinBook 형식으로 변환
  const aladinBookFormat: AladinBook = {
    isbn13: book.isbn,
    title: book.title,
    author: book.author || '',
    publisher: book.publisher || '',
    cover: book.cover_image || '',
    description: book.description || '',
    pubDate: book.pub_date || '',
    categoryName: book.category || '',
    priceStandard: 0, // 수정 시에는 가격 정보 불필요
    link: '', // 수정 시에는 링크 정보 불필요
  };

  return (
    <ErrorBoundary>
      <PageContainer width='content'>
        <BookRegistrationForm
          book={aladinBookFormat}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isUpdating}
          initialData={{
            status: book.status,
            completed_date: book.completed_date || undefined,
            start_date: book.start_date || undefined,
            rating: book.rating || undefined,
            one_line_review: book.one_line_review || undefined,
            personal_memo: book.personal_memo || undefined,
            tags: book.tags || undefined,
            is_public: book.is_public,
          }}
        />
      </PageContainer>
    </ErrorBoundary>
  );
};

export default BookEditPage;
