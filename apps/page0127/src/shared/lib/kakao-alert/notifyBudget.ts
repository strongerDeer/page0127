import { createAdminClient } from '@/shared/config/supabase/admin';
import { MONTHLY_BUDGET_CENTS, USD_TO_KRW } from '@/shared/lib/admin/config';
import { getMonthlySpentCents } from '@/shared/lib/aiUsage';

import { crossedBudgetThreshold, toBudgetAlertText } from './budgetAlert';
import { sendKakaoAlert } from './kakaoAlertSender';
import { getKakaoAlertConfig } from './kakaoApi';
import { loadKakaoTokens, saveKakaoTokens } from './tokenStore';

/**
 * AI 분석 결과를 저장한 뒤 부른다 — 이번 호출로 월 예산 기준선을 건넜으면 카톡을 보낸다.
 *
 * ⚠️ 사용액은 반드시 service_role 로 센다. 사용자 클라이언트로 세면 RLS 때문에
 *    **그 사람 분석만** 합산돼, 전체가 80% 를 넘어도 기준선을 영영 못 건넌다.
 *
 * 분석 응답을 붙잡지 않도록 라우트에서 after() 안에서 부르고,
 * 발송 실패는 호출부가 로그로만 남긴다(분석 성공과 무관하다).
 */
export const notifyBudgetIfCrossed = async (
  addedCents: number,
  origin: string
): Promise<void> => {
  const afterCents = await getMonthlySpentCents(createAdminClient());
  const threshold = crossedBudgetThreshold({
    beforeCents: afterCents - addedCents,
    afterCents,
    budgetCents: MONTHLY_BUDGET_CENTS,
  });
  if (!threshold) return;

  await sendKakaoAlert(
    {
      config: getKakaoAlertConfig(),
      load: loadKakaoTokens,
      save: saveKakaoTokens,
    },
    {
      text: toBudgetAlertText({
        threshold,
        spentCents: afterCents,
        budgetCents: MONTHLY_BUDGET_CENTS,
        usdToKrw: USD_TO_KRW,
      }),
      linkUrl: new URL('/admin/costs', origin).toString(),
      buttonTitle: '비용 화면 열기',
    }
  );
};
