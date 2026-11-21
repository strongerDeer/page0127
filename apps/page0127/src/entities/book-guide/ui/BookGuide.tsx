import { cn } from '@repo/ui';

import { CanvasPeople } from './CanvasPeople';
import { ZoomableDiagram } from './ZoomableDiagram';

import type {
  BookGuideSection,
  GuideLinkKind,
  PeopleSection,
  PlacesSection,
  TimelineSection,
} from '../model/types';

/**
 * 읽기 가이드 — 책 정보 페이지 본문에 붙는 칸 (서버 컴포넌트, 브라우저 JS 없음)
 *
 * 왜 이미지가 아니라 HTML 로 그리나:
 *   같은 내용이 인스타에는 이미지로 나가지만, 여기서는 검색엔진이 읽어야 한다.
 *   이름·관계·연도가 전부 HTML 글자라 "대온실 수리 보고서 인물관계도" 같은 검색에 걸린다.
 *   관계선은 SVG 로, 이름·관계는 HTML 글자로 그린다(CanvasPeople).
 */

const linkKindLabel: Record<GuideLinkKind, string> = {
  bond: '인연',
  family: '가족',
  work: '일',
};

/** 범례 선 모양 — 관계도 선과 같은 약속(실선·점선·파선) */
const linkBorder: Record<GuideLinkKind, string> = {
  bond: 'border-solid',
  family: 'border-dotted',
  work: 'border-dashed',
};

const lineColor: Record<GuideLinkKind, string> = {
  bond: 'border-primary',
  family: 'border-chart-7',
  work: 'border-text-body',
};
const lineStyle = (kind: GuideLinkKind) =>
  cn(lineColor[kind], linkBorder[kind]);

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
  return (
    <ZoomableDiagram label={section.title}>
      <CanvasPeople section={section} />
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
