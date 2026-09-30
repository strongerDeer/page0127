import { describe, expect, it } from 'vitest';

import { buildWebSiteJsonLd, serializeJsonLd } from './structuredData';

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
