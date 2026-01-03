'use client';

/**
 * HeaderClient 컴포넌트
 * 헤더의 클라이언트 컴포넌트 부분 (알림)
 *
 * 학습 포인트:
 * - Server Component와 Client Component 분리
 * - 알림은 실시간 업데이트가 필요하므로 Client Component
 */

import { NotificationDropdown } from '@/features/notification';

type HeaderClientProps = {
  userId: string;
}

export const HeaderClient = ({ userId }: HeaderClientProps) => {
  return <NotificationDropdown userId={userId} />;
}
