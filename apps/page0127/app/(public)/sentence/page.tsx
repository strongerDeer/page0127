import { DailySentenceDraw } from '@/features/daily-sentence';
import { getTodaySentenceState } from '@/features/daily-sentence/api/getTodaySentenceState';

import type { Metadata } from 'next';

/**
 * /sentence — 오늘의 문장 뽑기 전체 페이지 (HJ, 2026-11-24)
 *
 * 주소로 바로 오거나(검색·공유 링크) 모달에서 새로고침하면 이 페이지가 뜬다.
 * 홈·서재에서 링크를 누르면 @modal/(.)sentence 가 가로채 같은 내용을 모달로 띄운다.
 * 비회원도 뽑는다. 페이지는 색인하되 문장 본문은 HTML 에 넣지 않는다(펼친 뒤 브라우저가 받아 온다) —
 * 권리자 요청이 오면 문장을 끄기 쉽게, 검색 결과에 문장이 쌓이지 않게.
 */
export const metadata: Metadata = {
  title: '오늘의 문장 뽑기',
  description:
    '하루에 한 번, 베스트셀러·스테디셀러 속 한 문장과 오늘의 독서운을 펼쳐 보세요. 로그인하지 않아도 뽑을 수 있어요.',
  alternates: { canonical: '/sentence' },
};

const SentencePage = async () => {
  const state = await getTodaySentenceState();

  return (
    <div className='mx-auto w-full max-w-md px-4 py-10 sm:py-14'>
      <div className='rounded-2xl border border-line-soft bg-card p-6 pt-8'>
        <DailySentenceDraw {...state} place='page' />
      </div>
    </div>
  );
};

export default SentencePage;
