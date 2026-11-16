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

import {
  describeCostsFailure,
  fetchOpenAiCostsWithRetry,
} from '@/features/admin-costs/api/getOpenAiCosts';
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
 * 왜 01:47 UTC(10:47 KST)인가:
 *   예전 00:30 UTC 에는 Costs API 가 이틀 연속 429 를 줬다(2026-11-15·16). 같은 키로 낮에 부르면 성공 →
 *   하루가 바뀐 직후 붐비는 시각을 피해, 사람들이 잘 고르지 않는 분(47분)으로 옮겼다.
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
  // 일시 오류(429·5xx·네트워크)면 기다렸다 최대 3번 더 — 실패한 날의 알림은 다시 오지 않기 때문
  const result = await fetchOpenAiCostsWithRetry(yesterday.at);
  if (!result.ok) {
    if (result.failure.kind === 'no-key') {
      return successResponse({ alerted: false, reason: 'no_admin_key' });
    }
    // 실패 이유(forbidden / status 코드)를 함께 남겨야 키 문제인지 OpenAI 장애인지 가를 수 있다
    const reason = describeCostsFailure(result.failure);
    const hint =
      result.failure.kind === 'forbidden'
        ? ' OPENAI_ADMIN_KEY(관리자 키)가 유효한지 확인하세요.'
        : '';
    return errorResponse(
      `OpenAI 청구액을 읽지 못했습니다. [${reason}]${hint}`,
      502
    );
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
