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
// 홈과 같은 틀(파란 무대 + 왼쪽 슬로건 + 흰 띠)에서 오른쪽에 **링크로 열린 내 서재 창**을
// 크게 키워 세운다. 아래쪽은 흰 띠에서 잘려 책장이 계속 이어지는 것처럼 보인다.
// 소개의 한 줄("링크 하나로 내 책장을 보여 준다")을 그림으로 옮겼다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '서비스 소개 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const WINDOW_WIDTH = 460;

/**
 * 서재 창 속 표지 — 3권씩 줄. 책등(막대)으로 세우면 막대그래프처럼 읽혀서(2026-10-07 피드백)
 * 표지 판형(2:3)에 제목 띠를 얹어 "책"으로 읽히게 한다. 두 번째 줄은 흰 띠에서 잘린다.
 */
const COVERS = [
  { bg: '#0a2f6e', bar: '#93c0fb' },
  { bg: '#f6efe2', bar: '#2d78db' },
  { bg: '#2d78db', bar: '#ffffff' },
  { bg: '#d6e6fd', bar: '#0455bf' },
  { bg: '#14294e', bar: '#f6efe2' },
  { bg: '#5b9ff5', bar: '#0a2f6e' },
] as const;
const COVER = { width: 124, height: 186, gap: 16 } as const;

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

    {/* 책장 — 표지 3권씩, 아래 줄은 흰 띠에서 잘린다 */}
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        padding: '0 28px',
      }}
    >
      {COVERS.map((c, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            width: COVER.width,
            height: COVER.height,
            marginLeft: i % 3 === 0 ? 0 : COVER.gap,
            marginBottom: COVER.gap,
            padding: 14,
            borderRadius: 8,
            background: c.bg,
            border: '1.5px solid rgba(20, 41, 78, 0.08)',
          }}
        >
          {/* 제목 띠 두 줄 */}
          <div
            style={{
              display: 'flex',
              width: '80%',
              height: 9,
              borderRadius: 5,
              background: c.bar,
            }}
          />
          <div
            style={{
              display: 'flex',
              width: '50%',
              height: 9,
              marginTop: 7,
              borderRadius: 5,
              background: c.bar,
              opacity: 0.6,
            }}
          />
        </div>
      ))}
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
