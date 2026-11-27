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
// 홈과 같은 틀(파란 무대 + 왼쪽 슬로건 + 흰 띠)에서 오른쪽에 **겹쳐 놓은 원고 두 장**을 크게 세운다.
// 앞 장은 크림 종이(오늘의 문장 책과 같은 색)에 이야기 갈래 칩 + 큰 따옴표 + 본문 줄.
// 살짝 비뚤게 놓아 "읽을거리를 펼쳐 둔" 느낌을 낸다. 아래쪽은 흰 띠에서 잘린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '책 이야기 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const PAPER = { width: 430, height: 600 } as const;
const CREAM = '#f6efe2';
const MUTED = '#7c6f58';

/** 이야기 갈래 — 책 이야기에 실제로 올라가는 글 종류 */
const KINDS = ['독후감', '인물 관계도', '독서 통계'] as const;

/** 본문 줄 길이(%) — 마지막 줄은 짧게 끝나야 문단으로 읽힌다 */
const LINES = [100, 92, 97, 60] as const;

const Manuscript = () => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      right: STAGE_GUTTER + 10,
      top: CROP_TOP,
      width: PAPER.width,
      height: PAPER.height,
    }}
  >
    {/* 뒷장 — 오른쪽으로 기운 옅은 파랑 */}
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: 0,
        top: 0,
        width: PAPER.width,
        height: PAPER.height,
        borderRadius: 14,
        background: '#d6e6fd',
        transform: 'rotate(6deg)',
      }}
    />
    {/* 앞장 — 왼쪽으로 살짝 기운 크림 종이 */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        left: 0,
        top: 0,
        width: PAPER.width,
        height: PAPER.height,
        padding: '32px 34px 0',
        borderRadius: 14,
        background: CREAM,
        transform: 'rotate(-3deg)',
      }}
    >
      <div style={{ display: 'flex' }}>
        {KINDS.map((k, i) => (
          <div
            key={k}
            style={{
              display: 'flex',
              marginLeft: i === 0 ? 0 : 8,
              padding: '6px 14px',
              borderRadius: 16,
              background: i === 0 ? OG_COLORS.accentDeep : '#ebe2d0',
              fontSize: 18,
              fontWeight: 700,
              color: i === 0 ? OG_COLORS.paper : MUTED,
            }}
          >
            {k}
          </div>
        ))}
      </div>

      {/* 큰 따옴표 — 글 한 편이 시작되는 자리 */}
      <div
        style={{
          display: 'flex',
          marginTop: 22,
          height: 70,
          fontSize: 110,
          fontWeight: 800,
          lineHeight: 1,
          color: '#2d78db',
        }}
      >
        “
      </div>

      {LINES.map((w, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            width: `${w}%`,
            height: 14,
            marginTop: i === 0 ? 10 : 18,
            borderRadius: 7,
            background: '#e2d7c2',
          }}
        />
      ))}
    </div>
  </div>
);

const Image = () =>
  renderOg(
    <StageCard cta='책 이야기 읽기'>
      <StageSlogan lines={['책과 독서에 관한', '이야기 모음']} />
      <StageCrop>
        <Manuscript />
      </StageCrop>
    </StageCard>
  );

export default Image;
