import { describe, expect, it } from 'vitest';

import {
  fitRect,
  moveGroupBox,
  movePerson,
  toCanvas,
  updatePerson,
} from './editPeopleSection';

import type { PeopleSection } from '@/entities/book-guide';

const section: PeopleSection = {
  type: 'people',
  title: '테스트',
  leads: [{ id: 'a', name: '가' }],
  groups: [
    {
      name: '묶음',
      box: { x: 0, y: 160, w: 200 },
      members: [
        { id: 'b', name: '나' },
        { id: 'c', name: '다', at: { x: 20, y: 200, w: 100 } },
      ],
    },
  ],
  links: [],
  canvas: {},
};

describe('편집기 데이터 바꾸기', () => {
  it('격자(8px)에 맞추고 캔버스 밖으로 못 나간다', () => {
    expect(fitRect({ x: 870, y: -5, w: 101, h: 50 })).toEqual({
      x: 776,
      y: 0,
      w: 104,
      h: 48,
    });
  });

  it('사람을 옮기면 at 이 생기고 원본은 그대로', () => {
    const next = movePerson(section, 'b', { x: 300, y: 300, w: 120, h: 56 });
    expect(next.groups[0].members[0].at).toEqual({
      x: 304,
      y: 304,
      w: 120,
      h: 56,
    });
    expect(section.groups[0].members[0].at).toBeUndefined();
  });

  it('판을 옮기면 자리 가진 구성원도 같이 따라온다', () => {
    const next = moveGroupBox(section, 0, { x: 80, y: 160, w: 200, h: 200 });
    expect(next.groups[0].members[1].at).toMatchObject({ x: 100, y: 200 });
  });

  it('undefined 로 지운 필드는 JSON 에서 빠진다', () => {
    const next = updatePerson(section, 'c', { at: undefined });
    expect('at' in next.groups[0].members[1]).toBe(false);
  });

  it('자동 배치 관계도를 캔버스로 바꾸면 판 자리가 생긴다', () => {
    const auto: PeopleSection = {
      ...section,
      canvas: undefined,
      groups: [{ name: '묶음', members: [{ id: 'b', name: '나' }] }],
    };
    const next = toCanvas(auto);
    expect(next.canvas).toEqual({});
    expect(next.groups[0].box).toMatchObject({ x: 0, y: 160 });
  });
});
