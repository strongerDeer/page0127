import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { CHEER_YEAR } from '@/entities/year-cheer';

type CheerEntryCardProps = {
  username: string;
  /** 이미 열었는지 — 문구만 바뀐다 */
  opened: boolean;
};

/**
 * 서재 위 연말 응원 카드 입구 — 12월 한 달, 주인에게만(페이지가 기간·주인을 가른다).
 *
 * 새 소식 카드와 같은 자리(연도 탭 아래)에 같은 결로 둔다. 큰 민트·빨강 면은 쓰지 않는다 —
 * 선물 느낌은 작은 리본 점 하나로만 낸다.
 */
export const CheerEntryCard = ({ username, opened }: CheerEntryCardProps) => (
  <Link
    href={`/${username}/cheer`}
    className='group flex items-center gap-3 rounded-2xl border border-line bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10'
  >
    <span
      aria-hidden='true'
      className='flex size-9 flex-none items-center justify-center rounded-xl bg-white shadow-sm'
    >
      {/* 작은 리본 상자 */}
      <svg viewBox='0 0 24 24' className='size-5'>
        <rect x='3' y='9' width='18' height='12' rx='2' fill='#1e69cb' />
        <rect x='10.5' y='9' width='3' height='12' fill='#d64554' />
        <rect x='2' y='6' width='20' height='4' rx='1.5' fill='#d64554' />
        <path
          d='M12 6C9.5 2.5 6 3.5 7 5.5S12 6 12 6Zm0 0c2.5-3.5 6-2.5 5-.5S12 6 12 6Z'
          fill='#d64554'
        />
      </svg>
    </span>
    <span className='min-w-0 flex-1'>
      <span className='block text-xs text-text-subtle'>
        {CHEER_YEAR} 연말 선물
      </span>
      <span className='block break-keep text-base font-bold text-text-strong'>
        {opened ? '올해의 응원 문장 다시 보기' : '응원 선물이 도착했어요'}
      </span>
    </span>
    <ChevronRight
      aria-hidden='true'
      className='size-4 flex-none text-text-subtle transition-transform group-hover:translate-x-0.5'
    />
  </Link>
);
