import { renderOg } from '@/shared/lib/og/render';
import {
  CROP_TOP,
  STAGE_GUTTER,
  StageCard,
  StageCrop,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

// 서비스 소개(/about) 공유 그림 (2026-11-27)
//
// 홈과 같은 틀(파란 무대 + 왼쪽 슬로건 + 흰 띠)에서 오른쪽에 **링크로 열린 내 서재 창**(책등+표지 섞인 책장)을
// 크게 키워 세운다. 아래쪽은 흰 띠에서 잘려 책장이 계속 이어지는 것처럼 보인다.
// 소개의 한 줄("링크 하나로 내 책장을 보여 준다")을 그림으로 옮겼다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '서비스 소개 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const WINDOW_WIDTH = 460;

/**
 * 서재 창 속 책장 — 책등 사이사이에 표지가 보이게 세운 책을 섞는다(HJ 2026-11-27 "책등이랑 섞어서").
 * 책등만이면 막대그래프처럼 읽히고(2026-10-07), 표지만이면 책장 느낌이 안 난다.
 * 표지 책은 판형(2:3)에 제목 띠 두 줄. 바닥에 선반 한 줄을 깐다.
 */
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
const COVER = { width: 98, height: 150 } as const;
const SHELF_GAP = 5;
/** 가장 큰 책 높이 — 선반 칸의 높이 */
const SHELF_HEIGHT = 170;

const LibraryWindow = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      right: STAGE_GUTTER,
      top: CROP_TOP,
      width: WINDOW_WIDTH,
      height: 600,
      borderRadius: 18,
      background: OG_COLORS.paper,
      overflow: 'hidden',
    }}
  >
    {/* 주소 막대 — 링크 하나로 열린다는 것 */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 62,
        padding: '0 20px',
        background: '#eef3fb',
      }}
    >
      {['#c9d6ea', '#c9d6ea', '#c9d6ea'].map((c, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            width: 12,
            height: 12,
            marginRight: 7,
            borderRadius: 6,
            background: c,
          }}
        />
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          height: 36,
          marginLeft: 10,
          padding: '0 16px',
          borderRadius: 18,
          background: OG_COLORS.paper,
          fontSize: 20,
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
        padding: '26px 28px 22px',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 56,
          height: 56,
          borderRadius: 28,
          background: '#d6e6fd',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 16 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
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
            fontSize: 19,
            fontWeight: 600,
            color: OG_COLORS.inkSoft,
          }}
        >
          다 읽은 책
          <span style={{ color: OG_COLORS.accentDeep, marginLeft: 6 }}>
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
        padding: '0 28px',
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
                width: item.w,
                height: item.h,
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
                width: COVER.width,
                height: COVER.height,
                marginLeft: i === 0 ? 0 : SHELF_GAP,
                padding: 12,
                borderRadius: '6px 6px 0 0',
                background: item.bg,
                border: '1.5px solid rgba(20, 41, 78, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '80%',
                  height: 8,
                  borderRadius: 4,
                  background: item.bar,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  width: '50%',
                  height: 8,
                  marginTop: 6,
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
          height: 10,
          borderRadius: 3,
          background: '#c9d6ea',
        }}
      />
    </div>
  </div>
);

const Image = () =>
  renderOg(
    <StageCard cta='서비스 소개 보기'>
      <StageSlogan lines={['읽은 책이 쌓여', '책장이 됩니다']} />
      <StageCrop>
        <LibraryWindow />
      </StageCrop>
    </StageCard>
  );

export default Image;
