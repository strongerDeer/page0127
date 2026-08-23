import { describe, expect, it } from 'vitest';

import { isPreOptimizedImageSrc } from '../src/lib/imageOptimization';

/**
 * "이미 최적화된 원격 이미지는 다시 변환하지 않는다"는 규칙을 고정한다.
 *
 * 2026-08-23 운영에서 표지가 전부 "표지 없음"으로 바뀌었다. 원인은 코드가
 * 아니라 Vercel 이미지 최적화 한도 소진이었다 —
 * `/_next/image` 가 402(OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)를 돌려주고,
 * 캐시에 남아 있던 변환본만 살아남았다.
 *
 * 변환 횟수의 대부분은 알라딘 표지가 먹고 있었다. 알라딘 CDN 은 이미 완성된
 * cover500(수십 KB) JPG 를 주므로 우리가 다시 리사이즈할 이유가 없다.
 *
 * 이 판정이 조용히 뒤집히면(예: 호스트 목록 오타) 에러 없이 변환 소비만
 * 되살아나 한도를 다시 태우고, 며칠 뒤 같은 방식으로 표지가 사라진다.
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

  it('Supabase 업로드 이미지는 최적화를 유지한다', () => {
    // 프로필 사진은 리사이즈 없이 원본(최대 4MB)이 그대로 저장된다.
    // 여기까지 최적화를 끄면 서재 목록에 4MB 짜리 아바타가 그대로 나간다.
    expect(
      isPreOptimizedImageSrc(
        'https://sjngwxtykqhlsvxcyqah.supabase.co/storage/v1/object/public/profiles/avatars/a_1.jpg'
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

  it('호스트가 정확히 일치할 때만 참 — 이름이 겹치는 도메인에 속지 않는다', () => {
    // `src.includes('image.aladin.co.kr')` 같은 부분 문자열 판정은
    // 공격자가 만든 image.aladin.co.kr.evil.com 도 통과시킨다.
    expect(
      isPreOptimizedImageSrc('https://image.aladin.co.kr.evil.com/a.jpg')
    ).toBe(false);
    expect(
      isPreOptimizedImageSrc('https://evil.com/?u=image.aladin.co.kr/a.jpg')
    ).toBe(false);
  });

  it('URL 로 파싱되지 않는 값은 최적화를 유지한다', () => {
    expect(isPreOptimizedImageSrc('not a url')).toBe(false);
  });
});
