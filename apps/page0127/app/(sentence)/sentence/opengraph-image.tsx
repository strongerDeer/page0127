import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';
import { renderOg } from '@/shared/lib/og/render';
import {
  COVER_OVERHANG,
  STAGE_GUTTER,
  STAGE_HEIGHT,
  StageCard,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

// 오늘의 문장(/sentence) 링크 미리보기 (2026-11-27)
//
// 홈 카드(BrandStage)와 같은 틀 — 파란 무대 + 왼쪽 슬로건 + 흰 띠 — 에서
// 오른쪽 책 무리 대신 **랜딩의 당근 꽂힌 책**(크림 문고판 + 위로 삐죽 나온 당근)을 세운다(HJ 2026-11-27).
// 받는 사람이 미리보기만 보고도 "책에서 당근을 뽑는 곳"으로 알아보게.
// 랜딩 표지(SentenceBook.module.css)의 색·문구를 옮겼다. 책은 무대 바닥선에 걸쳐 선다(표지 카드와 같은 문법).
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '오늘의 문장 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** 문고판 판형 — 무대(480) 안에 당근까지 들어가는 높이 */
const BOOK = { width: 300, height: 400 } as const;
/** 책 오른쪽 끝 — 무대 오른쪽 여백과 맞춘다 */
const BOOK_RIGHT = STAGE_GUTTER + 40;
/** 당근 — 책 위 오른쪽에서 몸통 절반이 책 뒤로 숨는다 */
const CARROT = { width: 84, height: 137 } as const;

const COLORS = {
  cream: '#f6efe2',
  spine: '#ebe2d0',
  ink: '#14294e',
  blue: '#2d78db',
  muted: '#7c6f58',
} as const;

/** features/daily-sentence/ui/CarrotSvg 의 평면 당근(잎 셋 + 몸통 + 광) — shared 는 features 를 못 불러 옮겨 둔다 */
const Carrot = () => (
  <svg width={CARROT.width} height={CARROT.height} viewBox='0 0 60 98'>
    <rect
      x='11'
      y='11'
      width='18'
      height='29'
      rx='9'
      transform='rotate(-12 20 38)'
      fill='#2f8f4e'
    />
    <rect
      x='31'
      y='11'
      width='18'
      height='29'
      rx='9'
      transform='rotate(12 40 38)'
      fill='#2f8f4e'
    />
    <rect x='21' y='5' width='18' height='35' rx='9' fill='#38a05a' />
    <path
      d='M30 30 C49 30 57 38 57 51 C57 68 46 82 38 89 C34 92.5 26 92.5 22 89 C14 82 3 68 3 51 C3 38 11 30 30 30 Z'
      fill='#f2862b'
    />
    <path
      d='M14 41 C16 37.5 19 35.5 23 35'
      stroke='#ffffff'
      strokeWidth='2.6'
      fill='none'
      strokeLinecap='round'
      opacity='0.4'
    />
  </svg>
);

/** 랜딩 표지 — 왼쪽 책등 띠 + 제목 두 줄('한 줄'만 파랑) + 부제 + 오른쪽 위 심볼 */
const CarrotBook = () => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      right: BOOK_RIGHT,
      bottom: -COVER_OVERHANG,
      width: BOOK.width,
      height: BOOK.height + CARROT.height / 2,
    }}
  >
    {/* 당근 먼저 — satori 는 뒤에 그린 것이 위에 온다. 아래 절반은 책에 가려진다 */}
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        top: 0,
        right: 38,
      }}
    >
      <Carrot />
    </div>

    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: BOOK.width,
        height: BOOK.height,
        borderRadius: 6,
        background: COLORS.cream,
        boxShadow: '0 14px 30px rgba(4, 30, 80, 0.35)',
        overflow: 'hidden',
      }}
    >
      {/* 책등 쪽 띠 */}
      <div
        style={{
          display: 'flex',
          width: 22,
          height: '100%',
          background: COLORS.spine,
          borderRight: '1px solid rgba(20, 41, 78, 0.08)',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '30px 22px 0 22px',
          color: COLORS.ink,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <BrandSymbol size={40} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 6,
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.3,
            letterSpacing: -1,
          }}
        >
          <div style={{ display: 'flex' }}>책 사이에 끼워 둔</div>
          <div style={{ display: 'flex' }}>
            오늘의
            <span style={{ color: COLORS.blue, marginLeft: 9 }}>한 줄</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 14,
            fontSize: 17,
            fontWeight: 500,
            color: COLORS.muted,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 20,
              marginRight: 10,
              borderTop: `1.5px solid ${COLORS.muted}`,
            }}
          />
          하루 한 번, 당근을 뽑아요
        </div>
      </div>
    </div>
  </div>
);

const Image = () =>
  renderOg(
    <StageCard cta='오늘의 문장 뽑기'>
      {/* 슬로건 — 왼쪽, 무대 안에서 세로 가운데. 홈 카드(BrandStage)와 같은 자리·크기 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'absolute',
          left: STAGE_GUTTER,
          top: 0,
          height: STAGE_HEIGHT,
          fontSize: 80,
          fontWeight: 800,
          color: OG_COLORS.paper,
          letterSpacing: -2.5,
          lineHeight: 1.2,
        }}
      >
        <div>당근을 뽑으면,</div>
        <div>오늘의 한 문장</div>
      </div>
      <CarrotBook />
    </StageCard>
  );

export default Image;
