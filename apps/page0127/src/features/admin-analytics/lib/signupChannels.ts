import {
  type AttributionLike,
  type SignupChannel,
  toSignupChannel,
} from '@/shared/lib/attribution/signupChannel';

export type SignupChannelCount = { channel: SignupChannel; count: number };

/**
 * 기간 가입자 → 채널별 명수(많은 순). '기록 없음'은 맨 아래로 —
 * 기록이 시작되기 전(2026-11-24) 가입자라 "어디서 왔나"의 답이 아니다.
 */
export const countSignupChannels = (
  userIds: string[],
  attributions: Map<string, NonNullable<AttributionLike>>
): SignupChannelCount[] => {
  const counts = new Map<SignupChannel, number>();
  for (const id of userIds) {
    const ch = toSignupChannel(attributions.get(id) ?? null);
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => {
      if (a.channel === '기록 없음') return 1;
      if (b.channel === '기록 없음') return -1;
      return b.count - a.count;
    });
};
