'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';

import { coachTarget } from '@/features/onboarding';

/**
 * 전체 ↔ 연도별 뷰 전환 세그먼티드 탭
 *
 * 디자인 의도:
 * - '전체'(누적)를 연도들과 구분선으로 나눠 "누적 vs 특정 해" 위계를 탭 바에 새긴다.
 * - 활성 탭은 primary 배경으로 강조 → 지금 어느 뷰를 보는지 한눈에.
 * - 셀렉트박스 + 차트 내 '월별/연도별' 탭 두 개를 이 하나로 대체한다.
 * - 연도는 모바일에서 늘 셀렉트로 접는다. 390px 에서 탭이 넷을 넘으면 한 해만
 *   아랫줄로 떨어졌다(2026-10-24 운영 점검). 데스크탑도 연도가
 *   MAX_YEAR_TABS 를 넘으면 셀렉트로 접는다 — 기록이 쌓일수록 탭 바가 길어지므로.
 */
const MAX_YEAR_TABS = 5;

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
  /** 이 연도 탭에 목표 설정 코치 팁을 붙인다 (내 서재에서만 넘긴다) */
  goalYear?: number;
};

export const ViewTabs = ({
  years,
  selectedYear,
  isAllView,
  onChange,
  showWishlist = false,
  isWishlistView = false,
  goalYear,
}: ViewTabsProps) => {
  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-white'
        : 'text-text-subtle hover:text-text-strong'
    }`;
  const yearActive = !isAllView && !isWishlistView;
  const collapseAlways = years.length > MAX_YEAR_TABS;

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

      {/* 연도 — 모바일(또는 연도가 많을 때)은 셀렉트, 그 밖엔 탭.
          둘 다 그려 두고 CSS 로 하나만 보인다. 코치 팁은 보이는 쪽을 찾아 붙는다. */}
      {years.length > 0 && (
        <Select
          value={yearActive ? selectedYear.toString() : ''}
          onValueChange={onChange}
        >
          <SelectTrigger
            size='sm'
            aria-label='연도 선택'
            className={`rounded-full border-0 px-4 font-medium shadow-none ${
              collapseAlways ? '' : 'sm:hidden'
            } ${
              yearActive
                ? 'bg-primary text-white [&_svg]:!text-white'
                : 'text-text-subtle hover:text-text-strong'
            }`}
            {...(goalYear !== undefined && years.includes(goalYear)
              ? coachTarget('set-goal')
              : {})}
          >
            <SelectValue placeholder='연도별' />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!collapseAlways &&
        years.map((year) => {
          const active = yearActive && year === selectedYear;
          return (
            <button
              key={year}
              type='button'
              role='tab'
              aria-selected={active}
              onClick={() => onChange(year.toString())}
              className={`hidden sm:inline-flex ${tabClass(active)}`}
              {...(year === goalYear ? coachTarget('set-goal') : {})}
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
