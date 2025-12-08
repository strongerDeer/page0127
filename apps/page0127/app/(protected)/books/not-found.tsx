import Link from 'next/link';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

/**
 * 책 관련 404 페이지
 *
 * 학습 포인트:
 * - 특정 라우트 세그먼트의 404 처리
 * - 상위 not-found.tsx보다 우선 적용됨
 *
 * 위치: app/books/not-found.tsx
 * 범위: /books 경로의 404 에러만
 */
export default function BookNotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-gray-900'>
            책을 찾을 수 없습니다
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-gray-600'>
            요청하신 책이 존재하지 않거나 삭제되었습니다.
          </p>

          <div className='flex gap-2'>
            <Link href='/books' className='flex-1'>
              <Button className='w-full'>내 서재</Button>
            </Link>
            <Link href='/books/add' className='flex-1'>
              <Button variant='outline' className='w-full'>
                도서 추가
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
