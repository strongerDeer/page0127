import { Card, cn } from '@repo/ui';

import { buildPeopleLayout } from '../model/peopleLayout';
import { CanvasPeople } from './CanvasPeople';
import { ZoomableDiagram } from './ZoomableDiagram';

import type {
  BookGuideSection,
  GuideLinkKind,
  GuidePerson,
  PeopleSection,
  PlacesSection,
  TimelineSection,
} from '../model/bookGuideSchema';
import type { Branch, LinkRef, MemberNote } from '../model/peopleLayout';

/**
 * 읽기 가이드 — 책 정보 페이지 본문에 붙는 칸 (서버 컴포넌트, 브라우저 JS 없음)
 *
 * 왜 이미지가 아니라 HTML 로 그리나:
 *   같은 내용이 인스타에는 이미지로 나가지만, 여기서는 검색엔진이 읽어야 한다.
 *   이름·관계·연도가 전부 HTML 글자라 "대온실 수리 보고서 인물관계도" 같은 검색에 걸린다.
 *   관계선은 CSS 테두리로 그린다 — 배치(누가 누구 밑에)는 buildPeopleLayout 이 서버에서 정한다.
 */

/** 관계 종류 → 배지 테두리 모양. 카드의 선 모양(실선·점선·파선)과 같은 약속이다 */
const linkBorder: Record<GuideLinkKind, string> = {
  bond: 'border-solid',
  family: 'border-dotted',
  work: 'border-dashed',
};

const linkKindLabel: Record<GuideLinkKind, string> = {
  bond: '인연',
  family: '가족',
  work: '일',
};

type PersonNameProps = {
  person: GuidePerson;
  /** accent 면 위 — 시스템이 짝지어 둔 accent-foreground 로(subtle 은 4.4 로 대비 미달이었다) */
  onTint?: boolean;
};

const PersonName = ({ person, onTint = false }: PersonNameProps) => (
  <>
    <span className={cn('font-bold', !onTint && 'text-text-strong')}>
      {person.name}
    </span>
    {person.role && (
      <span
        className={cn(
          'text-sm',
          onTint ? 'text-accent-foreground' : 'text-text-subtle'
        )}
      >
        {person.role}
      </span>
    )}
  </>
);

/** 선 한 줄의 모양 — 관계 종류마다 실선·점선·파선 */
const lineColor: Record<GuideLinkKind, string> = {
  bond: 'border-primary',
  family: 'border-chart-7',
  work: 'border-text-body',
};
const lineStyle = (kind: GuideLinkKind) =>
  cn(lineColor[kind], linkBorder[kind]);

const LinkBadge = ({
  link,
  className,
}: {
  link: LinkRef;
  className?: string;
}) => (
  <span
    className={cn(
      // 색은 시스템이 대비를 검산해 둔 accent 짝(ReadCountBadge 와 같은 이유 — 임의 투명도 X)
      'whitespace-nowrap rounded-full border border-accent-foreground bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground',
      linkBorder[link.kind],
      className
    )}
  >
    {link.label}
  </span>
);

type GroupCardProps = {
  name: string;
  members: GuidePerson[];
  targetId?: string;
  notes: Map<string, MemberNote[]>;
};

const GroupCard = ({ name, members, targetId, notes }: GroupCardProps) => (
  <Card className='gap-2 px-4 py-3'>
    <h4 className='text-sm font-medium text-text-subtle'>{name}</h4>
    <ul className='flex flex-col gap-1.5'>
      {members.map((person) => (
        <li key={person.id} className='flex flex-wrap items-center gap-x-2'>
          {/* 가지 선이 가리키는 사람 — 이름 앞 점으로 표시 */}
          {person.id === targetId && (
            <span
              aria-hidden='true'
              className='size-1.5 shrink-0 rounded-full bg-primary'
            />
          )}
          <PersonName person={person} />
          {notes.get(person.id)?.map((note) => (
            <span
              key={`${note.otherName}-${note.label}`}
              className='flex items-center gap-1 text-xs text-text-body'
            >
              <LinkBadge link={note} />
              {note.otherName}
            </span>
          ))}
        </li>
      ))}
    </ul>
  </Card>
);

