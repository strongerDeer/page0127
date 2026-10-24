import { describe, expect, it } from 'vitest';

import { AUTO_CLAIM_WINDOW_MS, canAutoClaim } from './claimConsent';

const SAVED = 1_760_000_000_000;

describe('canAutoClaim', () => {
  it('고른 직후 이 탭에서 로그인을 시작했으면 바로 담는다', () => {
    expect(canAutoClaim(SAVED, SAVED + 20_000)).toBe(true);
    expect(canAutoClaim(SAVED, SAVED + AUTO_CLAIM_WINDOW_MS)).toBe(true);
  });

  it('이 탭에서 로그인을 시작한 기록이 없으면 묻는다 — 공용 PC 의 다음 사람', () => {
    expect(canAutoClaim(SAVED, null)).toBe(false);
  });

  it('고르고 한참 뒤에 로그인했으면 묻는다', () => {
    expect(canAutoClaim(SAVED, SAVED + AUTO_CLAIM_WINDOW_MS + 1)).toBe(false);
  });

  it('고르기 전에 시작한 로그인은 이 보관분과 상관없다', () => {
    expect(canAutoClaim(SAVED, SAVED - 10 * 60 * 1000)).toBe(false);
  });

  it('기기 시계가 조금 어긋난 것은 봐준다', () => {
    expect(canAutoClaim(SAVED, SAVED - 30_000)).toBe(true);
  });
});
