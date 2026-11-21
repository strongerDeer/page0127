import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { hasBookGuide, loadBookGuide } from '../guides';
import { daeonsilSections } from '../guides/daeonsil.data';
import { BookGuide } from './BookGuide';

/**
 * 이 칸의 존재 이유는 검색엔진이 읽는 것이다 — 그래서 "글자로 나오는가" 를 지킨다.
 */
describe('BookGuide', () => {
  const html = renderToStaticMarkup(<BookGuide sections={daeonsilSections} />);

  it('인물 이름·관계·연표·장소가 HTML 글자로 나온다', () => {
    expect(html).toContain('강영두');
    expect(html).toContain('낙원하숙');
  });

  it('선은 SVG, 관계는 화면 낭독기용 문장으로도 나온다', () => {
    expect(html).toContain('<polyline');
    expect(html).toContain('안문자 — 손녀 — 리사');
  });

  it('테두리·글꼴·배경은 토큰 CSS 변수로 그린다(hex 없음)', () => {
    const people = structuredClone(daeonsilSections[0]);
    if (people.type !== 'people') throw new Error('관계도가 아님');
    people.leads[0].border = { color: 'chart-7', width: 3, style: 'dashed' };
    people.leads[0].font = 'serif';
    people.canvas = {
      ...people.canvas,
      background: { color: 'accent', image: '/a.webp', opacity: 0.3 },
    };
    const out = renderToStaticMarkup(<BookGuide sections={[people]} />);
    expect(out).toContain('border-color:var(--chart-7)');
    expect(out).toContain('border-style:dashed');
    expect(out).toContain('AppleMyungjo');
    expect(out).toContain('background-color:var(--accent)');
    // 꾸밈 그림 — 검색·낭독기에는 안 읽히게
    expect(out).toMatch(/<img[^>]*alt=""[^>]*aria-hidden="true"/);
  });
});

describe('책별 가이드 찾기', () => {
  it('ISBN 으로 그 책 파일을 불러온다', async () => {
    expect(hasBookGuide('9788936439651')).toBe(true);
    expect(await loadBookGuide('9788936439651')).toBeTypeOf('function');
  });

  it('가이드 없는 책·빈 ISBN 은 null', async () => {
    expect(hasBookGuide('0000000000000')).toBe(false);
    expect(await loadBookGuide(null)).toBeNull();
  });
});
