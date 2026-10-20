import { MONTHLY_BUDGET_CENTS, USD_TO_KRW } from '@/shared/lib/admin/config';
import {
  crossedBudgetThreshold,
  toBillingAlertText,
} from '@/shared/lib/kakao-alert/budgetAlert';
import {
  KakaoNotConnectedError,
  sendKakaoAlert,
} from '@/shared/lib/kakao-alert/kakaoAlertSender';
import { getKakaoAlertConfig } from '@/shared/lib/kakao-alert/kakaoApi';
import {
  loadKakaoTokens,
  saveKakaoTokens,
} from '@/shared/lib/kakao-alert/tokenStore';

import { fetchOpenAiCosts } from '@/features/admin-costs/api/getOpenAiCosts';
import {
  dayCrossingInput,
  kstYesterday,
} from '@/features/admin-costs/lib/openAiCosts';

import { cronAuthResult } from '../../_helpers/cron-auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/cron/check-ai-billing
 * OpenAI **실제 청구액**이 어제 월 예산 기준선(80%·100%)을 넘었으면 카톡을 보낸다.
 *
 * 왜 필요한가:
 *   분석 직후 알림(notifyBudgetIfCrossed)은 운영 DB 의 cost_in_cents 만 센다.
 *   로컬·개발 DB·테스트에서 같은 키로 부른 비용은 거기 없어서, 실제 청구가 예산을
 *   넘어도 카톡이 오지 않았다(2026-10-18). Costs API 는 조직 전체를 하루 단위로 준다.
 *
 * 왜 하루 한 번, 어제만 보나:
 *   Costs API 는 하루 버킷이라 실시간이 아니다. 끝난 날(어제)만 보면 그날을 두 번 세지 않아
 *   "이미 보냈다"를 저장할 곳 없이 기준선을 건넌 날 한 번만 보낸다.
 *
 * 관리자 키가 없거나 카카오 연결 전이면 조용히 끝난다 — 고장이 아니다.
 * ⚠️ Vercel Cron은 GET으로 호출한다.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = cronAuthResult(request);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status);
  }

  const yesterday = kstYesterday(new Date());
  const result = await fetchOpenAiCosts(yesterday.at);
  if (!result.ok) {
    if (result.failure.kind === 'no-key') {
      return successResponse({ alerted: false, reason: 'no_admin_key' });
    }
    return errorResponse('OpenAI 청구액을 읽지 못했습니다.', 502);
  }

  const { beforeCents, afterCents } = dayCrossingInput(
    result.costs,
    yesterday.date
  );
  const threshold = crossedBudgetThreshold({
    beforeCents,
    afterCents,
    budgetCents: MONTHLY_BUDGET_CENTS,
  });
  if (!threshold) {
    return successResponse({
      alerted: false,
      date: yesterday.date,
      afterCents,
    });
  }

  try {
    await sendKakaoAlert(
      {
        config: getKakaoAlertConfig(),
        load: loadKakaoTokens,
        save: saveKakaoTokens,
      },
      {
        text: toBillingAlertText({
          threshold,
          spentCents: afterCents,
          budgetCents: MONTHLY_BUDGET_CENTS,
          usdToKrw: USD_TO_KRW,
        }),
        linkUrl: new URL('/admin/costs', request.url).toString(),
        buttonTitle: '비용 화면 열기',
      }
    );
    return successResponse({ alerted: true, threshold, date: yesterday.date });
  } catch (e) {
    if (e instanceof KakaoNotConnectedError) {
      return successResponse({
        alerted: false,
        reason: 'not_connected',
        threshold,
      });
    }
    console.error('GET /api/cron/check-ai-billing error:', e);
    return errorResponse('예산 알림 발송에 실패했습니다.', 500);
  }
}
