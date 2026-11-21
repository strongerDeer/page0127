import { describe, expect, it } from 'vitest';

import daeonsil from './__fixtures__/daeonsil.json';
import { bookGuideSectionsSchema, type PeopleSection } from './bookGuideSchema';
import { buildPeopleLayout } from './peopleLayout';

const sections = bookGuideSectionsSchema.parse(daeonsil);
const people = sections.filter((s): s is PeopleSection => s.type === 'people');

describe('buildPeopleLayout — 영두 곁의 사람들', () => {
  const layout = buildPeopleLayout(people[0]);

  it('중심 인물 둘을 소꿉친구 선으로 잇는다', () => {
    expect(layout.leadLink).toEqual({ label: '소꿉친구', kind: 'bond' });
  });

  it('관계가 이어진 그룹은 그 중심 인물 가지에 매달린다', () => {
    const [youngdu, eunhye] = layout.branches;
    expect(youngdu.groups.map((g) => g.name)).toEqual(['바위건축사사무소']);
    expect(youngdu.groups[0]).toMatchObject({
      link: { label: '동료', kind: 'work' },
      targetId: 'yeonhee',
    });
    expect(eunhye.groups.map((g) => g.name)).toEqual(['석모도']);
  });

  it('중심 인물과 안 이어진 그룹은 선 없이 따로 둔다', () => {
    expect(layout.looseGroups.map((g) => g.name)).toEqual(['동궐 관리청 담당']);
  });

  it('구성원끼리 관계는 받는 쪽 구성원 배지가 된다', () => {
    expect(layout.memberNotes.get('sumi')).toEqual([
      { label: '같은 반', kind: 'bond', otherName: '산아' },
    ]);
  });
});

describe('buildPeopleLayout — 배고픈 쿠마 센세이', () => {
  it('구성원 → 중심 인물 방향 관계도 가지로 잡고, 두 번째부터는 배지로 둔다', () => {
    const layout = buildPeopleLayout(people[3]);
    const hime = layout.branches[0];

    // 엄마→히메(가족 그룹 매달림), 유마→히메(같은 그룹이라 배지)
    expect(hime.groups.map((g) => g.name)).toEqual(['가족']);
    expect(layout.memberNotes.get('yuma')).toEqual([
      { label: '동생', kind: 'family', otherName: '마리코 히메' },
    ]);
    // 중심 인물끼리 관계가 없으면 선도 없다
    expect(layout.leadLink).toBeNull();
  });
});
