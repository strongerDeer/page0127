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
    <div className='mx-auto max-w-3xl space-y-6 p-6'>
      <div>
        <h1 className='text-2xl font-bold'>알림</h1>
        <p className='mt-2 text-gray-600'>모든 알림을 확인하세요</p>
      </div>

      <NotificationPage />
    </div>
  );
}
