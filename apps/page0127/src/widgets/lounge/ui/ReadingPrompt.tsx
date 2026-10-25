import Link from 'next/link';

import { BookOpen } from 'lucide-react';

export const ReadingPrompt = () => (
  <div className='mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-accent/40 p-4'>
    <BookOpen className='shrink-0 text-primary' size={24} aria-hidden='true' />
    <div className='min-w-0 flex-1'>
      <h3 className='text-sm font-semibold text-text-strong'>
        다음 한 권, 이미 시작했나요?
      </h3>
      <p className='mt-1 text-xs leading-relaxed text-text-subtle'>
        지금 읽는 책으로 나의 다음 수를 보여주세요.
      </p>
    </div>
    <Link
      href='/books/add?status=reading'
      className='rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground'
    >
      읽는 중 등록
    </Link>
  </div>
);
