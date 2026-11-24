'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { useUnreadCount } from '@/entities/notification';

import { isNavItemActive, navItems, resolveNavHref } from '../model/navItems';

type BottomTabBarProps = {
  /** 로그인 사용자 id — 읽지 않은 알림 수(배지)를 읽는다 */
  userId: string;
  /** 로그인 사용자의 username — '내 서재' 링크 계산에 쓴다 */
  username: string | null;
};

export const BottomTabBar = ({ userId, username }: BottomTabBarProps) => {
  const pathname = usePathname();
  // 모바일 머리글의 알림 종을 빼고 이 탭이 알림 입구가 됐다(2026-11-24 HJ, A안) → 배지를 여기 단다.
  // 머리글 종(NotificationDropdown)과 같은 쿼리 키라 요청은 한 번이고, 실시간 갱신도 함께 받는다.
  const { data: unread } = useUnreadCount(userId);
  const unreadCount = unread?.count ?? 0;

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
        const badge = item.href === '/notifications' ? unreadCount : 0;
        return (
          <IntentPrefetchLink
            key={item.label}
            href={href}
            aria-current={active ? 'page' : undefined}
            // 배지 숫자는 눈으로만 보인다 — 읽지 않은 수를 이름에 넣는다(머리글 종과 같은 규칙)
            aria-label={
              badge > 0 ? `${item.label}, 읽지 않음 ${badge}건` : undefined
            }
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className='relative'>
              <Icon aria-hidden='true' className='size-5' />
              {badge > 0 && (
                <span
                  aria-hidden='true'
                  data-tab-badge=''
                  className='absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white'
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            {item.label}
          </IntentPrefetchLink>
        );
      })}
    </nav>
  );
};
