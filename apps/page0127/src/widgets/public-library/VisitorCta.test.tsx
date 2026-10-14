import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { VisitorChemiCard, VisitorSignupBanner } from './VisitorCta';

describe('VisitorChemiCard', () => {
  it('주인 아바타와 "나(?)"가 겹친 그림 + 파란 버튼, 문구·링크는 그대로', () => {
    const html = renderToStaticMarkup(
      <VisitorChemiCard name='stronger_khj' photoUrl={null} />
    );
    expect(html).toContain('stronger_khj님과 나, 독서 케미는?');
    expect(html).toContain('href="/"');
    expect(html).toContain('data-chemi-duo');
    // 사진이 없으면 이름 첫 글자
    expect(html).toMatch(/data-owner-avatar[^>]*>S</);
    expect(html).toContain('케미 알아보기');
  });
});

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
