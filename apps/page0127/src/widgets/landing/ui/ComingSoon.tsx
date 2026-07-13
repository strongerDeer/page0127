import Link from 'next/link';

import { Hammer } from 'lucide-react';

import { Button } from '@/shared/ui/button';

// "준비 중" 안내 화면
// - 아직 콘텐츠가 없는 정적 페이지 공용
//
// ⚠️ 이 컴포넌트를 쓰는 페이지가 남아 있다는 건 "미완성 데모"라는 자백이다.
//    개인정보처리방침·이용약관은 법적 의무이기도 하다. 실제 내용으로 채워 나갈 것.
type ComingSoonProps = {
  title: string;
  description?: string;
};

export const ComingSoon = ({ title, description }: ComingSoonProps) => {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center px-4 text-center'>
      <Hammer className='mb-4 h-8 w-8 text-text-faint' />
      <h1 className='heading-1 mb-3 text-text-strong'>{title}</h1>
      <p className='mb-8 max-w-md text-text-body'>
        {description ?? '아직 준비 중인 페이지예요. 조금만 기다려 주세요.'}
      </p>
      <Link href='/'>
        <Button variant='outline'>홈으로 돌아가기</Button>
      </Link>
    </main>
  );
};
