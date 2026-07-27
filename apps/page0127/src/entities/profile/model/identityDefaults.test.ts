import { describe, expect, it } from 'vitest';

import { toIdentityDefaults } from './identityDefaults';

describe('toIdentityDefaults', () => {
  it('Google이 주는 full_name과 avatar_url을 꺼낸다', () => {
    expect(
      toIdentityDefaults({
        full_name: '강혜진',
        avatar_url: 'https://lh3.googleusercontent.com/a/abc=s96-c',
        name: '무시되는 값',
      })
    ).toEqual({
      nickname: '강혜진',
      photoUrl: 'https://lh3.googleusercontent.com/a/abc=s96-c',
    });
  });

  it('full_name이 없으면 name을, avatar_url이 없으면 picture를 쓴다', () => {
    // 공급자마다 키가 다르다 (Google은 둘 다 주지만 보장되진 않는다)
    expect(
      toIdentityDefaults({
        name: '강혜진',
        picture: 'https://example.com/p.png',
      })
    ).toEqual({
      nickname: '강혜진',
      photoUrl: 'https://example.com/p.png',
    });
  });

  it('공백뿐인 값은 없는 것으로 본다', () => {
    expect(toIdentityDefaults({ full_name: '   ', avatar_url: '' })).toEqual({
      nickname: null,
      photoUrl: null,
    });
  });

  it('문자열이 아닌 값은 버린다', () => {
    // user_metadata는 임의 JSON이라 타입을 신뢰할 수 없다
    expect(
      toIdentityDefaults({ full_name: 123, avatar_url: { a: 1 } })
    ).toEqual({ nickname: null, photoUrl: null });
  });

  it('메타데이터가 비었거나 없으면 전부 null', () => {
    expect(toIdentityDefaults({})).toEqual({ nickname: null, photoUrl: null });
    expect(toIdentityDefaults(undefined)).toEqual({
      nickname: null,
      photoUrl: null,
    });
  });

  it('http(s)가 아닌 사진 주소는 버린다', () => {
    // 외부에서 온 값을 그대로 <Image src>에 넣지 않는다
    expect(
      toIdentityDefaults({ avatar_url: 'javascript:alert(1)' }).photoUrl
    ).toBeNull();
  });
});
