import { parse } from 'node-html-parser';

import type { SeoMetrics } from './types';

export type SeoParseResult = Omit<
  SeoMetrics,
  'sitemapOk' | 'robotsOk' | 'brokenLinks'
> & {
  links: string[];
};

export const parseSeoFromHtml = (html: string): SeoParseResult => {
  const root = parse(html);
  const canonical = root.querySelector('link[rel="canonical"]');
  const hreflangs = root.querySelectorAll('link[rel="alternate"][hreflang]');
  const jsonLd = root.querySelector('script[type="application/ld+json"]');
  const links = root
    .querySelectorAll('a[href]')
    .map((a) => a.getAttribute('href') ?? '')
    .filter(Boolean);

  return {
    canonicalValid: Boolean(canonical?.getAttribute('href')),
    hreflangValid: hreflangs.length > 0,
    jsonLdPresent: Boolean(jsonLd?.textContent?.trim()),
    links,
  };
};

export const checkUrlOk = async (url: string): Promise<boolean> => {
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (head.ok) return true;
    // 일부 서버는 HEAD에 405/403을 주지만 GET은 정상 → GET으로 재확인
    if (head.status === 405 || head.status === 403) {
      const get = await fetch(url, { method: 'GET', redirect: 'follow' });
      return get.ok;
    }
    return false;
  } catch {
    return false;
  }
};

export const measureSeo = async (
  origin: string,
  html: string
): Promise<SeoMetrics> => {
  const parsed = parseSeoFromHtml(html);
  const [sitemapOk, robotsOk] = await Promise.all([
    checkUrlOk(`${origin}/sitemap.xml`),
    checkUrlOk(`${origin}/robots.txt`),
  ]);

  const internal = parsed.links
    .filter((h) => h.startsWith('/') || h.startsWith(origin))
    .slice(0, 20)
    .map((h) => (h.startsWith('/') ? `${origin}${h}` : h));
  const results = await Promise.all(internal.map((u) => checkUrlOk(u)));
  const brokenLinks = results.filter((ok) => !ok).length;

  return {
    hreflangValid: parsed.hreflangValid,
    canonicalValid: parsed.canonicalValid,
    jsonLdPresent: parsed.jsonLdPresent,
    sitemapOk,
    robotsOk,
    brokenLinks,
  };
};
