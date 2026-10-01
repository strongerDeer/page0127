import { describe, expect, it } from 'vitest';

import { PROFILE_PUBLIC_COLUMNS } from './profileColumns';

const columns = PROFILE_PUBLIC_COLUMNS.split(',').map((c) => c.trim());

describe('PROFILE_PUBLIC_COLUMNS', () => {
  it('숨긴 컬럼(email·status·suspended_until)을 담지 않는다', () => {
    // 하나라도 들어가면 SELECT 권한이 없어 프로필 조회 전체가 42501 로 실패한다
    expect(columns).not.toContain('email');
    expect(columns).not.toContain('status');
    expect(columns).not.toContain('suspended_until');
  });

  it('화면이 쓰는 핵심 컬럼은 담는다', () => {
    expect(columns).toEqual(
      expect.arrayContaining(['id', 'username', 'nickname', 'photo_url', 'onboarded_at'])
    );
  });
});
