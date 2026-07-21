'use client';

import { useRouter } from 'next/navigation';

import { PageContainer } from '@/shared/ui/PageContainer';

import { LibraryView } from '@/widgets/library/LibraryView';

import { PublicLibraryHeader } from './PublicLibraryHeader';

import type { Book } from '@/entities/book';
import type { BookStats, OverallStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type PublicLibraryContentProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  books: Book[];
  stats: BookStats;
  overallStats: OverallStats;
  availableYears: number[];
  selectedYear: number;
  isAllView: boolean;
  currentYear: number;
  /** 최신 취향 분석의 성향 타입 이름 — 분석 이력이 없으면 null */
  personalityType: string | null;
  /** 취향 분석 가능한 책 권수 (별점 있는 완독 책) — 소유자 전용, 방문자는 0 */
  analyzableBookCount: number;
  /** 마지막 분석 이후 새로 추가된 분석 가능 책 권수 — 분석 이력이 없으면 null */
  newBooksSinceLastAnalysis: number | null;
  /** 취향 분석 이력 (최신순 최대 10건) — 소유자 전용, 방문자는 빈 배열 */
  analysisHistory: TasteAnalysisSummary[];
  /** 이달의 독서 캘린더 슬롯 — 소유자만 전달, 방문자는 undefined */
  calendarSlot?: React.ReactNode;
};

/**
 * 공개 서재 컨텐츠 (Client Component)
 *
 * 통계 본문은 내 서재(대시보드)와 동일한 LibraryView를 공유한다.
 * 여기서는 공개 서재 고유의 프로필 헤더와 라우팅만 담당한다.
 * - 목표 설정 불가 (onSetGoal 미전달 → 읽기 전용)
 * - 캘린더 없음 (calendarSlot 미전달)
 */
export const PublicLibraryContent = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  books,
  stats,
  overallStats,
  availableYears,
  selectedYear,
  isAllView,
  currentYear,
  personalityType,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  calendarSlot,
}: PublicLibraryContentProps) => {
  const router = useRouter();

  // 독서 목표는 표시만 — 올해 목표가 있을 때만 진행률에 노출한다
  const readingGoal = profile.reading_goal;
  const goalTarget =
    readingGoal?.year === selectedYear ? readingGoal.target : 0;

  // 탭 전환 — 공개 서재 라우트로 이동 ('all' 또는 연도)
  const handleViewChange = (value: string) => {
    router.push(`/${username}?year=${value}`);
  };

  return (
    // 공개 서재는 '전시장' — 배경을 한 단 눌러(sunken) 흰 카드가 뜨게 한다.
    // 내 서재(작업대)의 순백 배경과 구분되는 시각 신호.
    <PageContainer width='wide' bg='sunken' className='space-y-10'>
      <PublicLibraryHeader
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
        personalityType={personalityType}
      />

      <LibraryView
        overallStats={overallStats}
        stats={stats}
        books={books}
        availableYears={availableYears}
        selectedYear={selectedYear}
        isAllView={isAllView}
        currentYear={currentYear}
        goalTarget={goalTarget}
        onViewChange={handleViewChange}
        allShelfTitle={`${profile.nickname || username}님의 서재 전체`}
        username={username}
      />
    </PageContainer>
  );
};
