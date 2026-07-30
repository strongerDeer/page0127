import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';

import { NotificationPage } from '@/features/notification/ui/NotificationPage';

/**
 * 알림 전체 목록 페이지
 * 경로: /notifications
 *
 * 학습 포인트:
 * - 모든 알림 표시 (드롭다운보다 더 많이)
 * - 페이지네이션
 * - 읽음/읽지 않음 필터
 */
export default function Notifications() {
  return (
    <PageContainer width='narrow' className='space-y-6'>
      <PageHeader title='알림' />

      <NotificationPage />
    </PageContainer>
  );
}
