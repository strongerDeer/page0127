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

  it('카카오가 주는 http 사진 주소를 https 로 올린다', () => {
    // 카카오는 avatar_url 을 http 로 준다(2026-08-06 실측).
    // 그대로 두면 운영(https)에서 mixed content 로 브라우저가 차단한다.
    expect(
      toIdentityDefaults({
        avatar_url: 'http://img1.kakaocdn.net/thumb/R640x640.q70/abc.jpg',
      }).photoUrl
    ).toBe('https://img1.kakaocdn.net/thumb/R640x640.q70/abc.jpg');
  });

  it('이미 https 인 주소는 건드리지 않는다', () => {
    expect(
      toIdentityDefaults({ avatar_url: 'https://example.com/p.png' }).photoUrl
    ).toBe('https://example.com/p.png');
  });

  it('카카오 닉네임이 이모지뿐이어도 그대로 쓴다', () => {
    // 실측된 실제 값이다. 표시 이름으로는 문제없다 —
    // 아이디는 generateUsernameSeed 가 따로 걸러 reader 로 떨어뜨린다.
    expect(toIdentityDefaults({ full_name: '🫥' }).nickname).toBe('🫥');
  });
});
