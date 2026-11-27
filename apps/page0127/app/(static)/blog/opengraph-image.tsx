import { renderOg } from '@/shared/lib/og/render';
import {
  OBJECT_TOP,
  STAGE_CENTER,
  StageCard,
  StageCrop,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

// 책 이야기(/blog) 공유 그림 (2026-11-27)
//
// 홈과 같은 틀(파란 무대 + 위 가운데 슬로건 + 흰 띠)에서 슬로건 아래 가운데에 **인물 관계도 한 장**을 세운다
// (HJ 2026-11-27 "인물 관계도 이미지로, 참고 이미지 심플하게"). 첫 글 『대온실 수리 보고서』 관계도를
// 동그라미·선·관계 이름표 자리만 남겼다. 글자는 모두 빼고 스켈레톤(막대)으로 —
// 작아서 안 읽히는 이름보다 "관계도 모양"이 먼저 읽히게(HJ 2026-11-27 "실제 텍스트는 빼고 스켈레톤").
// 아래쪽은 흰 띠에서 잘린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '책 이야기 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** 서재 창(LibraryWindow)과 같은 폭 */
const PAPER = { width: 414, height: 600 } as const;
/** 색은 파랑 한 갈래만 — 종이는 흰색, 사람은 옅은 파랑, 주인공만 한 단계 진하게 */
const PAPER_BG = '#ffffff';
const NODE = '#d6e6fd';
const MAIN = '#93c0fb';
const SKELETON = '#e6ecf5';

type Person = {
  /** 관계도 종이 안 중심 좌표 */
  x: number;
  y: number;
  r: number;
  /** 주인공만 진하게 */
  main?: boolean;
};

/**
 * 가운데 주인공 + 네 사람. 위치를 좌우 대칭으로 맞추고 종이 가장자리에 여백을 넉넉히 둔다
 * (HJ 2026-11-27 "여백 고려, 다이어그램 좀 더 단순하게, 컬러 단순화"). 관계 이름표·무리 색면은 뺐다.
 */
const PEOPLE: readonly Person[] = [
  { x: 207, y: 185, r: 40, main: true },
  { x: 92, y: 135, r: 27 },
  { x: 322, y: 135, r: 27 },
  { x: 92, y: 260, r: 27 },
  { x: 322, y: 260, r: 27 },
];

const Node = ({ p }: { p: Person }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'absolute',
      left: p.x - 60,
      top: p.y - p.r,
      width: 120,
    }}
  >
    <div
      style={{
        display: 'flex',
        width: p.r * 2,
        height: p.r * 2,
        borderRadius: p.r,
        background: p.main ? MAIN : NODE,
      }}
    />
    {/* 이름 자리 */}
    <div
      style={{
        display: 'flex',
        width: p.main ? 60 : 44,
        height: 12,
        marginTop: 10,
        borderRadius: 6,
        background: SKELETON,
      }}
    />
  </div>
);

const RelationMap = () => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      left: STAGE_CENTER - PAPER.width / 2,
      top: OBJECT_TOP,
      width: PAPER.width,
      height: PAPER.height,
      borderRadius: 18,
      background: PAPER_BG,
    }}
  >
    {/* 선 — 주인공에서 네 사람으로. 동그라미가 위에 덮여 끝이 가려진다 */}
    <svg
      width={PAPER.width}
      height={PAPER.height}
      viewBox={`0 0 ${PAPER.width} ${PAPER.height}`}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {PEOPLE.slice(1).map((p) => (
        <line
          key={`${p.x}-${p.y}`}
          x1={PEOPLE[0].x}
          y1={PEOPLE[0].y}
          x2={p.x}
          y2={p.y}
          stroke={NODE}
          strokeWidth='3'
        />
      ))}
    </svg>

    {PEOPLE.map((p) => (
      <Node key={`${p.x}-${p.y}`} p={p} />
    ))}

    {/* 머리 — 제목 자리 */}
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 38,
        width: PAPER.width,
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 160,
          height: 20,
          borderRadius: 10,
          background: SKELETON,
        }}
      />
    </div>
  </div>
);

const Image = () =>
  renderOg(
    <StageCard cta='책 이야기 읽기'>
      <StageSlogan lines={['책과 독서에 관한', '이야기 모음']} />
      <StageCrop>
        <RelationMap />
      </StageCrop>
    </StageCard>
  );

export default Image;
