import { OBJECT_TOP, STAGE_CENTER } from './StageCard';
import { OG_COLORS } from './theme';

/**
 * 서재 창 — 홈·소개 등 브랜드 카드의 주인공 (⚠️ satori 전용)
 *
 * 링크 하나로 열리는 서재를 작은 브라우저 창으로 보여 준다. 무대 가운데에 세우고
 * 창 아래쪽은 흰 띠에서 자른다 — 쓰는 쪽(BrandStage)이 StageCrop 으로 감싼다.
 *
 * 책장은 책등 사이사이에 표지가 보이게 세운 책을 섞는다(HJ 2026-11-27 "책등이랑 섞어서").
 * 책등만이면 막대그래프처럼 읽히고(2026-10-07), 표지만이면 책장 느낌이 안 난다.
 * 숫자는 Z 를 곱해 한 번에 키우고 줄인다(2026-11-27 가운데 정렬 때 0.9배).
 */
const Z = 0.9;
const z = (n: number) => Math.round(n * Z);

const WINDOW_WIDTH = z(460);

type ShelfItem =
  | { kind: 'spine'; w: number; h: number; c: string }
  | { kind: 'cover'; bg: string; bar: string };
const SHELF: readonly ShelfItem[] = [
  { kind: 'spine', w: 30, h: 150, c: '#0a2f6e' },
  { kind: 'spine', w: 26, h: 168, c: '#93c0fb' },
  { kind: 'cover', bg: '#f6efe2', bar: '#2d78db' },
  { kind: 'spine', w: 34, h: 140, c: '#14294e' },
  { kind: 'spine', w: 26, h: 160, c: '#5b9ff5' },
  { kind: 'cover', bg: '#2d78db', bar: '#ffffff' },
  { kind: 'spine', w: 30, h: 155, c: '#d6e6fd' },
  { kind: 'spine', w: 26, h: 145, c: '#0455bf' },
];
const COVER = { width: z(98), height: z(150) } as const;
const SHELF_GAP = z(5);
/** 가장 큰 책 높이 — 선반 칸의 높이 */
const SHELF_HEIGHT = z(170);

export const LibraryWindow = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      left: STAGE_CENTER - WINDOW_WIDTH / 2,
      top: OBJECT_TOP,
      width: WINDOW_WIDTH,
      height: z(600),
      borderRadius: z(18),
      background: OG_COLORS.paper,
      overflow: 'hidden',
    }}
  >
    {/* 주소 막대 — 링크 하나로 열린다는 것 */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: z(62),
        padding: `0 ${z(20)}px`,
        background: '#eef3fb',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            width: z(12),
            height: z(12),
            marginRight: z(7),
            borderRadius: z(6),
            background: '#c9d6ea',
          }}
        />
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          height: z(36),
          marginLeft: z(10),
          padding: `0 ${z(16)}px`,
          borderRadius: z(18),
          background: OG_COLORS.paper,
          fontSize: z(20),
          fontWeight: 600,
          color: OG_COLORS.inkSoft,
        }}
      >
        page0127.com/
        <span style={{ color: OG_COLORS.accentDeep, fontWeight: 700 }}>
          reader
        </span>
      </div>
    </div>

    {/* 서재 주인 */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: `${z(26)}px ${z(28)}px ${z(22)}px`,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: z(56),
          height: z(56),
          borderRadius: z(28),
          background: '#d6e6fd',
        }}
      />
      <div
        style={{ display: 'flex', flexDirection: 'column', marginLeft: z(16) }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: z(26),
            fontWeight: 800,
            color: OG_COLORS.ink,
            letterSpacing: -0.5,
          }}
        >
          나의 서재
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 2,
            fontSize: z(19),
            fontWeight: 600,
            color: OG_COLORS.inkSoft,
          }}
        >
          다 읽은 책
          <span style={{ color: OG_COLORS.accentDeep, marginLeft: z(6) }}>
            23권
          </span>
        </div>
      </div>
    </div>

    {/* 책장 — 책등과 표지를 섞어 바닥선에 세운다. 창 아래는 흰 띠에서 잘린다 */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: `0 ${z(28)}px`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          height: SHELF_HEIGHT,
        }}
      >
        {SHELF.map((item, i) =>
          item.kind === 'spine' ? (
            <div
              key={i}
              style={{
                display: 'flex',
                width: z(item.w),
                height: z(item.h),
                marginLeft: i === 0 ? 0 : SHELF_GAP,
                borderRadius: '4px 4px 0 0',
                background: item.c,
              }}
            />
          ) : (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                ...COVER,
                marginLeft: i === 0 ? 0 : SHELF_GAP,
                padding: z(12),
                borderRadius: '6px 6px 0 0',
                background: item.bg,
                border: '1.5px solid rgba(20, 41, 78, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '80%',
                  height: z(8),
                  borderRadius: 4,
                  background: item.bar,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  width: '50%',
                  height: z(8),
                  marginTop: z(6),
                  borderRadius: 4,
                  background: item.bar,
                  opacity: 0.6,
                }}
              />
            </div>
          )
        )}
      </div>
      {/* 선반 */}
      <div
        style={{
          display: 'flex',
          height: z(10),
          borderRadius: 3,
          background: '#c9d6ea',
        }}
      />
    </div>
  </div>
);
