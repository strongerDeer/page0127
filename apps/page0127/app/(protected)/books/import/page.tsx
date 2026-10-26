import Link from 'next/link';

import { PageContainer } from '@repo/ui';

import { BookImportFlow } from '@/features/book-import/ui/BookImportFlow';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: '여러 권 한 번에 담기 | page0127.' };

/**
 * 표·CSV 일괄 등록 페이지
 *
 * 다른 앱·엑셀에 쌓아 둔 독서 기록을 옮겨 오는 입구다. 한 권씩 찾는 도서 추가와
 * 따로 둔다 — 흐름(붙여넣기 → 확인 → 한 번에 담기)이 전혀 다르다.
 */
const BookImportPage = () => (
  <PageContainer width='content'>
    <div className='mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
      <h1 className='heading-1'>여러 권 한 번에 담기</h1>
      <Link
        href='/books/add'
        className='text-sm text-text-subtle underline underline-offset-4'
      >
        한 권씩 찾기
      </Link>
    </div>
    <BookImportFlow />
  </PageContainer>
);

export default BookImportPage;
