import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { BookCover, pickCoverSrc } from '../src/components/BookCover';

const YES24_COVER = 'https://image.yes24.com/goods/13137546/XL';
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
  it('YES24 표지는 /_next/image 를 거치지 않고 YES24 의 작은 사본을 받는다', () => {
    // 목록 표지(sm: 높이 80 → 폭 55, sizes="55px")를 2x 화면의 브라우저는
    // srcset 에서 110px 이상인 첫 후보(128w)를 고른다 — 그게 M(151px)이어야 한다.
    // 예전에는 srcset 없이 XL 원본(249KB) 하나가 나갔다.
    // (src 속성의 XL 은 srcset 미지원 브라우저용 예비값이라 실제로 받지 않는다.)
    const html = renderToStaticMarkup(
      <BookCover src={YES24_COVER} title='어떤 책' />
    );

    expect(html).toContain('sizes="55px"');
    expect(html).toContain('https://image.yes24.com/goods/13137546/M 128w');
    expect(html).not.toContain('/_next/image');
  });

  it('large 를 준 큰 표지만 srcset 에 XL 을 포함한다', () => {
    // CSS 폭 200px 이면 2x 화면에서 400px 이 필요하다 — L(275px)로는 흐리다.
    const large = renderToStaticMarkup(
      <BookCover
        src={YES24_COVER}
        title='어떤 책'
        size='full'
        sizes='200px'
        large
      />
    );
    expect(large).toContain('https://image.yes24.com/goods/13137546/XL 640w');
    expect(large).not.toContain('/_next/image');

    // 격자처럼 fill 로 깔리는 표지는 고밀도 화면에서도 L 에서 멈춘다
    const grid = renderToStaticMarkup(
      <BookCover src={YES24_COVER} title='어떤 책' size='fill' sizes='33vw' />
    );
    expect(grid).toContain('https://image.yes24.com/goods/13137546/L 640w');
    expect(grid).not.toContain('/XL');
  });

  it('Supabase 업로드 이미지도 원본 URL 로 나간다', () => {
    // 2026-08-25 방침 변경. 한도가 소진되면 캐시 없는 새 이미지는 402 로
    // 아예 사라진다 — 크게 나가더라도 보이는 편을 택했다.
    const html = renderToStaticMarkup(
      <BookCover src={SUPABASE_UPLOAD} title='어떤 책' />
    );

    expect(html).toContain(SUPABASE_UPLOAD);
    expect(html).not.toContain('/_next/image');
  });

  it('로컬 정적 이미지는 여전히 최적화를 거친다', () => {
    // 전부 unoptimized 로 밀어버린 게 아님을 못 박는다.
    const html = renderToStaticMarkup(
      <BookCover src='/images/no-book.jpg' title='어떤 책' />
    );

    expect(html).toContain('/_next/image');
  });

  it('fill·full 분기에서도 같은 규칙이 적용된다', () => {
    // 두 분기가 각각 <Image> 를 그린다. 한쪽에만 unoptimized 를 달면
    // 그 분기를 쓰는 화면만 조용히 변환을 태운다.
    for (const size of ['fill', 'full'] as const) {
      const html = renderToStaticMarkup(
        <BookCover src={YES24_COVER} title='어떤 책' size={size} />
      );

      expect(html, `size=${size}`).not.toContain('/_next/image');
    }
  });
});

/**
 * 표지 주소 후보 고르기 — src 실패 시 fallbackSrc, 그것도 실패하면 제목 조판(null).
 *
 * onError 는 서버 렌더로 재현할 수 없어서, 실패 목록을 받아 다음 후보를 고르는
 * 판단만 떼어 고정한다. 컴포넌트는 실패한 주소를 쌓아 이 함수에 넘길 뿐이다.
 */
describe('pickCoverSrc', () => {
  const storage =
    'https://abc.supabase.co/storage/v1/object/public/book-covers/1/cover.jpg';

  it('실패가 없으면 src 를 쓴다', () => {
    expect(pickCoverSrc([YES24_COVER, storage], [])).toBe(YES24_COVER);
  });

  it('src 가 실패하면 fallbackSrc 로 넘어간다', () => {
    expect(pickCoverSrc([YES24_COVER, storage], [YES24_COVER])).toBe(storage);
  });

  it('둘 다 실패하면 null — 제목을 조판한다', () => {
    expect(pickCoverSrc([YES24_COVER, storage], [YES24_COVER, storage])).toBe(
      null
    );
  });

  it('src 가 비어 있으면 처음부터 fallbackSrc 를 쓴다', () => {
    expect(pickCoverSrc([null, storage], [])).toBe(storage);
    expect(pickCoverSrc(['', storage], [])).toBe(storage);
  });

  it('src 와 fallbackSrc 가 같으면 한 번 실패로 둘 다 건너뛴다', () => {
    expect(pickCoverSrc([storage, storage], [storage])).toBe(null);
  });
});
