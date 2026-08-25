import { describe, expect, it } from 'vitest';

import { isPreOptimizedImageSrc } from '../src/lib/imageOptimization';

/**
 * "이 호스트의 이미지는 Vercel 변환을 태우지 않는다"는 규칙을 고정한다.
 *
 * 한도를 넘기면 `/_next/image` 가 402(OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)를
 * 돌려주고, 캐시에 남아 있던 변환본만 살아남는다. 그래서 **겉보기엔 멀쩡한데
 * 새로 들어온 이미지만 사라지는** 형태로 터진다 — 2026-08-23 표지,
 * 2026-08-25 프로필 사진이 실제로 그랬다.
 *
 * 이 판정이 조용히 뒤집히면(호스트 목록 오타 등) 에러 없이 변환 소비만
 * 되살아나고, 며칠 뒤 같은 방식으로 이미지가 사라진다.
 */
describe('isPreOptimizedImageSrc', () => {
  it('알라딘 표지·책등은 최적화를 건너뛴다', () => {
    expect(
      isPreOptimizedImageSrc(
        'https://image.aladin.co.kr/product/39061/33/cover500/k852137647_1.jpg'
      )
    ).toBe(true);
    expect(
      isPreOptimizedImageSrc(
        'https://image.aladin.co.kr/product/39061/33/spineflip/k852137647_d.jpg'
      )
    ).toBe(true);
  });

  it('소셜 로그인 프로필 사진은 최적화를 건너뛴다', () => {
    // 구글·카카오는 서브도메인 번호가 바뀌므로 접미사로 판정한다.
    // 두 CDN 모두 이미 작은 썸네일을 주기 때문에 변환 이득이 없다.
    expect(
      isPreOptimizedImageSrc('https://lh3.googleusercontent.com/a/AAcHTtd=s96-c')
    ).toBe(true);
    expect(
      isPreOptimizedImageSrc('https://k.kakaocdn.net/dn/abc/img_640x640.jpg')
    ).toBe(true);
    expect(
      isPreOptimizedImageSrc('https://img1.kakaocdn.net/dn/abc/img_110x110.jpg')
    ).toBe(true);
  });

  it('Supabase Storage 프로필 사진도 최적화를 건너뛴다', () => {
    // 2026-08-25 방침 변경. 원본이 커서 변환 이득은 있지만, 한도가 소진되면
    // 캐시가 없는 **새 가입자의 사진이 100% 깨진다.** "안 보임"보다 "크게 보임"이
    // 낫다고 판단했다. 원본 크기는 업로드 시점 리사이즈로 따로 막는다.
    expect(
      isPreOptimizedImageSrc(
        'https://sjngwxtykqhlsvxcyqah.supabase.co/storage/v1/object/public/profiles/avatars/a_1.jpg'
      )
    ).toBe(true);
  });

  it('로컬 Supabase(127.0.0.1)는 최적화를 유지한다', () => {
    // 로컬 개발에는 변환 한도가 없다. 굳이 규칙을 넓힐 이유가 없다.
    expect(
      isPreOptimizedImageSrc(
        'http://127.0.0.1:54321/storage/v1/object/public/profiles/avatars/a_1.jpg'
      )
    ).toBe(false);
  });

  it('로컬 정적 이미지·상대 경로는 최적화를 유지한다', () => {
    expect(isPreOptimizedImageSrc('/images/no-book.jpg')).toBe(false);
  });

  it('값이 없으면 false — 판정 대상 자체가 없다', () => {
    expect(isPreOptimizedImageSrc(undefined)).toBe(false);
    expect(isPreOptimizedImageSrc(null)).toBe(false);
    expect(isPreOptimizedImageSrc('')).toBe(false);
  });

  it('호스트로만 판정 — 이름이 겹치는 도메인에 속지 않는다', () => {
    // `src.includes(...)` 같은 부분 문자열 판정은
    // 공격자가 만든 image.aladin.co.kr.evil.com 도 통과시킨다.
    expect(
      isPreOptimizedImageSrc('https://image.aladin.co.kr.evil.com/a.jpg')
    ).toBe(false);
    expect(
      isPreOptimizedImageSrc('https://evil.com/?u=image.aladin.co.kr/a.jpg')
    ).toBe(false);
  });

  it('접미사 판정이 점 앞을 통째로 삼키지 않는다', () => {
    // 접미사를 '.supabase.co' 가 아니라 'supabase.co' 로 적으면
    // 아래 도메인들이 전부 통과한다. 점으로 시작해야 하는 이유.
    expect(isPreOptimizedImageSrc('https://evil-supabase.co/a.jpg')).toBe(false);
    expect(isPreOptimizedImageSrc('https://notkakaocdn.net/a.jpg')).toBe(false);
    expect(
      isPreOptimizedImageSrc('https://fakegoogleusercontent.com/a.jpg')
    ).toBe(false);
  });

  it('URL 로 파싱되지 않는 값은 최적화를 유지한다', () => {
    expect(isPreOptimizedImageSrc('not a url')).toBe(false);
  });
});
