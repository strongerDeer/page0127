import { cn } from '@repo/ui';

import { buildCanvasLayout } from '../model/canvasLayout';

import type {
  GuideBorder,
  GuideColor,
  GuideFont,
  GuideLinkKind,
  GuideTone,
  PeopleSection,
} from '../model/bookGuideSchema';
import type { CanvasNode } from '../model/canvasLayout';
import type { CSSProperties } from 'react';

import styles from './CanvasPeople.module.css';

/**
 * 캔버스 모드 관계도 — 좌표대로 상자를 놓고 SVG 로 선을 긋는다 (서버 컴포넌트, JS 0)
 *
 * 쌓는 순서: 회색 판 → 선(SVG) → 사람 상자 → 관계 배지
 * 선이 판 위·상자 아래로 지나가서, 상자 가장자리에서 선이 끝나 보인다.
 * 이름·설명·관계는 전부 HTML 글자라 검색엔진이 읽는다(SVG 는 선 모양만).
 */

/**
 * 색·크기는 피그마 컴포넌트(1080 카드)와 같은 값 — 사이트는 이 그림을 통째로 줄여 보여 준다.
 * 색은 디자인 시스템 짝으로만 — 다크 모드·대비는 토큰이 책임진다.
 */
const toneClass: Record<GuideTone, { box: string; role: string }> = {
  primary: {
    box: 'bg-primary text-primary-foreground',
    role: 'text-primary-foreground',
  },
  green: {
    box: 'bg-guide-green text-on-guide-green',
    role: 'text-on-guide-green opacity-80',
  },
  outline: {
    box: 'border-4 border-guide-green bg-card text-text-strong',
    role: 'text-text-subtle',
  },
  white: { box: 'bg-card text-text-strong', role: 'text-text-subtle' },
  line: {
    box: 'border-2 border-line bg-card text-text-strong',
    role: 'text-text-subtle',
  },
  sunken: { box: 'bg-sunken text-text-strong', role: 'text-text-subtle' },
};

/** 관계 종류 → 선 색·모양. 실선=인연, 점선=가족, 파선=일 */
const lineClass: Record<GuideLinkKind, string> = {
  bond: 'stroke-primary',
  family: 'stroke-chart-7',
  work: 'stroke-text-body',
};
const lineDash: Record<GuideLinkKind, string | undefined> = {
  bond: undefined,
  // 0 길이 + round cap = 동그란 점선
  family: '0 10',
  work: '13 9',
};
const badgeClass: Record<GuideLinkKind, string> = {
  bond: 'border-primary text-primary',
  // 글자는 text-body — 보라(chart-7)는 다크 카드 위 글자 대비가 4.5 에 못 미친다. 테두리만 보라
  family: 'border-chart-7 text-text-body',
  work: 'border-text-body text-text-body',
};

/** 토큰 이름 → CSS 변수. 팔레트(GUIDE_COLORS) 밖 값은 스키마가 막는다 */
const tokenColor = (color: GuideColor) => `var(--${color})`;

/** 테두리가 있으면 tone 의 기본 테두리(클래스)를 인라인 값이 덮는다 */
const borderStyle = (border?: GuideBorder): CSSProperties =>
  border
    ? {
        borderColor: tokenColor(border.color),
        borderWidth: border.width,
        borderStyle: border.style ?? 'solid',
      }
    : {};

/** 명조는 시스템 글꼴만 — 내려받는 웹폰트 없음(스키마 GUIDE_FONTS 주석 참고) */
const SERIF_STACK =
  '"AppleMyungjo", "Noto Serif KR", "Nanum Myeongjo", "Batang", serif';
const fontStyle = (font?: GuideFont): CSSProperties =>
  font === 'serif' ? { fontFamily: SERIF_STACK } : {};

const rectStyle = ({ rect }: Pick<CanvasNode, 'rect'>) => ({
  left: rect.x,
  top: rect.y,
  width: rect.w,
  height: rect.h,
});

