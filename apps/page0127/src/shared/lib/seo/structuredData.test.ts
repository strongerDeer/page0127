import { describe, expect, it } from 'vitest';

import {
  buildBookJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildProfilePageJsonLd,
  buildWebApplicationJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from './structuredData';

describe('serializeJsonLd', () => {
  /**
   * JSON-LD는 <script> 안에 문자열로 박힌다. 값에 `</script>`가 들어가면
   * 브라우저가 거기서 스크립트를 닫고 뒤를 HTML로 읽는다 → 주입 통로가 된다.
   * DB에서 온 책 제목·소개글을 넣게 될 때를 대비해 `<`를 전부 이스케이프한다.
   */
  it('<를 \\u003c로 바꿔 </script> 로 태그가 닫히지 않게 한다', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });

    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({
      name: '</script><script>alert(1)</script>',
    });
  });
});

describe('buildWebSiteJsonLd', () => {
  it('schema.org WebSite 형식으로 사이트 이름·주소·언어를 담는다', () => {
    expect(
      buildWebSiteJsonLd({
        name: 'page0127',
        url: 'https://page0127.com',
        description: '설명',
      })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'page0127',
      url: 'https://page0127.com',
      description: '설명',
      inLanguage: 'ko-KR',
    });
  });
});

describe('buildOrganizationJsonLd', () => {
  it('schema.org Organization 형식으로 공식 SNS 주소를 sameAs에 담는다', () => {
    expect(
      buildOrganizationJsonLd({
        name: 'page0127.',
        url: 'https://page0127.com',
        logo: 'https://page0127.com/icon.png',
        sameAs: ['https://www.instagram.com/page0127._/'],
      })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'page0127.',
      url: 'https://page0127.com',
      logo: 'https://page0127.com/icon.png',
      sameAs: ['https://www.instagram.com/page0127._/'],
    });
  });
});

describe('buildWebApplicationJsonLd', () => {
  it('무료 웹 서비스라는 사실(가격 0·플랫폼 Web)을 담는다', () => {
    const out = buildWebApplicationJsonLd({
      name: 'page0127.',
      url: 'https://page0127.com',
      description: '설명',
    });

    expect(out['@type']).toBe('WebApplication');
    expect(out.operatingSystem).toBe('Web');
    expect(out.isAccessibleForFree).toBe(true);
    expect(out.offers).toEqual({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    });
    // 실제 리뷰 없이 별점을 넣으면 구글 정책 위반 — 넣지 않는다
    expect(out).not.toHaveProperty('aggregateRating');
  });
});

describe('buildFaqPageJsonLd', () => {
  it('질문·답 배열을 FAQPage의 Question/Answer로 옮긴다', () => {
    expect(
      buildFaqPageJsonLd([{ question: '무료인가요?', answer: '네.' }])
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '무료인가요?',
          acceptedAnswer: { '@type': 'Answer', text: '네.' },
        },
      ],
    });
  });
});

describe('buildBookJsonLd', () => {
  it('ISBN·저자·출판사를 담고 별점은 넣지 않는다', () => {
    const ld = buildBookJsonLd({
      title: '혼모노',
      author: '성해나',
      isbn: '9788936439934',
      publisher: '창비',
      pubDate: '2025-03-28',
      image: 'https://example.com/cover.jpg',
      url: 'https://page0127.com/books/info/abc',
    });
    expect(ld).toMatchObject({
      '@type': 'Book',
      name: '혼모노',
      isbn: '9788936439934',
      author: { '@type': 'Person', name: '성해나' },
      publisher: { '@type': 'Organization', name: '창비' },
      datePublished: '2025-03-28',
    });
    expect(ld).not.toHaveProperty('aggregateRating');
  });

  it('비어 있는 값은 키째 뺀다', () => {
    const ld = buildBookJsonLd({
      title: '책',
      author: null,
      isbn: '1',
      publisher: null,
      pubDate: null,
      image: null,
      url: 'https://page0127.com/books/info/x',
    });
    expect(ld).not.toHaveProperty('author');
    expect(ld).not.toHaveProperty('publisher');
    expect(ld).not.toHaveProperty('datePublished');
    expect(ld).not.toHaveProperty('image');
  });
});

describe('buildProfilePageJsonLd', () => {
  it('사람(Person)을 mainEntity 로, 아이디를 alternateName 으로 담는다', () => {
    const ld = buildProfilePageJsonLd({
      name: '효카소',
      username: 'hyocasso',
      description: '효카소님의 책장',
      url: 'https://page0127.com/hyocasso',
      image: null,
    });
    expect(ld).toMatchObject({
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: '효카소',
        alternateName: 'hyocasso',
      },
    });
    expect(ld.mainEntity).not.toHaveProperty('image');
  });
});
