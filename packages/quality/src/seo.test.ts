import { describe, expect, it } from 'vitest';

import { parseSeoFromHtml } from './seo';

const goodHtml = `
<html><head>
  <link rel="canonical" href="https://shop.novera.town/ko" />
  <link rel="alternate" hreflang="ko" href="https://shop.novera.town/ko" />
  <link rel="alternate" hreflang="en" href="https://shop.novera.town/en" />
  <script type="application/ld+json">{"@type":"Product"}</script>
</head><body><a href="/ko/products">목록</a></body></html>`;

const badHtml = `<html><head></head><body></body></html>`;

describe('parseSeoFromHtml', () => {
  it('canonical·hreflang·JSON-LD가 있으면 valid로 본다', () => {
    const r = parseSeoFromHtml(goodHtml);
    expect(r.canonicalValid).toBe(true);
    expect(r.hreflangValid).toBe(true);
    expect(r.jsonLdPresent).toBe(true);
  });

  it('태그가 없으면 invalid로 본다', () => {
    const r = parseSeoFromHtml(badHtml);
    expect(r.canonicalValid).toBe(false);
    expect(r.hreflangValid).toBe(false);
    expect(r.jsonLdPresent).toBe(false);
  });

  it('페이지 내 링크 href 목록을 추출한다', () => {
    const r = parseSeoFromHtml(goodHtml);
    expect(r.links).toContain('/ko/products');
  });
});
