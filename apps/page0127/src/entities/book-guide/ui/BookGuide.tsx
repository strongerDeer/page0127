import { cn } from '@repo/ui';

import type {
  BookGuideSection,
  GuideLinkKind,
  GuidePerson,
  PeopleSection,
  PlacesSection,
  TimelineSection,
} from '../model/bookGuideSchema';

/**
 * 읽기 가이드 — 책 정보 페이지 본문에 붙는 칸 (서버 컴포넌트, 브라우저 JS 없음)
 *
 * 왜 그림이 아니라 글자로 그리나:
 *   같은 내용이 인스타에는 이미지로 나가지만, 여기서는 검색엔진이 읽어야 한다.
 *   이름·관계·연도가 전부 HTML 글자라 "대온실 수리 보고서 인물관계도" 같은 검색에 걸린다.
 *   휴대폰 폭에서 선 그림은 글씨가 작아지므로 그룹 목록 + 관계 배지로 푼다.
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

const PeopleBlock = ({ section }: { section: PeopleSection }) => {
  const people = new Map(
    [...section.leads, ...section.groups.flatMap((g) => g.members)].map((p) => [
      p.id,
      p,
    ])
  );
  const usedKinds = [...new Set(section.links.map((l) => l.kind))];

  return (
    <>
      {/* 중심 인물 — 큰 면은 tint 로(쨍한 채움 X) */}
      <ul className='grid gap-2 sm:grid-cols-2'>
        {section.leads.map((person) => (
          <li
            key={person.id}
            className='flex flex-col gap-0.5 rounded-xl bg-primary/10 px-4 py-3'
          >
            <PersonName person={person} onTint />
          </li>
        ))}
      </ul>

      {section.groups.length > 0 && (
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {section.groups.map((group) => (
            <div key={group.name} className='rounded-xl bg-sunken px-4 py-3'>
              <h4 className='text-sm font-medium text-text-subtle'>
                {group.name}
              </h4>
              <ul className='mt-2 flex flex-col gap-1.5'>
                {group.members.map((person) => (
                  <li key={person.id} className='flex flex-wrap gap-x-2'>
                    <PersonName person={person} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {section.links.length > 0 && (
        <div>
          <h4 className='text-sm font-medium text-text-subtle'>관계</h4>
          {/* "강영두 – 소꿉친구 – 은혜" 를 한 줄씩. 문장으로도 읽히게 배지에 sr 텍스트를 단다 */}
          <ul className='mt-2 flex flex-wrap gap-x-5 gap-y-2'>
            {section.links.map((link) => (
              <li
                key={`${link.from}-${link.to}-${link.label}`}
                className='flex items-center gap-1.5 text-sm text-text-body'
              >
                <span>{people.get(link.from)?.name}</span>
                <span
                  className={cn(
                    'rounded-full border-[1.5px] border-primary px-2 text-xs font-bold text-primary',
                    linkBorder[link.kind]
                  )}
                >
                  <span className='sr-only'>(</span>
                  {link.label}
                  <span className='sr-only'>)</span>
                </span>
                <span>{people.get(link.to)?.name}</span>
              </li>
            ))}
          </ul>
          {usedKinds.length > 1 && (
            <p className='mt-2 flex gap-3 text-xs text-text-subtle'>
              {usedKinds.map((kind) => (
                <span key={kind} className='flex items-center gap-1'>
                  <span
                    aria-hidden='true'
                    className={cn(
                      'inline-block w-5 border-t-2 border-primary',
                      linkBorder[kind]
                    )}
                  />
                  {linkKindLabel[kind]}
                </span>
              ))}
            </p>
          )}
        </div>
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
