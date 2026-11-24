import Link from 'next/link';

import { Button } from '@repo/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
/**
 * 404 Not Found 페이지 (Next.js 파일 규칙)
 *
 * 학습 포인트:
 * - Next.js not-found.tsx: 404 에러 전용 페이지
 * - notFound() 함수 호출 시 또는 존재하지 않는 경로 접근 시 렌더링
 * - Server Component로 작성 가능 (use client 불필요)
 *
 * 위치: app/not-found.tsx
 * 범위: 전체 앱의 404 에러
 *
 * 사용 예시:
 * import { notFound } from 'next/navigation';
 * if (!data) notFound();
 */
export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-foreground'>
            404 - 페이지를 찾을 수 없습니다
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            요청하신 페이지를 찾을 수 없습니다.
            <br />
            주소를 다시 확인해주세요.
          </p>

          <div className='flex gap-2'>
            <Button asChild className='flex-1'>
              <Link href='/'>홈으로</Link>
            </Button>
            <Button asChild variant='outline' className='flex-1'>
              <Link href='/books'>내 서재</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
