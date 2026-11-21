import { cn } from '@repo/ui';

import { buildCanvasLayout } from '../model/canvasLayout';

import type {
  GuideLinkKind,
  GuideTone,
  PeopleSection,
} from '../model/bookGuideSchema';
import type { CanvasNode } from '../model/canvasLayout';

/**
 * 캔버스 모드 관계도 — 좌표대로 상자를 놓고 SVG 로 선을 긋는다 (서버 컴포넌트, JS 0)
 *
 * 쌓는 순서: 회색 판 → 선(SVG) → 사람 상자 → 관계 배지
 * 선이 판 위·상자 아래로 지나가서, 상자 가장자리에서 선이 끝나 보인다.
 * 이름·설명·관계는 전부 HTML 글자라 검색엔진이 읽는다(SVG 는 선 모양만).
 */

/** 색은 디자인 시스템 짝으로만 — 다크 모드·대비는 토큰이 책임진다 */
const toneClass: Record<GuideTone, { box: string; role: string }> = {
  primary: {
    box: 'bg-primary text-primary-foreground',
    role: 'text-primary-foreground',
  },
  mint: { box: 'bg-mint text-on-mint', role: 'text-on-mint' },
  outline: {
    box: 'border-2 border-mint bg-card text-text-strong',
    role: 'text-text-subtle',
  },
  plain: {
    box: 'border border-line-soft bg-card text-text-strong',
    role: 'text-text-subtle',
  },
};

/** 관계 종류 → 선 색·모양. 실선=인연, 점선=가족, 파선=일 */
const lineClass: Record<GuideLinkKind, string> = {
  bond: 'stroke-primary',
  family: 'stroke-chart-7',
  work: 'stroke-text-subtle',
};
const lineDash: Record<GuideLinkKind, string | undefined> = {
  bond: undefined,
  // 0 길이 + round cap = 동그란 점선
  family: '0 6',
  work: '6 4',
};
const badgeClass: Record<GuideLinkKind, string> = {
  bond: 'border-solid border-primary text-primary',
  // 글자는 text-body — 보라(chart-7)는 다크 카드 위 글자 대비가 4.5 에 못 미친다. 선·테두리만 보라
  family: 'border-dotted border-chart-7 text-text-body',
  work: 'border-dashed border-text-subtle text-text-subtle',
};

const rectStyle = ({ rect }: Pick<CanvasNode, 'rect'>) => ({
  left: rect.x,
  top: rect.y,
  width: rect.w,
  height: rect.h,
});

const PersonBox = ({ node }: { node: CanvasNode }) => {
  const tone = toneClass[node.tone];
  const { person } = node;
  return (
    <div
      className={cn(
        'absolute flex flex-col justify-center overflow-hidden',
        node.isLead
          ? 'items-center rounded-2xl px-4 text-center'
          : 'rounded-xl px-3',
        tone.box
      )}
      style={rectStyle(node)}
    >
      <p
        className={cn(
          'leading-tight font-bold',
          node.isLead ? 'text-xl' : 'text-base'
        )}
      >
        {person.name}
        {person.alias && (
          <span className='ml-0.5 text-xs font-medium'>({person.alias})</span>
        )}
      </p>
      {person.role && (
        <p
          className={cn(
            'mt-0.5 leading-snug',
            node.isLead ? 'text-sm' : 'text-xs',
            tone.role
          )}
        >
          {person.role}
        </p>
      )}
    </div>
  );
};

export const CanvasPeople = ({ section }: { section: PeopleSection }) => {
  const layout = buildCanvasLayout(section);
  const nameOf = new Map(
    [
      ...section.leads,
      ...section.groups.flatMap((g) => g.members),
      ...section.groups.map((g) => ({ id: g.id ?? '', name: g.name })),
    ].map((p) => [p.id, p.name])
  );

  return (
    <div
      className='relative'
      style={{ width: layout.width, height: layout.height }}
    >
      {layout.panels.map((panel) => (
        <div
          key={panel.key}
          className='absolute rounded-2xl bg-sunken'
          style={rectStyle(panel)}
        >
          <h4 className='px-3 pt-3 text-sm font-bold text-text-strong'>
            {panel.name}
          </h4>
        </div>
      ))}

      <svg
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 overflow-visible'
        width={layout.width}
        height={layout.height}
      >
        {layout.lines.map((line) => (
          <polyline
            key={line.key}
            points={line.points.map((p) => p.join(',')).join(' ')}
            fill='none'
            strokeWidth={2}
            strokeLinecap={line.kind === 'family' ? 'round' : 'butt'}
            strokeDasharray={lineDash[line.kind]}
            className={lineClass[line.kind]}
          />
        ))}
      </svg>

      {layout.nodes.map((node) => (
        <PersonBox key={node.person.id} node={node} />
      ))}

      {layout.lines.map(
        (line) =>
          line.label && (
            <span
              key={line.key}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] bg-card px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
                badgeClass[line.kind]
              )}
              style={{ left: line.badge[0], top: line.badge[1] }}
            >
              {line.label}
            </span>
          )
      )}

      {/* 선은 눈으로만 보인다 — 화면 낭독기·검색엔진에는 "누가 누구와 무슨 관계" 를 글로 */}
      <ul className='sr-only'>
        {section.links.map((link, i) => (
          <li key={`${link.from}-${link.to}-${i}`}>
            {nameOf.get(link.from)} — {link.label ?? '관계'} —{' '}
            {nameOf.get(link.to)}
          </li>
        ))}
      </ul>
    </div>
  );
};