/**
 * 가지 — 중심 인물 아래로 내려오는 선(rail)에 그룹이 매달린다.
 * 선은 CSS 테두리라 JS 없이 서버 HTML 에 그대로 있다.
 * side: 왼쪽 인물은 왼쪽 선, 오른쪽 인물은 오른쪽 선(카드의 좌우 대칭과 같은 그림).
 */
const BranchGroups = ({
  branch,
  side,
  notes,
}: {
  branch: Branch;
  side: 'left' | 'right';
  notes: Map<string, MemberNote[]>;
}) => (
  <ul className={side === 'left' ? 'ml-6' : 'mr-6'}>
    {branch.groups.map((group, i) => {
      const isLast = i === branch.groups.length - 1;
      return (
        <li
          key={group.name}
          className={cn('relative pt-9', side === 'left' ? 'pl-6' : 'pr-6')}
        >
          {/* 세로선 — 마지막 그룹에서는 가로 눈금까지만 */}
          <span
            aria-hidden='true'
            className={cn(
              'absolute top-0 border-l-2',
              side === 'left' ? 'left-0' : 'right-0',
              isLast ? 'h-13' : 'bottom-0',
              lineStyle(group.link.kind)
            )}
          />
          {/* 가로 눈금 — 선에서 그룹 상자로 */}
          <span
            aria-hidden='true'
            className={cn(
              'absolute top-13 w-6 border-t-2',
              side === 'left' ? 'left-0' : 'right-0',
              lineStyle(group.link.kind)
            )}
          />
          <LinkBadge
            link={group.link}
            className={cn(
              'absolute top-2',
              side === 'left'
                ? 'left-0 -translate-x-1/2'
                : 'right-0 translate-x-1/2'
            )}
          />
          <GroupCard
            name={group.name}
            members={group.members}
            targetId={group.targetId}
            notes={notes}
          />
        </li>
      );
    })}
  </ul>
);

const LeadBox = ({ person }: { person: GuidePerson }) => (
  <div className='flex min-h-22 flex-col items-center justify-center gap-0.5 rounded-xl bg-accent px-3 py-3 text-center text-accent-foreground'>
    <PersonName person={person} onTint />
  </div>
);

const LinkLegend = ({ section }: { section: PeopleSection }) => {
  const usedKinds = [...new Set(section.links.map((l) => l.kind))];
  return (
    <>
      {usedKinds.length > 1 && (
        <p className='flex gap-3 text-xs text-text-subtle'>
          {usedKinds.map((kind) => (
            <span key={kind} className='flex items-center gap-1'>
              <span
                aria-hidden='true'
                className={cn('inline-block w-5 border-t-2', lineStyle(kind))}
              />
              {section.legend?.[kind] ?? linkKindLabel[kind]}
            </span>
          ))}
        </p>
      )}
    </>
  );
};

const PeopleBlock = ({ section }: { section: PeopleSection }) => {
  // 좌표가 적힌 관계도 — 인스타 카드와 같은 그림을 그대로
  if (section.canvas) {
    return (
      <ZoomableDiagram label={section.title}>
        <CanvasPeople section={section} />
        <LinkLegend section={section} />
      </ZoomableDiagram>
    );
  }

  const layout = buildPeopleLayout(section);
  const [left, right] = layout.branches;
  const rightHasGroups = Boolean(right && right.groups.length > 0);

  return (
    <ZoomableDiagram label={section.title}>
      {/* 1. 중심 인물 — 둘이면 가운데 관계선으로 잇는다 */}
      <div
        className={cn(
          'grid items-stretch',
          right ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1 max-w-xs'
        )}
      >
        <LeadBox person={left.lead} />
        {right && (
          <>
            <div className='relative flex w-24 items-center justify-center self-stretch'>
              {layout.leadLink && (
                <>
                  <span
                    aria-hidden='true'
                    className={cn(
                      'absolute inset-x-0 top-1/2 border-t-2',
                      lineStyle(layout.leadLink.kind)
                    )}
                  />
                  <LinkBadge link={layout.leadLink} className='relative' />
                </>
              )}
            </div>
            <LeadBox person={right.lead} />
          </>
        )}
      </div>

      {/* 2. 가지 — 두 갈래를 나란히. 좁은 화면은 그림 전체를 줄인다(ZoomableDiagram) */}
      {(left.groups.length > 0 || rightHasGroups) && (
        <div className='-mt-4 grid grid-cols-2 gap-6'>
          <BranchGroups branch={left} side='left' notes={layout.memberNotes} />
          {right && rightHasGroups && (
            <BranchGroups
              branch={right}
              side='right'
              notes={layout.memberNotes}
            />
          )}
        </div>
      )}

      {/* 3. 중심 인물과 직접 이어지지 않은 그룹 — 선 없이 */}
      {layout.looseGroups.length > 0 && (
        <div className='grid grid-cols-2 gap-2'>
          {layout.looseGroups.map((group) => (
            <GroupCard
              key={group.name}
              name={group.name}
              members={group.members}
              notes={layout.memberNotes}
            />
          ))}
        </div>
      )}

      <LinkLegend section={section} />
    </ZoomableDiagram>
  );
};

