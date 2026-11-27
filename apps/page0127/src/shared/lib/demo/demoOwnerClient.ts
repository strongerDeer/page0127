import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { isDemoUser } from './demoAccount';

import type { SupabaseClient } from '@supabase/supabase-js';

import 'server-only';

/**
 * 체험 계정 본인이 자기 공유 이미지를 부를 때만 본인 세션 클라이언트를 돌려준다. 아니면 null.
 *
 * 왜 필요한가 (2026-11-27, HJ "체험 본인에겐 그려 주기"):
 * 공유 이미지(서재·책 기록 스토리)는 "링크를 받은 사람이 볼 것"과 같게 **익명**으로 조회한다.
 * 그런데 체험 계정 책은 RLS("Demo books are visible only to the demo account")로 본인에게만
 * 보여서, 익명 조회로는 책장이 0권 → 서재 이미지는 빈 책장, 책 기록 이미지는 404 였다.
 *
 * 체험 본인일 때만 세션으로 조회하면 리뷰어가 공유 이미지를 볼 수 있다. 공개 범위는 그대로다 —
 * 조회 함수들이 is_public 을 직접 거르므로, 세션으로 불러도 비공개 책은 실리지 않는다.
 * 일반 회원은 바뀌는 것이 없다(늘 익명 조회).
 *
 * ⚠️ 이 클라이언트로 그린 이미지는 공개 캐시에 올리면 안 된다 — 부른 쪽이
 * PRIVATE_IMAGE_CACHE_CONTROL 을 붙인다(익명에게는 여전히 빈 책장이 맞는 답이다).
 */
export const getDemoOwnerClient = async (
  ownerId: string | null | undefined
): Promise<SupabaseClient | null> => {
  if (!ownerId) return null;

  const user = await getCurrentUser();
  if (!user || !isDemoUser(user) || user.id !== ownerId) return null;

  return createClient();
};
