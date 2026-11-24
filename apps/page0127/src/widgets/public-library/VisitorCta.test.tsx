import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { VisitorSignupBanner } from './VisitorCta';

describe('VisitorSignupBanner', () => {
  const covers = Array.from({ length: 5 }, (_, i) =>
    createTestBook({
      title: `책 ${i + 1}`,
      cover_image: `https://x.test/${i}.jpg`,
    })
  );

  it('주인 책장의 표지 3장을 부채꼴로 + "내 책" 자리', () => {
    const html = renderToStaticMarkup(
      <VisitorSignupBanner name='stronger_khj' covers={covers} />
    );
    expect(html).toContain('나도 내 책장 만들기');
    expect((html.match(/data-fan-cover/g) ?? []).length).toBe(3);
    expect(html).toContain('내 책');
    expect(html).toContain('href="/"');
  });

  it('표지가 없으면 부채꼴 없이 문구만', () => {
    const html = renderToStaticMarkup(
      <VisitorSignupBanner name='stronger_khj' covers={[]} />
    );
    expect(html).not.toContain('data-fan-cover');
    expect(html).toContain('내 책장 만들기');
  });
});
