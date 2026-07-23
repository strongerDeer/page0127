'use client';

/**
 * 전체 ↔ 연도별 뷰 전환 세그먼티드 탭
 *
 * 디자인 의도:
 * - '전체'(누적)를 연도들과 구분선으로 나눠 "누적 vs 특정 해" 위계를 탭 바에 새긴다.
 * - 활성 탭은 primary 배경으로 강조 → 지금 어느 뷰를 보는지 한눈에.
 * - 셀렉트박스 + 차트 내 '월별/연도별' 탭 두 개를 이 하나로 대체한다.
 */
type ViewTabsProps = {
  /** 기록이 있는 연도 목록 (내림차순) */
  years: number[];
  /** 현재 선택된 연도 (연도 뷰일 때만 의미) */
  selectedYear: number;
  /** 전체(누적) 뷰인지 */
  isAllView: boolean;
  /** 탭 클릭 — 'all' | 연도 문자열 | 'wishlist' */
  onChange: (value: string) => void;
  /** '읽고 싶어요' 탭 노출 여부 (내 서재에서만 true) */
  showWishlist?: boolean;
  /** 지금 위시리스트 뷰를 보고 있는지 — true면 연도·전체 탭은 비활성 */
  isWishlistView?: boolean;
};

export const ViewTabs = ({
  years,
  selectedYear,
  isAllView,
  onChange,
  showWishlist = false,
  isWishlistView = false,
}: ViewTabsProps) => {
  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-white'
        : 'text-text-subtle hover:text-text-strong'
    }`;

  return (
    <div
      role='tablist'
      aria-label='통계 기간'
      className='flex flex-wrap items-center gap-1 rounded-full bg-sunken p-1'
    >
      {/* 전체(누적) — 연도들과 구분선으로 분리
          위시리스트 뷰일 땐 전체·연도 탭이 모두 비활성이라 !isWishlistView를 곱한다 */}
      <button
        type='button'
        role='tab'
        aria-selected={isAllView && !isWishlistView}
        onClick={() => onChange('all')}
        className={tabClass(isAllView && !isWishlistView)}
      >
        전체
      </button>

      <span className='mx-1 h-4 w-px bg-line-soft' aria-hidden />

      {years.map((year) => {
        const active = !isAllView && !isWishlistView && year === selectedYear;
        return (
          <button
            key={year}
            type='button'
            role='tab'
            aria-selected={active}
            onClick={() => onChange(year.toString())}
            className={tabClass(active)}
          >
            {year}
          </button>
        );
      })}

      {/* 읽고 싶어요(위시리스트) — 서재(완독·읽는 중)와 성격이 달라 구분선 뒤로 뺀다 */}
      {showWishlist && (
        <>
          <span className='mx-1 h-4 w-px bg-line-soft' aria-hidden />
          <button
            type='button'
            role='tab'
            aria-selected={isWishlistView}
            onClick={() => onChange('wishlist')}
            className={tabClass(isWishlistView)}
          >
            읽고 싶어요
          </button>
        </>
      )}
    </div>
  );
};
