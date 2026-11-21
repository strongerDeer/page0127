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
});
