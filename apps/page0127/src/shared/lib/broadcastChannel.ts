/**
 * BroadcastChannel을 사용한 탭 간 실시간 통신
 *
 * 학습 포인트:
 * - 같은 origin의 다른 탭/윈도우와 메시지 전송
 * - 팔로우/언팔로우 시 다른 탭에 알림
 */

type FollowEventType = 'follow' | 'unfollow';

type FollowEvent = {
  type: FollowEventType;
  userId: string;
  timestamp: number;
};

const CHANNEL_NAME = 'follow-updates';

class FollowBroadcast {
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
    }
  }

  // 팔로우 이벤트 전송
  sendFollowEvent(type: FollowEventType, userId: string) {
    if (!this.channel) return;

    const event: FollowEvent = {
      type,
      userId,
      timestamp: Date.now(),
    };

    this.channel.postMessage(event);
  }

  // 팔로우 이벤트 구독
  onFollowEvent(callback: (event: FollowEvent) => void) {
    if (!this.channel) return () => {};

    const handler = (event: MessageEvent<FollowEvent>) => {
      callback(event.data);
    };

    this.channel.addEventListener('message', handler);

    // 구독 해제 함수 반환
    return () => {
      this.channel?.removeEventListener('message', handler);
    };
  }

  // 채널 닫기
  close() {
    this.channel?.close();
  }
}

export const followBroadcast = new FollowBroadcast();
