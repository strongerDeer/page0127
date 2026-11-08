import {
  isAuthApiError,
  isAuthSessionMissingError,
} from '@supabase/supabase-js';

import type { User, UserResponse } from '@supabase/supabase-js';

/** A failed verification is not evidence of logout. Never trust an unverified session. */
export async function getVerifiedUser(auth: {
  getUser(): Promise<UserResponse>;
}): Promise<User | null> {
  const { data, error } = await auth.getUser();
  if (!error) return data.user;

  if (isAuthSessionMissingError(error)) return null;
  // Invalid/revoked credentials are a genuine anonymous state; service failures,
  // timeouts and rate limits must remain errors so callers can retry safely.
  if (
    isAuthApiError(error) &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  ) {
    return null;
  }
  throw error;
}
