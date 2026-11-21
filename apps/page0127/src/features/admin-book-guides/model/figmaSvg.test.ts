import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { bookGuideSectionsSchema } from '@/entities/book-guide';

import { figmaSvgToPeopleSection, nearestToken, TOKEN_HEX } from './figmaSvg';

/** HJ 가 피그마에서 내보낸 『대온실 수리 보고서』 관계도 카드 4장 */
const load = (n: number) =>
  readFileSync(join(__dirname, '__fixtures__', `people-${n}.svg`), 'utf8');

const convert = (n: number) => {
  const r = figmaSvgToPeopleSection(load(n));
  if (!r.ok) throw new Error(r.message);
  return r;
};

describe('피그마 SVG → 인물관계도', () => {
  it('제목·시기·주인공(색)을 읽는다', () => {
    const { section, warnings } = convert(1);
    expect(section.title).toBe('영두 곁의 사람들');
    expect(section.era).toBe('2023 · 대온실 현장과 석모도');
    expect(section.leads.map((l) => [l.name, l.tone])).toEqual([
      ['강영두', 'primary'],
      ['은혜', 'green'],
    ]);
    expect(section.leads[1].alias).toBe('추진체');
    expect(warnings).toEqual([]);
  });

  it('회색 판 안 카드는 그 묶음 구성원, 좌표는 (100, 맨 위) 기준', () => {
    const { section } = convert(1);
    const office = section.groups.find((g) => g.name === '바위건축사사무소');
    expect(office?.members.map((m) => m.name)).toEqual([
      '연희',
      '소목(수)',
      '은세창',
      '제갈도희',
    ]);
    // 피그마 x=128 → 28
    expect(office?.box?.x).toBe(28);
  });

  it('선 끝이 닿은 상자끼리 관계, 배지 글자가 이름, 선 색이 종류', () => {
    const { section } = convert(1);
    const pairs = section.links.map((l) => [l.from, l.to, l.label, l.kind]);
    expect(pairs).toContainEqual(['강영두', '은혜', '소꿉친구', 'bond']);
    expect(pairs).toContainEqual(['은혜', '산아', '딸', 'family']);
    // 판 가장자리에 닿은 선은 묶음과의 관계
    expect(pairs).toContainEqual([
      '강영두',
      'group:바위건축사사무소',
      '동료',
      'work',
    ]);
  });

  it('갈래선(산아 → 스미·오태양)은 한 관계가 그리고 나머지는 공유', () => {
    const { section } = convert(1);
    const fork = section.links.filter((l) => l.label === '같은 반');
    expect(fork.map((l) => [l.from, l.to])).toEqual([
      ['산아', '스미'],
      ['산아', '오태양'],
    ]);
    expect(fork[0].route?.lines).toHaveLength(2);
    expect(fork[1].route?.lines).toEqual([]);
  });

  it('점선 조각들을 한 줄로 되돌린다(ㄱ자 모서리 유지)', () => {
    const { section } = convert(4);
    const link = section.links.find(
      (l) => l.from === '할머니' && l.to === '마리코 히메'
    );
    // 세로로 내려가다 오른쪽으로 꺾는 3점
    expect(link?.route?.lines[0]).toHaveLength(3);
  });

  it('범례 이름이 기본과 다르면 legend 로(기록 속 사람들: 실선=기록)', () => {
    expect(convert(3).section.legend).toEqual({ bond: '기록' });
  });

  it('4장 모두 저장 스키마를 통과한다', () => {
    const sections = [1, 2, 3, 4].map((n) => convert(n).section);
    expect(bookGuideSectionsSchema.safeParse(sections).success).toBe(true);
  });

  it('주인공 칸이 없으면(글자 윤곽선 등) 이유를 돌려준다', () => {
    const r = figmaSvgToPeopleSection(
      '<svg><rect width="10" height="10"/></svg>'
    );
    expect(r.ok).toBe(false);
  });
});

describe('피그마 색 → 토큰', () => {
  it('손으로 고른 비슷한 색은 가장 가까운 토큰으로 모인다', () => {
    expect(nearestToken('#15294d').color).toBe('text-strong');
    expect(nearestToken('#e1e6ed').color).toBe('line');
    expect(nearestToken('#6a49ee').color).toBe('chart-7');
    expect(nearestToken('#f1f3f5').color).toBe('sunken');
  });

  it('TOKEN_HEX 는 디자인 토큰 라이트 값과 같다', () => {
    const css = readFileSync(
      join(
        __dirname,
        '../../../../../../packages/design-tokens/dist/tokens.css'
      ),
      'utf8'
    );
    const root = css.slice(0, css.indexOf('}'));
    // semantic 은 primitive 를 참조하므로, 참조를 한 번 따라가 hex 를 얻는다
    const value = (name: string): string => {
      const m = root.match(new RegExp(`--${name}:\\s*([^;]+);`));
      if (!m) throw new Error(`--${name} 없음`);
      const v = m[1].trim();
      const ref = v.match(/^var\(--([\w-]+)\)$/);
      return ref ? value(ref[1]) : v.toLowerCase();
    };
    for (const [token, hex] of Object.entries(TOKEN_HEX)) {
      expect(value(token), token).toBe(hex);
    }
  });

  it('테두리 색·두께·대시와 명조 글꼴을 읽는다', () => {
    const svg = `<svg width="1080" height="1350">
<rect x="100" y="100" width="300" height="136" rx="24" fill="#1E69CB"/>
<text fill="white" font-family="Pretendard" font-size="36" font-weight="800"><tspan x="200" y="170">영두</tspan></text>
<rect x="100" y="400" width="400" height="300" rx="24" fill="#E3EEFC" stroke="#1E69CB" stroke-width="2"/>
<text font-family="Pretendard" font-size="22" font-weight="bold"><tspan x="124" y="440">묶음</tspan></text>
<rect x="114" y="460" width="200" height="100" rx="16" fill="white" stroke="#6A49EE" stroke-width="3" stroke-dasharray="8 6"/>
<text font-family="Nanum Myeongjo" font-size="26" font-weight="bold"><tspan x="130" y="500">은혜</tspan></text>
</svg>`;
    const r = figmaSvgToPeopleSection(svg);
    if (!r.ok) throw new Error(r.message);
    const group = r.section.groups[0];
    expect(group.fill).toBe('accent');
    expect(group.border).toEqual({ color: 'primary', width: 2 });
    const member = group.members[0];
    expect(member.border).toEqual({
      color: 'chart-7',
      width: 3,
      style: 'dashed',
    });
    expect(member.font).toBe('serif');
    expect(r.section.leads[0].font).toBeUndefined();
  });
});
