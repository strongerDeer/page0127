import { describe, expect, it } from 'vitest';

import { isNewlyCompleted } from './completion';

describe('isNewlyCompleted', () => {
  it('읽는 중에서 완독으로 바뀌면 전환이다', () => {
    expect(isNewlyCompleted('reading', 'completed')).toBe(true);
  });

  it('읽고 싶어요에서 완독으로 바로 가도 전환이다', () => {
    expect(isNewlyCompleted('want_to_read', 'completed')).toBe(true);
  });

  it('새로 등록하는 책(이전 상태 없음)을 완독으로 담으면 전환이다', () => {
    expect(isNewlyCompleted(undefined, 'completed')).toBe(true);
    expect(isNewlyCompleted(null, 'completed')).toBe(true);
  });

  it('이미 완독인 책을 다시 저장하는 것은 전환이 아니다', () => {
    // 메모만 고쳐 저장할 때마다 완독이 늘어나는 것을 막는 규칙이다
    expect(isNewlyCompleted('completed', 'completed')).toBe(false);
  });

  it('완독에서 다른 상태로 되돌리는 것은 전환이 아니다', () => {
    expect(isNewlyCompleted('completed', 'reading')).toBe(false);
  });

  it('완독과 무관한 상태 변경은 전환이 아니다', () => {
    expect(isNewlyCompleted('want_to_read', 'reading')).toBe(false);
  });

  it('다음 상태가 비어 있으면(그 필드를 안 건드린 저장) 전환이 아니다', () => {
    // PATCH 는 부분 갱신이라 status 가 아예 안 실려 올 수 있다
    expect(isNewlyCompleted('reading', undefined)).toBe(false);
    expect(isNewlyCompleted('completed', undefined)).toBe(false);
  });
});
