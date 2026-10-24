import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { badgePresentation } from '../model/badgePresentation';
import { BadgeMedal } from './BadgeMedal';

import type { Badge } from '../model/badges';

type NewBadgesResponse = { username: string | null; badges: Badge[] };

/**
 * 완독을 저장한 직후 새로 받은 뱃지가 있으면 축하 토스트를 띄운다.
 *
 * 저장 흐름을 막지 않도록 기다리지 않고 부른다. 실패해도 조용히 넘어간다 —
 * 뱃지는 서재에서 언제든 다시 볼 수 있으니 축하를 놓치는 것보다 저장이 중요하다.
 */
export const notifyNewBadges = async (
  bookId: string,
  navigate: (href: string) => void
) => {
  try {
    const { data } = await apiClient.get<NewBadgesResponse>(
      API_ENDPOINTS.books.newBadges(bookId)
    );
    const [first, ...rest] = data.badges;
    if (!first) return;

    const names = data.badges.map((badge) => badgePresentation(badge).title);
    toast.success(
      rest.length
        ? `새 배지 ${data.badges.length}권을 받았어요`
        : '새 배지를 받았어요',
      {
        description: names.join(' · '),
        icon: <BadgeMedal badge={first} size={22} />,
        duration: 6000,
        action: data.username
          ? {
              label: '보기',
              onClick: () => navigate(`/${data.username}/badges`),
            }
          : undefined,
      }
    );
  } catch (error) {
    console.warn('새 배지 확인 실패:', error);
  }
};
