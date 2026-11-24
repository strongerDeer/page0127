import Link from 'next/link';

import { Button } from '@repo/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
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
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-foreground'>
            책을 찾을 수 없습니다
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            요청하신 책이 존재하지 않거나 삭제되었습니다.
          </p>

          <div className='flex gap-2'>
            <Button asChild className='flex-1'>
              <Link href='/books'>내 서재</Link>
            </Button>
            <Button asChild variant='outline' className='flex-1'>
              <Link href='/books/add'>도서 추가</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