const TimelineBlock = ({ section }: { section: TimelineSection }) => (
  <ol className='flex flex-col gap-3 border-l-2 border-line pl-4'>
    {section.items.map((item) => (
      <li key={`${item.when}-${item.title}`}>
        <p className='text-sm font-bold text-primary tabular-nums'>
          {item.when}
        </p>
        <p className='font-bold text-text-strong'>{item.title}</p>
        {item.note && <p className='text-sm text-text-subtle'>{item.note}</p>}
      </li>
    ))}
  </ol>
);

const PlacesBlock = ({ section }: { section: PlacesSection }) => (
  <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
    {section.routes.map((route) => (
      <div key={route.label} className='rounded-xl bg-sunken px-4 py-3'>
        <h4 className='text-sm font-bold text-primary'>{route.label}</h4>
        <ol className='mt-2 flex list-inside list-decimal flex-col gap-1 marker:text-text-subtle'>
          {route.stops.map((stop) => (
            <li key={stop.name}>
              <span className='font-bold text-text-strong'>{stop.name}</span>
              {stop.note && (
                <span className='ml-1.5 text-sm text-text-subtle'>
                  {stop.note}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    ))}
  </div>
);

const sectionKindLabel: Record<BookGuideSection['type'], string> = {
  people: '인물관계도',
  timeline: '연표',
  places: '산책 코스',
};

const SectionBody = ({ section }: { section: BookGuideSection }) => {
  // 판별 유니온 — case 안에서 section 의 타입이 정확히 좁혀진다
  switch (section.type) {
    case 'people':
      return <PeopleBlock section={section} />;
    case 'timeline':
      return <TimelineBlock section={section} />;
    case 'places':
      return <PlacesBlock section={section} />;
  }
};

const sectionSubtitle = (section: BookGuideSection) =>
  section.type === 'people' ? section.era : section.subtitle;

type BookGuideProps = {
  sections: BookGuideSection[];
};

export const BookGuide = ({ sections }: BookGuideProps) => (
  <section
    aria-labelledby='book-guide-heading'
    className='border-t border-line pt-6'
  >
    <h2 id='book-guide-heading' className='heading-2'>
      읽기 가이드
    </h2>
    <p className='mt-1 text-sm text-text-subtle'>
      스포일러 없이 초반 설정만 담았어요.
    </p>

    <div className='mt-5 flex flex-col gap-8'>
      {sections.map((section, i) => {
        const subtitle = sectionSubtitle(section);
        return (
          <article
            key={`${section.type}-${section.title}`}
            aria-labelledby={`book-guide-${i}`}
            className='flex flex-col gap-3'
          >
            <header>
              <p className='text-xs font-bold text-primary'>
                {sectionKindLabel[section.type]}
              </p>
              <h3
                id={`book-guide-${i}`}
                className='text-lg font-bold text-text-strong'
              >
                {section.title}
              </h3>
              {subtitle && (
                <p className='text-sm text-text-subtle'>{subtitle}</p>
              )}
            </header>
            <SectionBody section={section} />
          </article>
        );
      })}
    </div>
  </section>
);
