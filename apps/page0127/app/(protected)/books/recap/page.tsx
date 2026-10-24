import Link from 'next/link';

import { PageContainer } from '@repo/ui';
import { ChevronLeft } from 'lucide-react';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { toKstDateKey } from '@/shared/lib/date';

import {
  buildRecapArchive,
  getRecapBooks,
  RECAP_ARCHIVE_WEEKS,
} from '@/entities/recap';

import { RecapArchive } from '@/widgets/recap/ui/RecapArchive';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '지난 회상 | page0127.',
  robots: { index: false },
};

/**
 * 지난 회상 — 홈 회상 카드의 "지난 회상 보기"로 들어온다.
 *
 * 왜 /books 아래인가: 최상위(/recap)는 /{username} 과 겹쳐 'recap' 이라는 아이디를 쓰는
 * 사람의 서재를 가린다. /books 는 이미 로그인 전용이고(protectedRoutes), 정적 세그먼트라
 * /books/[id] 보다 먼저 잡힌다.
 *
 * 내 비공개 책도 들어간다 — 남에게 보이는 화면이 아니다(getRecapBooks 참고).
 */
const RecapArchivePage = async () => {
  // (protected)/layout.tsx 와 미들웨어가 로그인을 보장한다
  const user = await getCurrentUser();
  const now = new Date();

  const weeks = buildRecapArchive(await getRecapBooks(user!.id), now);

  return (
    <PageContainer width='narrow' className='space-y-6'>
      <div>
        <Link
          href='/'
          className='inline-flex items-center gap-0.5 text-sm text-text-subtle hover:text-text-strong'
        >
          <ChevronLeft className='size-4' aria-hidden />
          홈으로
        </Link>
        <h1 className='mt-2 text-2xl font-bold text-text-strong'>지난 회상</h1>
        <p className='mt-2 text-sm text-text-subtle'>
          최근 {RECAP_ARCHIVE_WEEKS}주 동안 끝내고 담은 책을 주마다 모았어요
        </p>
      </div>

      <RecapArchive
        weeks={weeks}
        currentYear={Number(toKstDateKey(now).slice(0, 4))}
      />
    </PageContainer>
  );
};

export default RecapArchivePage;
