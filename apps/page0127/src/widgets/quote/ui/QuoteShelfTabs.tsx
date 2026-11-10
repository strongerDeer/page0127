import Link from 'next/link';

import { SegmentedControl, segmentedItemClassName } from '@repo/ui';

export type QuoteShelfTab = 'mine' | 'daily';

type QuoteShelfTabsProps = {
  username: string;
  current: QuoteShelfTab;
  mineCount: number;
  dailyCount: number;
};

/**
 * 보관함 탭 — 링크(?tab=)로 바꾼다.
 *
 * 왜 버튼이 아니라 링크인가: 두 탭 데이터를 서버가 한 번에 읽어 오니 전환에 요청이
 * 더 들지 않고, 주소에 탭이 남아 새로고침·뒤로 가기·공유한 주소가 같은 탭을 연다.
 * 페이지 이동이라 tablist 대신 nav + aria-current 를 쓴다.
 */
export const QuoteShelfTabs = ({
  username,
  current,
  mineCount,
  dailyCount,
}: QuoteShelfTabsProps) => {
  const tabs = [
    {
      value: 'mine',
      label: '내가 모은 문장',
      count: mineCount,
      href: `/${username}/quotes`,
    },
    {
      value: 'daily',
      label: '오늘의 문장',
      count: dailyCount,
      href: `/${username}/quotes?tab=daily`,
    },
  ] as const;

  return (
    <nav aria-label='문장 서랍 보기'>
      <SegmentedControl className='w-fit'>
        {tabs.map((tab) => {
          const active = tab.value === current;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              replace
              scroll={false}
              aria-current={active ? 'page' : undefined}
              data-active={active}
              className={segmentedItemClassName}
            >
              {tab.label}
              <span className='tabular-nums opacity-70'>{tab.count}</span>
            </Link>
          );
        })}
      </SegmentedControl>
    </nav>
  );
};