const PersonBox = ({
  node,
  canvasFont,
}: {
  node: CanvasNode;
  canvasFont?: GuideFont;
}) => {
  const tone = toneClass[node.tone];
  const { person } = node;
  const font = person.font ?? canvasFont;
  return (
    <div
      className={cn(
        'absolute flex flex-col',
        node.isLead && 'justify-center',
        node.isLead
          ? // 주인공 칸만 떠 있는 그림자(피그마 drop shadow 와 같은 값). 글자는 가운데
            'items-center rounded-3xl px-5 text-center shadow-[0_16px_40px_rgb(20_41_78/0.14)]'
          : // 구성원: 글자 기준 여백을 모든 카드에 똑같이 — 위 18·왼쪽 16 에서 시작(위쪽 맞춤).
            // 가운데 맞춤이면 설명 줄 수·카드 높이에 따라 글자 위치가 카드마다 달라진다.
            // 치수는 canvasLayout 의 MEMBER_* 와 같은 값
            'justify-start rounded-2xl px-4 py-[18px]',
        tone.box
      )}
      style={{
        ...rectStyle(node),
        ...borderStyle(person.border),
        ...fontStyle(font),
      }}
    >
      <p
        className={cn(
          // 글자는 줄바꿈 없이(피그마와 같은 줄 수) — 데이터의 \n 만 줄을 바꾼다.
          // p 에 직접 건다: 전역 p 스타일(pre-wrap)이 부모 값을 덮는다
          'whitespace-pre',
          node.isLead
            ? 'text-[36px] leading-tight font-extrabold tracking-[-0.01em]'
            : 'text-[26px] leading-8 font-bold'
        )}
      >
        {person.name}
        {person.alias && (
          <span className='text-base font-normal'>({person.alias})</span>
        )}
      </p>
      {person.role && (
        <p
          className={cn(
            'mt-1 whitespace-pre',
            node.isLead
              ? 'text-[22px] leading-snug font-medium'
              : 'text-xl leading-7',
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

  const canvasFont = section.canvas?.font;
  const background = section.canvas?.background;

  return (
    <div
      className={cn('relative', background?.image && styles.lightScope)}
      style={{
        width: layout.width,
        height: layout.height,
        backgroundColor: background?.color
          ? tokenColor(background.color)
          : undefined,
        ...fontStyle(canvasFont),
      }}
    >
      {background?.image && (
        // 꾸밈 그림 — 글자는 전부 HTML 이라 alt 비움. next/image 는 캔버스 zoom 과 겹쳐 크기 계산이 어긋나 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={background.image}
          alt=''
          aria-hidden='true'
          loading='lazy'
          decoding='async'
          className={cn(
            'pointer-events-none absolute inset-0 size-full select-none',
            background.fit === 'contain' ? 'object-contain' : 'object-cover'
          )}
          style={{ opacity: background.opacity ?? 1 }}
        />
      )}
      {layout.panels.map((panel) => (
        <div
          key={panel.key}
          className='absolute rounded-2xl bg-sunken'
          style={{
            ...rectStyle(panel),
            backgroundColor: panel.fill ? tokenColor(panel.fill) : undefined,
            ...borderStyle(panel.border),
          }}
        >
          {/* 왼쪽 30 = 판 안쪽 여백(14) + 카드 글자 여백(16) — 묶음 이름과 카드 글자가 한 줄에 선다 */}
          <h4 className='px-[30px] pt-5 text-[22px] font-bold whitespace-nowrap text-text-body'>
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
        {layout.lines.flatMap((line) =>
          line.lines.map((points, j) => (
            <polyline
              key={`${line.key}-${j}`}
              points={points.map((p) => p.join(',')).join(' ')}
              fill='none'
              strokeWidth={3}
              strokeLinecap={line.kind === 'family' ? 'round' : 'butt'}
              strokeLinejoin='round'
              strokeDasharray={lineDash[line.kind]}
              className={lineClass[line.kind]}
            />
          ))
        )}
      </svg>

      {layout.nodes.map((node) => (
        <PersonBox key={node.person.id} node={node} canvasFont={canvasFont} />
      ))}

      {layout.lines.map(
        (line) =>
          line.label &&
          line.badge && (
            <span
              key={line.key}
              className={cn(
                'absolute flex h-8 -translate-x-1/2 -translate-y-1/2 items-center rounded-full border-2 bg-card px-3.5 text-[19px] font-bold whitespace-nowrap',
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
