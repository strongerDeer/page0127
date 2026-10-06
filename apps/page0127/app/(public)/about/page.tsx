import {
  AboutHero,
  FinalCta,
  Highlights,
  Manifesto,
  StatsRow,
  StepsShowcase,
  UpdatesTimeline,
} from '@/widgets/about';
import { getAboutStats } from '@/widgets/about/api/getAboutStats';
import { getRecentBooks } from '@/widgets/about/api/getRecentBooks';
import { getWeeklyTop } from '@/widgets/about/api/getWeeklyTop';
import { shouldShowStats } from '@/widgets/about/model/aboutStats';
import { TasteExampleCard } from '@/widgets/landing/ui/TasteExampleCard';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '소개 | page0127.',
  description:
    '읽은 책을 꽂아 두면 책장이 쌓이고, 그 책장이 독서 취향을 말해 줍니다. 기록 → 목표 → 취향 분석, 세 걸음으로 시작하세요.',
};

// 표지·랭킹·통계는 한 시간에 한 번만 새로 만든다 — 매 요청 조회할 내용이 아니다
export const revalidate = 3600;

/**
 * 소개 페이지 — 가입 전 설득(위) → 이용 방법(가운데) → 가입 버튼(끝).
 * 설계: docs/superpowers/specs/2026-10-04-about-page-renewal-design.md
 */
const AboutPage = async () => {
  const [books, top, stats] = await Promise.all([
    getRecentBooks(),
    getWeeklyTop(),
    getAboutStats(),
  ]);

  return (
    // break-keep: 한국어를 단어 단위로 줄바꿈한다 — 없으면 '쌓/인'처럼 단어 중간에서 끊긴다
    <div className='break-keep'>
      <AboutHero books={books} />
      <Manifesto />
      <StepsShowcase books={books} tasteSlot={<TasteExampleCard />} />
      <Highlights books={books} top={top} />
      {stats && shouldShowStats(stats) && <StatsRow stats={stats} />}
      <UpdatesTimeline />
      {/* 표지가 있는 책 중에서 고른다 — 그냥 마지막 4권이면 표지 없는 칸만 설 수 있다 */}
      <FinalCta
        covers={books
          .map((b) => b.coverImage)
          .filter(Boolean)
          .slice(-4)}
      />
    </div>
  );
};

export default AboutPage;
