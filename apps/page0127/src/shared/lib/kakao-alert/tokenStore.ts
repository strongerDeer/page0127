import { createAdminClient } from '@/shared/config/supabase/admin';

import type { StoredKakaoTokens } from './tokens';

/**
 * 카카오 토큰을 DB(alert_channel_tokens)에 읽고 쓴다. service_role 전용 테이블이다.
 * 채널당 한 행이라 저장은 upsert(덮어쓰기)다.
 */

const CHANNEL = 'kakao';

type TokenRow = {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
};

/** 아직 연결 전이면 null */
export const loadKakaoTokens = async (): Promise<StoredKakaoTokens | null> => {
  const { data, error } = await createAdminClient()
    .from('alert_channel_tokens')
    .select('access_token, access_token_expires_at, refresh_token, refresh_token_expires_at')
    .eq('channel', CHANNEL)
    .maybeSingle<TokenRow>();

  if (error) throw new Error(`카카오 토큰 조회 실패: ${error.message}`);
  if (!data) return null;

  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: new Date(data.access_token_expires_at),
    refreshToken: data.refresh_token,
    refreshTokenExpiresAt: new Date(data.refresh_token_expires_at),
  };
};

export const saveKakaoTokens = async (tokens: StoredKakaoTokens): Promise<void> => {
  const { error } = await createAdminClient()
    .from('alert_channel_tokens')
    .upsert(
      {
        channel: CHANNEL,
        access_token: tokens.accessToken,
        access_token_expires_at: tokens.accessTokenExpiresAt.toISOString(),
        refresh_token: tokens.refreshToken,
        refresh_token_expires_at: tokens.refreshTokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel' }
    );

  if (error) throw new Error(`카카오 토큰 저장 실패: ${error.message}`);
};
