import { renderOg } from '@/shared/lib/og/render';
import {
  CROP_TOP,
  STAGE_GUTTER,
  StageCard,
  StageCrop,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

// 책 이야기(/blog) 공유 그림 (2026-11-27)
//
// 홈과 같은 틀(파란 무대 + 왼쪽 슬로건 + 흰 띠)에서 오른쪽에 **인물 관계도 한 장**을 크게 세운다
// (HJ 2026-11-27 "인물 관계도 이미지로, 참고 이미지 심플하게"). 첫 글 『대온실 수리 보고서』 관계도를
// 동그라미·선·관계 이름표만 남겨 줄였다 — 얼굴 그림 대신 이름 첫 글자. 아래쪽은 흰 띠에서 잘린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '책 이야기 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const PAPER = { width: 470, height: 600 } as const;
const CREAM = '#f6efe2';
const MUTED = '#7c6f58';
const LINE = '#2d4f8f';

type Person = {
  name: string;
  /** 관계도 종이 안 중심 좌표 */
  x: number;
  y: number;
  r: number;
  bg: string;
};

/** 가운데 주인공과 둘레 사람들 — 참고 관계도에서 가까운 사이만 골랐다 */
const PEOPLE = {
  center: { name: '강영두', x: 235, y: 145, r: 42, bg: '#d6e6fd' },
  eunhye: { name: '은혜', x: 72, y: 115, r: 28, bg: '#f2dcc6' },
  sana: { name: '산아', x: 72, y: 235, r: 28, bg: '#ead9ee' },
  sechang: { name: '은세창', x: 398, y: 125, r: 28, bg: '#dfe6d2' },
  munja: { name: '안문자', x: 235, y: 285, r: 36, bg: '#ead9ee' },
  risa: { name: '리사', x: 398, y: 285, r: 28, bg: '#d6e6fd' },
} satisfies Record<string, Person>;

/** 선 + 가운데 이름표 */
const LINKS: readonly {
  from: keyof typeof PEOPLE;
  to: keyof typeof PEOPLE;
  label: string;
  /** 이름표를 선 가운데에서 아래로 내리는 거리 — 위 사람 이름과 겹칠 때 */
  dy?: number;
}[] = [
  { from: 'center', to: 'eunhye', label: '소꿉친구' },
  { from: 'center', to: 'sana', label: '이야기 친구' },
  { from: 'center', to: 'sechang', label: '동료' },
  { from: 'center', to: 'munja', label: '하숙집', dy: 22 },
  { from: 'munja', to: 'risa', label: '손녀' },
];

/**
 * 수채 번짐 대신 옅은 색 타원 — 참고 관계도의 무리(동네)를 색 면으로만 남긴다.
 * radial-gradient 로 번지게 하면 satori 가 가장자리를 검게 섞어 얼룩이 진다.
 */
const Wash = ({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}) => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: '50%',
      background: color,
    }}
  />
);

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
        alignItems: 'center',
        justifyContent: 'center',
        width: p.r * 2,
        height: p.r * 2,
        borderRadius: p.r,
        background: p.bg,
        border: '3px solid #ffffff',
        fontSize: p.r * 0.8,
        fontWeight: 800,
        color: OG_COLORS.ink,
      }}
    >
      {p.name[0]}
    </div>
    <div
      style={{
        display: 'flex',
        marginTop: 4,
        // 이름 뒤에 종이색을 깔아, 이름을 지나가는 선을 가린다
        padding: '0 6px',
        borderRadius: 6,
        background: CREAM,
        fontSize: p.r > 30 ? 23 : 19,
        fontWeight: 800,
        color: OG_COLORS.ink,
        letterSpacing: -0.5,
      }}
    >
      {p.name}
    </div>
  </div>
);

const RelationMap = () => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      right: STAGE_GUTTER,
      top: CROP_TOP,
      width: PAPER.width,
      height: PAPER.height,
      borderRadius: 14,
      background: CREAM,
      overflow: 'hidden',
    }}
  >
    <Wash x={400} y={140} w={170} h={150} color='rgba(196, 214, 240, 0.5)' />
    <Wash x={300} y={310} w={320} h={150} color='rgba(214, 222, 196, 0.55)' />

    {/* 선 — 사람 동그라미 중심끼리 잇는다. 동그라미가 위에 덮여 끝이 가려진다 */}
    <svg
      width={PAPER.width}
      height={PAPER.height}
      viewBox={`0 0 ${PAPER.width} ${PAPER.height}`}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {LINKS.map(({ from, to }) => (
        <line
          key={`${from}-${to}`}
          x1={PEOPLE[from].x}
          y1={PEOPLE[from].y}
          x2={PEOPLE[to].x}
          y2={PEOPLE[to].y}
          stroke={LINE}
          strokeWidth='2'
        />
      ))}
    </svg>

    {Object.values(PEOPLE).map((p) => (
      <Node key={p.name} p={p} />
    ))}

    {/* 관계 이름표 — 선 가운데 */}
    {LINKS.map(({ from, to, label, dy = 0 }) => (
      <div
        key={label}
        style={{
          display: 'flex',
          position: 'absolute',
          left: (PEOPLE[from].x + PEOPLE[to].x) / 2 - 60,
          top: (PEOPLE[from].y + PEOPLE[to].y) / 2 - 14 + dy,
          width: 120,
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            padding: '3px 10px',
            borderRadius: 12,
            background: CREAM,
            fontSize: 15,
            fontWeight: 700,
            color: LINE,
          }}
        >
          {label}
        </div>
      </div>
    ))}

    {/* 머리 — 책 제목 + 인물 관계도 */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        left: 0,
        top: 22,
        width: PAPER.width,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 24,
          fontWeight: 800,
          color: OG_COLORS.accentDeep,
          letterSpacing: -0.5,
        }}
      >
        대온실 수리 보고서
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 2,
          fontSize: 16,
          fontWeight: 600,
          color: MUTED,
        }}
      >
        인물 관계도
      </div>
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
