import { OG_COLORS } from './theme';

/**
 * 선반 위 책장 — 홈·소개 등 브랜드 카드의 주인공 (⚠️ satori 전용)
 *
 * 책등(위·아래 띠 + 세로 제목 줄), 앞을 보는 표지 두 권, 끝에 기댄 책 한 권을 선반에 세운다
 * (HJ 2026-11-27 시안 v2 "책장" 선택 — 홈·소개 같은 그림, 글자만 다르게).
 * 예전 색 막대 책 무리는 막대그래프처럼 보여 뺐다. 띠·제목 줄이 있어야 "책"으로 읽힌다.
 *
 * 선반은 무대 바닥선에 붙는다. 기댄 책은 회전하지만 바닥선 위라 흰 띠로 삐져나오지 않는다.
 */
type Item =
  | { kind: 'spine'; w: number; h: number; c: string; band: string }
  | { kind: 'cover'; bg: string; ink: string };

const SHELF: readonly Item[] = [
  { kind: 'spine', w: 30, h: 176, c: '#0a2f6e', band: OG_COLORS.mint },
  { kind: 'spine', w: 24, h: 196, c: '#ffffff', band: '#93c0fb' },
  { kind: 'cover', bg: '#f6efe2', ink: '#2d78db' },
  { kind: 'spine', w: 34, h: 186, c: '#14294e', band: '#d6e6fd' },
  { kind: 'spine', w: 26, h: 164, c: '#93c0fb', band: '#0a2f6e' },
  { kind: 'spine', w: 30, h: 200, c: '#d6e6fd', band: '#2d78db' },
  { kind: 'cover', bg: '#ffffff', ink: '#14294e' },
];
const LEANING = { w: 28, h: 178, c: '#0f1f3d', band: '#93c0fb' } as const;
const COVER = { width: 112, height: 168 } as const;
const GAP = 5;

const Spine = ({
  w,
  h,
  c,
  band,
}: {
  w: number;
  h: number;
  c: string;
  band: string;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: w,
      height: h,
      paddingTop: 14,
      borderRadius: '4px 4px 1px 1px',
      background: c,
    }}
  >
    <div
      style={{ display: 'flex', width: '100%', height: 5, background: band }}
    />
    {/* 세로 제목 줄 */}
    <div
      style={{
        display: 'flex',
        width: 5,
        height: Math.round(h * 0.32),
        marginTop: 14,
        borderRadius: 3,
        background: band,
        opacity: 0.75,
      }}
    />
    <div style={{ display: 'flex', flex: 1 }} />
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: 5,
        marginBottom: 14,
        background: band,
      }}
    />
  </div>
);

const FrontCover = ({ bg, ink }: { bg: string; ink: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      ...COVER,
      padding: 14,
      borderRadius: '6px 6px 1px 1px',
      background: bg,
    }}
  >
    <div
      style={{
        display: 'flex',
        width: 20,
        height: 20,
        borderRadius: 10,
        background: ink,
        opacity: 0.85,
      }}
    />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          width: '85%',
          height: 8,
          borderRadius: 4,
          background: ink,
        }}
      />
      <div
        style={{
          display: 'flex',
          width: '55%',
          height: 8,
          marginTop: 6,
          borderRadius: 4,
          background: ink,
          opacity: 0.55,
        }}
      />
    </div>
  </div>
);

export const BookShelf = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: '100%',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
      {SHELF.map((item, i) => (
        <div key={i} style={{ display: 'flex', marginLeft: i === 0 ? 0 : GAP }}>
          {item.kind === 'spine' ? (
            <Spine {...item} />
          ) : (
            <FrontCover bg={item.bg} ink={item.ink} />
          )}
        </div>
      ))}
      {/* 기댄 책 — 아래 오른쪽 모서리를 축으로 왼쪽 책 쪽으로 눕힌다 */}
      <div
        style={{
          display: 'flex',
          marginLeft: 30,
          transform: 'rotate(-12deg)',
          transformOrigin: 'bottom right',
        }}
      >
        <Spine {...LEANING} />
      </div>
    </div>
    {/* 선반 — 무대 바닥선에 붙인다 */}
    <div
      style={{
        display: 'flex',
        width: 560,
        height: 14,
        borderRadius: '4px 4px 0 0',
        background: '#c9d6ea',
      }}
    />
  </div>
);
