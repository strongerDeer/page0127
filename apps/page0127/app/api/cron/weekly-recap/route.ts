import { createAdminClient } from '@/shared/config/supabase/admin';

import {
  type RecapBook,
  selectRecapCard,
  toRecapNotice,
} from '@/entities/recap';

import { cronAuthResult } from '../../_helpers/cron-auth';
import { sendPushForNotifications } from '../../_helpers/push';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/cron/weekly-recap
 * 한 주를 마무리하는 시각에 주간 회상을 알림으로 건넨다. (매주 일요일 KST 20:00)
 *
 * 내 서재의 회상 카드(selectRecapCard)와 **같은 함수로** 고른다 — 알림을 눌러 서재에 왔는데
 * 다른 카드가 떠 있으면 안 된다. 일요일 저녁이면 이번 주(월~일)가 거의 다 찼다.
 *
 * 흐름:
 *   1. 모든 사용자의 책을 service_role 로 읽는다 (회상은 비공개 책도 포함한다 — getRecapBooks 와 같다)
 *   2. 사람별로 카드를 고르고, 알릴 문장이 있는 사람만 남긴다 (읽는 중 카드는 제외 → toRecapNotice)
 *   3. 지난 6일 안에 이미 회상 알림을 받은 사람은 뺀다 (크론 재시도·수동 실행 중복 방지)
 *   4. 알림을 넣고, 푸시를 켠 기기로도 보낸다
 *
 * ⚠️ 지금은 책 전량을 한 번에 읽는다. 사용자가 수백 명을 넘으면 사람 단위로 나눠 읽는다.
 * ⚠️ Vercel Cron은 GET으로 호출한다.
 */
export const dynamic = 'force-dynamic';

/** 같은 사람에게 회상 알림을 다시 보내기까지 최소 간격 — 주 1회보다 조금 짧게 */
const DEDUPE_WINDOW_MS = 6 * 24 * 60 * 60 * 1000;

type BookRow = RecapBook & { user_id: string };

export async function GET(request: Request) {
  try {
    const auth = cronAuthResult(request);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status);
    }

    const admin = createAdminClient();
    const now = new Date();

    const { data: books, error: booksError } = await admin
      .from('books')
      .select(
        'user_id, id, title, author, cover_image, provider_item_id, status, rating, is_life_book, completed_date, created_at'
      )
      .returns<BookRow[]>();

    if (booksError) {
      console.error('회상용 책 조회 실패:', booksError);
      return errorResponse('책 조회에 실패했습니다.', 500);
    }

    const booksByUser = new Map<string, RecapBook[]>();
    for (const { user_id, ...book } of books ?? []) {
      const list = booksByUser.get(user_id) ?? [];
      list.push(book);
      booksByUser.set(user_id, list);
    }

    const candidates = [...booksByUser.entries()].flatMap(
      ([userId, userBooks]) => {
        const card = selectRecapCard(userBooks, now);
        const message = card ? toRecapNotice(card) : null;
        return message ? [{ userId, message }] : [];
      }
    );

    if (candidates.length === 0) {
      return successResponse({ message: '보낼 회상 없음', sentCount: 0 });
    }

    const { data: recent, error: recentError } = await admin
      .from('notifications')
      .select('user_id')
      .eq('type', 'weekly_recap')
      .gte(
        'created_at',
        new Date(now.getTime() - DEDUPE_WINDOW_MS).toISOString()
      )
      .in(
        'user_id',
        candidates.map((c) => c.userId)
      );

    if (recentError) {
      // 중복 여부를 모르면 보내지 않는다 — 한 주 빠지는 쪽이 두 번 받는 쪽보다 낫다
      console.error('최근 회상 알림 조회 실패:', recentError);
      return errorResponse('최근 알림 조회에 실패했습니다.', 500);
    }

    const alreadySent = new Set((recent ?? []).map((r) => r.user_id));
    const notifications = candidates
      .filter((c) => !alreadySent.has(c.userId))
      .map(({ userId, message }) => ({
        user_id: userId,
        // 나에게 오는 알림 — 보낸 사람도 본인
        actor_id: userId,
        type: 'weekly_recap' as const,
        // 갈 곳은 홈(회상 카드)으로 정해져 있다 — notificationHref
        target_type: null,
        target_id: null,
        message,
      }));

    if (notifications.length === 0) {
      return successResponse({
        message: '이번 주 회상은 이미 보냄',
        sentCount: 0,
      });
    }

    const { error: insertError } = await admin
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('회상 알림 삽입 실패:', insertError);
      return errorResponse('알림 생성에 실패했습니다.', 500);
    }

    const push = await sendPushForNotifications(notifications);

    return successResponse({
      message: `주간 회상 알림 ${notifications.length}건 발송`,
      sentCount: notifications.length,
      pushSent: push.sent,
    });
  } catch (e) {
    console.error('GET /api/cron/weekly-recap error:', e);
    return errorResponse('주간 회상 알림 발송 중 오류가 발생했습니다.', 500);
  }
}
