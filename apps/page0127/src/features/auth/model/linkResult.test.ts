import { describe, expect, it } from 'vitest';

import { toLinkResultMessage } from './linkResult';

describe('toLinkResultMessage', () => {
  it('성공이면 연결됐다고 알린다', () => {
    expect(toLinkResultMessage({ linked: 'kakao', failed: null })).toEqual({
      kind: 'success',
      text: '카카오 로그인 계정을 연결했어요.',
    });
  });

  it('실패면 빠져나갈 길을 함께 알려 준다', () => {
    const result = toLinkResultMessage({ linked: null, failed: 'kakao' });

    expect(result?.kind).toBe('error');
    // 원인을 단정하지 않는다 — 서버가 사유를 주지 않는다
    expect(result?.text).toContain('이미 다른 계정에서 쓰고 있는 계정이라면');
    // 무엇을 하면 되는지가 있어야 안내다
    expect(result?.text).toContain('연결을 끊은 뒤');
  });

  it('공급자 이름을 문구에 넣는다', () => {
    expect(toLinkResultMessage({ linked: null, failed: 'google' })?.text).toContain(
      '구글로 계속하기'
    );
  });

  it('둘 다 없으면 알릴 것이 없다', () => {
    expect(toLinkResultMessage({ linked: null, failed: null })).toBeNull();
  });

  it('모르는 공급자면 알리지 않는다 — 사용자가 만든 값일 수 있다', () => {
    expect(toLinkResultMessage({ linked: 'nonsense', failed: null })).toBeNull();
    expect(toLinkResultMessage({ linked: null, failed: 'nonsense' })).toBeNull();
  });

  it('프로토타입 키에 속지 않는다', () => {
    expect(toLinkResultMessage({ linked: 'toString', failed: null })).toBeNull();
  });

  it('둘 다 실려 오면 성공을 택한다', () => {
    // 실제로는 생기지 않지만, 주소를 손으로 만들면 가능하다.
    // 성공을 택해야 "연결됐는데 실패했다고 뜨는" 최악을 피한다.
    expect(
      toLinkResultMessage({ linked: 'kakao', failed: 'google' })?.kind
    ).toBe('success');
  });
});
