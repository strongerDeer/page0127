import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BookCover } from '../src/components/BookCover';

const ALADIN_COVER =
  'https://image.aladin.co.kr/product/39061/33/cover500/k852137647_1.jpg';
const SUPABASE_UPLOAD =
  'https://sjngwxtykqhlsvxcyqah.supabase.co/storage/v1/object/public/profiles/avatars/a_1.jpg';

/**
 * 판정 함수가 맞아도 컴포넌트가 그 값을 next/image 로 넘기지 않으면 아무 일도
 * 일어나지 않는다. 그래서 "판정"이 아니라 **실제로 렌더된 src** 를 본다.
 *
 * `/_next/image?url=...` 로 나가면 Vercel 이미지 변환을 태우는 것이고,
 * 원본 URL 이 그대로 나오면 태우지 않는 것이다.
 */
describe('BookCover 의 이미지 최적화 경로', () => {
  it('알라딘 표지는 원본 URL 로 나간다 — /_next/image 를 거치지 않는다', () => {
    const html = renderToStaticMarkup(
      <BookCover src={ALADIN_COVER} title='어떤 책' />
    );

    expect(html).toContain(ALADIN_COVER);
    expect(html).not.toContain('/_next/image');
  });

  it('Supabase 업로드 이미지는 최적화를 거친다', () => {
    const html = renderToStaticMarkup(
      <BookCover src={SUPABASE_UPLOAD} title='어떤 책' />
    );

    expect(html).toContain('/_next/image');
  });

  it('fill·full 분기에서도 같은 규칙이 적용된다', () => {
    // 두 분기가 각각 <Image> 를 그린다. 한쪽에만 unoptimized 를 달면
    // 그 분기를 쓰는 화면만 조용히 변환을 태운다.
    for (const size of ['fill', 'full'] as const) {
      const html = renderToStaticMarkup(
        <BookCover src={ALADIN_COVER} title='어떤 책' size={size} />
      );

      expect(html, `size=${size}`).not.toContain('/_next/image');
    }
  });
});
