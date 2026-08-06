import { describe, expect, it } from 'vitest';

import { toAuthErrorReason } from './authErrorReason';

describe('toAuthErrorReason', () => {
  it('access_denied면 cancelled (창을 닫았거나 동의를 거부했거나)', () => {
    expect(
      toAuthErrorReason(
        new URLSearchParams(
          'error=access_denied&error_description=User+denied+access'
        )
      )
    ).toBe('cancelled');
  });

  it('flow_state_expired면 expired', () => {
    expect(
      toAuthErrorReason(
        new URLSearchParams(
          'error=invalid_request&error_code=flow_state_expired'
        )
      )
    ).toBe('expired');
  });

  it('flow_state_not_found면 expired', () => {
    // 뒤로가기로 오래된 콜백 URL 을 다시 여는 경우 — 사용자에게는 '만료'와 같다
    expect(
      toAuthErrorReason(new URLSearchParams('error_code=flow_state_not_found'))
    ).toBe('expired');
  });

  it('otp_expired면 expired', () => {
    expect(
      toAuthErrorReason(new URLSearchParams('error_code=otp_expired'))
    ).toBe('expired');
  });

  it('만료 코드가 access_denied보다 우선한다', () => {
    // 둘 다 실려 오면 더 구체적인 쪽을 택한다
    expect(
      toAuthErrorReason(
        new URLSearchParams('error=access_denied&error_code=flow_state_expired')
      )
    ).toBe('expired');
  });

  it('모르는 error_code면 unknown', () => {
    expect(
      toAuthErrorReason(
        new URLSearchParams('error=server_error&error_code=unexpected_failure')
      )
    ).toBe('unknown');
  });

  it('빈 파라미터면 unknown', () => {
    expect(toAuthErrorReason(new URLSearchParams(''))).toBe('unknown');
  });

  it('정지(ban)는 여기서 판정하지 않는다 — isBannedRedirect 가 먼저 걸러 낸다', () => {
    // 만약 여기까지 흘러와도 cancelled 로 뭉개지 않고 제 갈 길을 가야 한다.
    // access_denied 가 함께 오므로 cancelled 가 되는데, 이건 의도된 결과다 —
    // 콜백이 isBannedRedirect 를 먼저 보므로 실제로는 도달하지 않는다.
    const banned = new URLSearchParams(
      'error=access_denied&error_code=user_banned'
    );
    expect(toAuthErrorReason(banned)).toBe('cancelled');
  });
});
