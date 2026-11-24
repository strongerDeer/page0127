import { createAdminClient } from '@/shared/config/supabase/admin';

import { parseFirstTouch } from './firstTouch';

/** 프로필이 이 시간 안에 만들어졌으면 "방금 가입"으로 본다 */
const NEW_SIGNUP_WINDOW_MS = 10 * 60 * 1000;

/**
 * 방금 가입한 사람의 첫 방문 출처를 저장한다(signup_attributions).
 *
 * - 기존 회원이 새 기기에서 로그인한 경우는 저장하지 않는다 — 그 기기의 쿠키는 가입 때 출처가 아니다.
 *   그래서 프로필 생성 시각이 방금(10분 안)인지 본다.
 * - 쿠키가 없거나 깨졌으면 아무것도 안 한다(어드민에서 "기록 없음"으로 보인다).
 * - 실패해도 가입은 계속된다 — 통계 한 줄 때문에 로그인을 막지 않는다.
 *
 * @returns 쿠키를 지워도 되면 true(저장했거나, 기존 회원이라 쓸 일이 없음)
 */
export const recordSignupAttribution = async (input: {
  userId: string;
  profileCreatedAt: string;
  cookieValue: string | undefined;
  now?: Date;
}): Promise<boolean> => {
  const now = input.now ?? new Date();
  const isNewSignup =
    now.getTime() - Date.parse(input.profileCreatedAt) < NEW_SIGNUP_WINDOW_MS;
  if (!isNewSignup) return true;

  const ft = parseFirstTouch(input.cookieValue);
  if (!ft) return true;

  try {
    const { error } = await createAdminClient()
      .from('signup_attributions')
      .upsert(
        {
          user_id: input.userId,
          source: ft.source,
          medium: ft.medium,
          campaign: ft.campaign,
          referrer_host: ft.referrerHost,
          landing_path: ft.landingPath,
          first_seen_at: ft.firstSeenAt,
        },
        // 같은 사람이 두 번 콜백을 타도(새로고침) 첫 기록을 지킨다
        { onConflict: 'user_id', ignoreDuplicates: true }
      );
    if (error) {
      console.error('[signup] 가입 출처 저장 실패:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[signup] 가입 출처 저장 실패:', e);
    return false;
  }
};
