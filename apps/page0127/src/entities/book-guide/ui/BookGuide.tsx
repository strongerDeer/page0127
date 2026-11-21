import { cn } from '@repo/ui';

import { buildPeopleLayout } from '../model/peopleLayout';

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
  /** tint 면 위에서는 subtle 이 대비 4.5:1 에 못 미쳐(4.4) 한 단계 진한 body 를 쓴다 */
  onTint?: boolean;
};

const PersonName = ({ person, onTint = false }: PersonNameProps) => (
  <>
    <span className='font-bold text-text-strong'>{person.name}</span>
    {person.role && (
      <span
        className={cn(
          'text-sm',
          onTint ? 'text-text-body' : 'text-text-subtle'
        )}
      >
        {person.role}
      </span>
    )}
  </>
);

/** 선 한 줄의 모양 — 관계 종류마다 실선·점선·파선 */
const lineStyle = (kind: GuideLinkKind) =>
  cn('border-primary', linkBorder[kind]);

const LinkBadge = ({
  link,
  className,
}: {
  link: LinkRef;
  className?: string;
}) => (
  <span
    className={cn(
      'whitespace-nowrap rounded-full border-[1.5px] bg-card px-2 text-xs font-bold leading-5 text-primary',
      lineStyle(link.kind),
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
  <div className='rounded-xl bg-sunken px-4 py-3'>
    <h4 className='text-sm font-medium text-text-subtle'>{name}</h4>
    <ul className='mt-2 flex flex-col gap-1.5'>
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
  </div>
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
              isLast ? 'h-[3.25rem]' : 'bottom-0',
              lineStyle(group.link.kind)
            )}
          />
          {/* 가로 눈금 — 선에서 그룹 상자로 */}
          <span
            aria-hidden='true'
            className={cn(
              'absolute top-[3.25rem] w-6 border-t-2',
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
  <div className='flex min-h-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-xl bg-primary/10 px-3 py-3 text-center'>
    <PersonName person={person} onTint />
  </div>
);

const PeopleBlock = ({ section }: { section: PeopleSection }) => {
  const layout = buildPeopleLayout(section);
  const [left, right] = layout.branches;
  const usedKinds = [...new Set(section.links.map((l) => l.kind))];
  const rightHasGroups = Boolean(right && right.groups.length > 0);

  return (
    <>
      {/* 1. 중심 인물 — 둘이면 가운데 관계선으로 잇는다 */}
      <div
        className={cn(
          'grid items-stretch',
          right ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1 sm:max-w-xs'
        )}
      >
        <LeadBox person={left.lead} />
        {right && (
          <>
            <div className='relative flex w-14 items-center justify-center self-stretch sm:w-24'>
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

      {/* 2. 가지 — PC 는 두 갈래 나란히, 모바일은 세로로 이어 붙인다.
          모바일에서 오른쪽 가지 선은 왼쪽 가지 옆을 지나 내려간다(통과선) */}
      {(left.groups.length > 0 || rightHasGroups) && (
        <div className='-mt-3 grid sm:grid-cols-2 sm:gap-6'>
          <div className={cn('relative', rightHasGroups && 'pr-12 sm:pr-0')}>
            {rightHasGroups && (
              <span
                aria-hidden='true'
                className={cn(
                  'absolute top-0 right-6 bottom-0 border-r-2 sm:hidden',
                  lineStyle(right.groups[0].link.kind)
                )}
              />
            )}
            <BranchGroups
              branch={left}
              side='left'
              notes={layout.memberNotes}
            />
          </div>
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
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
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

      {usedKinds.length > 1 && (
        <p className='flex gap-3 text-xs text-text-subtle'>
          {usedKinds.map((kind) => (
            <span key={kind} className='flex items-center gap-1'>
              <span
                aria-hidden='true'
                className={cn('inline-block w-5 border-t-2', lineStyle(kind))}
              />
              {linkKindLabel[kind]}
            </span>
          ))}
        </p>
      )}
    </>
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
