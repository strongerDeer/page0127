import { createAdminClient } from '@/shared/config/supabase/admin';
import { toKstDateKey } from '@/shared/lib/date';

import { type ReminderCandidate, selectDueReminders } from '@/entities/book';

import { cronAuthResult } from '../../_helpers/cron-auth';
import { sendPushForNotifications } from '../../_helpers/push';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/cron/reading-reminders
 * 2주 넘게 '읽는 중'인 책마다 주인에게 알림을 한 번 보낸다. (매일 KST 09:00)
 *
 * 흐름:
 *   1. 읽는 중인 책 전부를 service_role 로 읽는다 (다른 사용자 책이라 RLS 를 넘어야 한다)
 *   2. selectDueReminders 로 오늘 알릴 책만 고른다 (기준·중복 판단은 순수 함수에)
 *   3. 알림을 넣고, 넣은 책에 reading_reminded_at 을 적어 다음 날 다시 고르지 않게 한다
 *
 * 알림 삽입이 성공한 뒤에만 reminded_at 을 적는다 — 반대 순서면 삽입 실패 시
 * '알렸음'만 남아 영영 알림이 가지 않는다. (적기가 실패하면 다음 날 한 번 더 가는 쪽이 낫다)
 *
 * ⚠️ Vercel Cron은 GET으로 호출한다.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = cronAuthResult(request);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status);
    }

    const admin = createAdminClient();
    const today = toKstDateKey(new Date());

    const { data: books, error: booksError } = await admin
      .from('books')
      .select('id, user_id, title, start_date, created_at, reading_reminded_at')
      .eq('status', 'reading')
      .returns<ReminderCandidate[]>();

    if (booksError) {
      console.error('읽는 중인 책 조회 실패:', booksError);
      return errorResponse('읽는 중인 책 조회에 실패했습니다.', 500);
    }

    const due = selectDueReminders(books ?? [], today);
    if (due.length === 0) {
      return successResponse({ message: '보낼 알림 없음', sentCount: 0 });
    }

    const notifications = due.map(({ book, dayCount }) => ({
      user_id: book.user_id,
      // 나에게 오는 알림 — 보낸 사람도 본인
      actor_id: book.user_id,
      type: 'reading_reminder' as const,
      target_type: 'book' as const,
      target_id: book.id,
      message: `『${book.title}』 읽은 지 ${dayCount}일째예요. 다 읽었다면 완독으로 바꿔 주세요.`,
    }));

    const { error: insertError } = await admin
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('읽는 중 알림 삽입 실패:', insertError);
      return errorResponse('알림 생성에 실패했습니다.', 500);
    }

    const { error: markError } = await admin
      .from('books')
      .update({ reading_reminded_at: new Date().toISOString() })
      .in(
        'id',
        due.map(({ book }) => book.id)
      );

    if (markError) {
      // 알림은 이미 갔다 — 실패로 돌리지 않고 남겨 둔다(내일 한 번 더 갈 수 있음)
      console.error('reading_reminded_at 기록 실패:', markError);
    }

    // 푸시를 켠 기기로도 보낸다. 크론은 응답을 기다려도 되므로 after 없이 기다린다
    const push = await sendPushForNotifications(notifications);

    return successResponse({
      message: `읽는 중 알림 ${due.length}건 발송`,
      sentCount: due.length,
      pushSent: push.sent,
    });
  } catch (e) {
    console.error('GET /api/cron/reading-reminders error:', e);
    return errorResponse('읽는 중 알림 발송 중 오류가 발생했습니다.', 500);
  }
}
