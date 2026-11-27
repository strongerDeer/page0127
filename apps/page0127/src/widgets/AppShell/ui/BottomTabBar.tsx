'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { NewsDot, useUnseenNews } from '@/widgets/news-notice';

import { isNavItemActive, navItems, resolveNavHref } from '../model/navItems';

/**
 * 폰 하단 탭 — PC 상단 글자 메뉴(GnbNav)와 같은 네 칸(2026-11-26 HJ).
 * 알림은 머리글 종으로 옮겨 이 탭엔 배지가 없다.
 */
type BottomTabBarProps = {
  /** 로그인 사용자의 username — '내 서재' 링크 계산에 쓴다 */
  username: string | null;
};

export const BottomTabBar = ({ username }: BottomTabBarProps) => {
  const pathname = usePathname();
  // 안 본 책 이야기 새 글이 있으면 그 탭 아이콘 오른쪽 위에 빨간 점(2026-11-27 HJ A안)
  const { stories: unseenStories } = useUnseenNews();
  // '내 서재' 탭은 username이 아직 없는 드문 과도 상태에서는 아예 감춘다
  // (링크가 '/'로 잘못 뜨는 것보다 안 보이는 게 낫다)
  const items = navItems.filter(
    (item) => item.primary && !(item.isMyLibrary && !username)
  );

  return (
    <nav
      aria-label='하단 탭 메뉴'
      // 화면 아래를 가리는 고정 막대 — 홈의 책(HomeBook)이 이만큼 쪽 아래를 띄운다
      data-bottom-bar=''
      className='fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden'
    >
      {items.map((item) => {
        const href = resolveNavHref(item, username);
        const active = isNavItemActive(pathname, item, username);
        const Icon = item.icon;
        return (
          <IntentPrefetchLink
            key={item.label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className='relative'>
              <Icon aria-hidden='true' className='size-5' />
              {item.href === '/blog' && unseenStories > 0 && (
                <NewsDot label='새 글' className='-right-1 -top-0.5' />
              )}
            </span>
            {item.label}
          </IntentPrefetchLink>
        );
      })}
    </nav>
  );
};
