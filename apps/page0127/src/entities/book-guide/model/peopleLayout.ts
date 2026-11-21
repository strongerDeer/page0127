import type {
  GuideLinkKind,
  GuidePerson,
  PeopleSection,
} from './bookGuideSchema';

/**
 * 인물관계도 배치 — 데이터만 보고 "어느 그룹이 누구 밑에 매달리는가" 를 정한다.
 *
 * 왜 화면이 아니라 순수 함수인가:
 *   선 위치를 브라우저에서 재면(getBoundingClientRect) 클라이언트 JS 가 필요하고,
 *   서버 HTML 에는 선이 없다. 대신 구조(나무 모양)를 서버에서 정하고, 선은 CSS 테두리로 그린다.
 *   그러면 JS 0 바이트로 PC·모바일 모두 선이 나오고, 이 함수는 단위 테스트로 지킬 수 있다.
 *
 * 규칙:
 *   1. 중심 인물(leads)끼리의 관계 → 맨 위 두 상자를 잇는 선
 *   2. 중심 인물 ↔ 그룹 구성원 관계 → 그 그룹이 그 중심 인물 가지에 매달린다(첫 관계 기준)
 *   3. 아무 중심 인물과도 안 이어진 그룹 → 아래 "함께 나오는 사람들"(선 없음)
 *   4. 구성원끼리의 관계 → 상대 이름과 관계를 구성원 옆에 작은 배지로
 */

export type LinkRef = { label?: string; kind: GuideLinkKind };

export type AttachedGroup = {
  name: string;
  members: GuidePerson[];
  /** 가지 선에 붙는 관계 */
  link: LinkRef;
  /** 그 관계가 가리키는 구성원 — 그룹 안에서 표시한다 */
  targetId: string;
};

export type Branch = { lead: GuidePerson; groups: AttachedGroup[] };

export type MemberNote = LinkRef & { otherName: string };

export type PeopleLayout = {
  branches: Branch[];
  /** 중심 인물 둘 사이 관계 — 하나뿐이거나 관계가 없으면 null */
  leadLink: LinkRef | null;
  looseGroups: { name: string; members: GuidePerson[] }[];
  /** 구성원 id → 다른 구성원과의 관계들 */
  memberNotes: Map<string, MemberNote[]>;
};

export const buildPeopleLayout = (section: PeopleSection): PeopleLayout => {
  const leadIds = new Set(section.leads.map((l) => l.id));
  const people = new Map(
    [...section.leads, ...section.groups.flatMap((g) => g.members)].map((p) => [
      p.id,
      p,
    ])
  );
  const groupOf = new Map<string, number>();
  section.groups.forEach((g, i) =>
    g.members.forEach((m) => groupOf.set(m.id, i))
  );

  let leadLink: LinkRef | null = null;
  const anchors = new Map<
    number,
    { leadId: string; link: LinkRef; targetId: string }
  >();
  const memberNotes = new Map<string, MemberNote[]>();

  const addNote = (memberId: string, otherId: string, link: LinkRef) => {
    const otherName = people.get(otherId)?.name ?? otherId;
    memberNotes.set(memberId, [
      ...(memberNotes.get(memberId) ?? []),
      { ...link, otherName },
    ]);
  };

  for (const { from, to, label, kind } of section.links) {
    const link = { label, kind };
    const fromLead = leadIds.has(from);
    const toLead = leadIds.has(to);

    if (fromLead && toLead) {
      leadLink ??= link;
      continue;
    }
    if (fromLead || toLead) {
      const leadId = fromLead ? from : to;
      const memberId = fromLead ? to : from;
      const groupIndex = groupOf.get(memberId);
      if (groupIndex === undefined) continue;
      if (!anchors.has(groupIndex)) {
        anchors.set(groupIndex, { leadId, link, targetId: memberId });
      } else {
        // 그룹이 이미 다른 관계로 매달렸다면, 이 관계는 구성원 배지로
        addNote(memberId, leadId, link);
      }
      continue;
    }
    // 구성원끼리 — 받는 쪽(to)에 표시한다 ("스미 · 같은 반 산아")
    addNote(to, from, link);
  }

  const branches: Branch[] = section.leads.map((lead) => ({
    lead,
    groups: [],
  }));
  const looseGroups: PeopleLayout['looseGroups'] = [];

  section.groups.forEach((group, i) => {
    const anchor = anchors.get(i);
    const branch = anchor && branches.find((b) => b.lead.id === anchor.leadId);
    if (anchor && branch) {
      branch.groups.push({
        ...group,
        link: anchor.link,
        targetId: anchor.targetId,
      });
    } else {
      looseGroups.push(group);
    }
  });

  return {
    branches,
    leadLink: section.leads.length === 2 ? leadLink : null,
    looseGroups,
    memberNotes,
  };
};
