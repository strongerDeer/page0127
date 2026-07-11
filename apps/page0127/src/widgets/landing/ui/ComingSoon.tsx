import Link from 'next/link';

import { Button } from '@/shared/ui/button';

// "준비 중" 안내 화면
// - About/Privacy/Terms/Contact 등 아직 콘텐츠가 없는 정적 페이지 공용
type ComingSoonProps = {
  title: string;
  description?: string;
};

export const ComingSoon = ({ title, description }: ComingSoonProps) => {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center px-4 text-center'>
      <div className='mb-4 text-5xl'>🚧</div>
      <h1 className='heading-1 mb-3'>{title}</h1>
      <p className='mb-8 max-w-md text-muted-foreground'>
        {description ?? '아직 준비 중인 페이지예요. 조금만 기다려 주세요.'}
      </p>
      <Link href='/'>
        <Button variant='outline'>홈으로 돌아가기</Button>
      </Link>
    </main>
  );
};
