import { describe, expect, it } from 'vitest';

import { LINK_FAILED_PARAM, LINKED_PARAM, toLinkFailurePath } from './linkFlow';

describe('toLinkFailurePath', () => {
  it('연결 흐름이면 설정 화면으로 되돌릴 경로를 준다', () => {
    expect(toLinkFailurePath(`/settings?${LINKED_PARAM}=kakao`)).toBe(
      `/settings?${LINK_FAILED_PARAM}=kakao`
    );
  });

  it('구글도 같다', () => {
    expect(toLinkFailurePath(`/settings?${LINKED_PARAM}=google`)).toBe(
      `/settings?${LINK_FAILED_PARAM}=google`
    );
  });

  it('일반 로그인이면 null (인증 오류 페이지로 가야 한다)', () => {
    expect(toLinkFailurePath(null)).toBeNull();
    expect(toLinkFailurePath('/feed')).toBeNull();
    expect(toLinkFailurePath('/settings')).toBeNull();
  });

  it('모르는 공급자면 null — 사용자가 만든 값일 수 있다', () => {
    expect(toLinkFailurePath(`/settings?${LINKED_PARAM}=nonsense`)).toBeNull();
  });

  it('설정 화면이 아닌 경로에 linked 를 달아도 속지 않는다', () => {
    // next 는 사용자가 만들어 열 수 있는 값이다
    expect(toLinkFailurePath(`/feed?${LINKED_PARAM}=kakao`)).toBeNull();
  });

  it('외부 주소는 걸러 낸다', () => {
    expect(toLinkFailurePath(`https://evil.com/settings?${LINKED_PARAM}=kakao`)).toBeNull();
    expect(toLinkFailurePath(`//evil.com/settings?${LINKED_PARAM}=kakao`)).toBeNull();
  });
});
