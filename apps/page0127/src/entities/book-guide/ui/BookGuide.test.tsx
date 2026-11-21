import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import daeonsil from '../model/__fixtures__/daeonsil.json';
import { bookGuideSectionsSchema } from '../model/bookGuideSchema';
import { BookGuide } from './BookGuide';

/**
 * 이 칸의 존재 이유는 검색엔진이 읽는 것이다 — 그래서 "글자로 나오는가" 를 지킨다.
 */
describe('BookGuide', () => {
  const sections = bookGuideSectionsSchema.parse(daeonsil);
  const html = renderToStaticMarkup(<BookGuide sections={sections} />);

  it('인물 이름·관계·연표·장소가 HTML 글자로 나온다', () => {
    expect(html).toContain('강영두');
    expect(html).toContain('소꿉친구');
    expect(html).toContain('1909');
    expect(html).toContain('깡통만두');
  });

  it('섹션 제목은 h3, 칸 제목은 h2 — 책 소개와 같은 위계', () => {
    expect(html).toContain('<h2 id="book-guide-heading"');
    expect(html.match(/<h3 /g)).toHaveLength(sections.length);
  });

  it('관계 종류를 선 모양으로 구분한다(가족=점선, 일=파선)', () => {
    expect(html).toContain('border-dotted');
    expect(html).toContain('border-dashed');
  });

  it('캔버스 모드: 선은 SVG, 관계는 화면 낭독기용 문장으로도 나온다', () => {
    expect(html).toContain('<polyline');
    expect(html).toContain('안문자 — 손녀 — 리사');
  });

  it('테두리·글꼴·배경은 토큰 CSS 변수로 그린다(hex 없음)', () => {
    const people = structuredClone(sections[0]);
    if (people.type !== 'people') throw new Error('관계도가 아님');
    people.leads[0].border = { color: 'chart-7', width: 3, style: 'dashed' };
    people.leads[0].font = 'serif';
    people.canvas = {
      ...people.canvas,
      background: {
        color: 'accent',
        image:
          'https://example.supabase.co/storage/v1/object/public/banner-art/guide/a.webp',
        opacity: 0.3,
      },
    };
    const out = renderToStaticMarkup(
      <BookGuide sections={bookGuideSectionsSchema.parse([people])} />
    );
    expect(out).toContain('border-color:var(--chart-7)');
    expect(out).toContain('border-style:dashed');
    expect(out).toContain('AppleMyungjo');
    expect(out).toContain('background-color:var(--accent)');
    // 꾸밈 그림 — 검색·낭독기에는 안 읽히게
    expect(out).toMatch(/<img[^>]*alt=""[^>]*aria-hidden="true"/);
    expect(out).toContain('opacity:0.3');
  });

  it('팔레트 밖 색·외부 프로토콜은 스키마가 막는다', () => {
    const people = structuredClone(daeonsil[0]) as Record<string, unknown>;
    const bad = (patch: object) =>
      bookGuideSectionsSchema.safeParse([{ ...people, ...patch }]).success;
    expect(bad({ canvas: { background: { color: '#ff0000' } } })).toBe(false);
    expect(
      bad({ canvas: { background: { image: 'javascript:alert(1)' } } })
    ).toBe(false);
  });
});
