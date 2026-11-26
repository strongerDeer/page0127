import { SentenceBook } from '@/features/daily-sentence';
import { getTodaySentenceState } from '@/features/daily-sentence/api/getTodaySentenceState';

import { StandaloneShell } from '@/widgets/StandaloneShell';

import type { Metadata } from 'next';

/**
 * /sentence — 오늘의 문장 랜딩 (HJ, 2026-11-24 시안 v5)
 *
 * "이 서비스만 써도 되는 형태" — 그래서 사이트 GNB·탭바 대신 전용 머리글(앱 아이콘 + page0127. | 오늘의 문장)만 둔다 — 머리글·☰ 목차·푸터는 StandaloneShell(11/26).
 * 라우트 그룹 (sentence) 로 (public) 셸 밖에 둔 이유가 그것이다.
 * 홈 당근(<a>)은 이 페이지로 오고, 서재 배너(Link)는 @modal/(.)sentence 가 가로채 같은 SentenceBook 을 모달로 띄운다.
 *
 * 비회원도 뽑는다. 페이지는 색인하되 문장 본문은 HTML 에 넣지 않는다(펼친 뒤 브라우저가 받아 온다) —
 * 권리자 요청이 오면 문장을 끄기 쉽게, 검색 결과에 문장이 쌓이지 않게.
 */
export const metadata: Metadata = {
  title: '오늘의 문장 뽑기',
  description:
    '하루에 한 번, 책 사이 당근을 뽑으면 베스트셀러·스테디셀러 속 한 문장과 오늘의 독서운이 나와요. 로그인하지 않아도 뽑을 수 있어요.',
  alternates: { canonical: '/sentence' },
};

const SentencePage = async () => {
  const state = await getTodaySentenceState();

  return (
    <StandaloneShell
      title='오늘의 문장'
      loginHref='/login?next=/sentence'
      bodyClassName='bg-[#d6e3f6] dark:bg-[#0d1526]'
    >
      <main>
        <h1 className='sr-only'>오늘의 문장 뽑기</h1>
        <SentenceBook {...state} variant='page' />
      </main>
    </StandaloneShell>
  );
};

export default SentencePage;
