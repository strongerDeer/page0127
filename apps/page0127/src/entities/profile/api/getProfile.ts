import { createClient } from '@/shared/config/supabase/server';

import type { Profile } from '../types';

/**
 * 사용자 프로필 조회 (Server Component용)
 *
 * 학습 포인트:
 * - Server Component에서 직접 Supabase 호출
 * - profiles 테이블이 없으면 자동 생성
 * - reading_goal은 JSONB 타입
 *
 * @param userId - 사용자 ID
 * @returns 프로필 정보
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();

  // 1. 프로필 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // 프로필이 없으면 null 반환 (에러 로그만 출력)
    console.error('프로필 조회 실패:', error.message);
    return null;
  }

  return profile;
};

/**
 * 이메일에서 username 생성 (abc@gmail.com -> abc)
 *
 * 학습 포인트:
 * - 이메일의 @ 앞부분을 username으로 사용
 * - 특수문자 제거하여 안전한 URL 생성
 *
 * @param email - 사용자 이메일
 * @returns username (예: abc)
 */
const generateUsernameFromEmail = (email: string): string => {
  // @ 앞부분만 추출
  const localPart = email.split('@')[0];

  // 영문, 숫자, 언더스코어만 허용 (특수문자 제거)
  const cleaned = localPart.replace(/[^a-zA-Z0-9_]/g, '');

  // 소문자로 변환
  return cleaned.toLowerCase();
};

/**
 * 고유한 username 생성 (중복 시 숫자 추가)
 *
 * 학습 포인트:
 * - username이 중복되면 1, 2, 3... 추가
 * - 예: abc -> abc1 -> abc2
 * - 최대 100번 시도 (무한루프 방지)
 *
 * @param email - 사용자 이메일
 * @returns 고유한 username
 */
export const generateUniqueUsername = async (email: string): Promise<string> => {
  const supabase = await createClient();
  const baseUsername = generateUsernameFromEmail(email);

  // 1. 먼저 기본 username 시도
  const { data: existing } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', baseUsername)
    .maybeSingle();

  if (!existing) {
    return baseUsername; // 중복 없으면 바로 반환
  }

  // 2. 중복이 있으면 숫자 추가 (1부터 시작)
  for (let i = 1; i <= 100; i++) {
    const candidateUsername = `${baseUsername}${i}`;

    const { data: duplicate } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', candidateUsername)
      .maybeSingle();

    if (!duplicate) {
      return candidateUsername; // 사용 가능한 username 발견
    }
  }

  // 100번 시도해도 실패하면 랜덤 숫자 추가
  return `${baseUsername}${Date.now()}`;
};

/**
 * 프로필 생성 또는 업데이트 (upsert)
 *
 * 학습 포인트:
 * - 처음 로그인한 사용자는 프로필이 없을 수 있음
 * - upsert로 자동 생성/업데이트
 * - username이 없으면 자동 생성
 *
 * @param userId - 사용자 ID
 * @param email - 사용자 이메일
 */
export const upsertProfile = async (
  userId: string,
  email: string
): Promise<void> => {
  const supabase = await createClient();

  // 1. 기존 프로필 확인
  const existingProfile = await getProfile(userId);

  // 2. username이 없으면 생성
  let username: string | undefined;
  if (!existingProfile?.username) {
    username = await generateUniqueUsername(email);
  }

  // 3. upsert (username이 있으면 추가, 없으면 기존 유지)
  await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      ...(username && { username }), // username이 있을 때만 추가
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );
};
