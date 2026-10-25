import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { VisitorChemiCard, VisitorSignupBanner } from './VisitorCta';

describe('VisitorChemiCard', () => {
  it('책이 없거나 5권 미만인 서재는 케미 초대를 숨긴다', () => {
    for (const eligibleBookCount of [0, 4]) {
      expect(
        renderToStaticMarkup(
          <VisitorChemiCard
            name='reader'
            username='reader'
            photoUrl={null}
            eligibleBookCount={eligibleBookCount}
          />
        )
      ).toBe('');
    }
  });
  it('주인 아바타와 "나(?)"가 겹친 그림 + 파란 버튼, 케미 페이지로 연결', () => {
    const html = renderToStaticMarkup(
      <VisitorChemiCard
        name='stronger_khj'
        username='stronger_khj'
        eligibleBookCount={5}
        photoUrl={null}
      />
    );
    expect(html).toContain('stronger_khj님과 나, 독서 케미는?');
    expect(html).toContain('href="/stronger_khj/compatibility"');
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
