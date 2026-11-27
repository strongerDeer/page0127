import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';
import { renderOg } from '@/shared/lib/og/render';
import {
  OBJECT_TOP,
  STAGE_CENTER,
  STAGE_HEIGHT,
  StageCard,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

// 오늘의 문장(/sentence) 링크 미리보기 (2026-11-27)
//
// 홈 카드(BrandStage)와 같은 틀 — 파란 무대 + 위 가운데 슬로건 + 흰 띠 — 에서
// 슬로건 아래 가운데에 **랜딩의 당근 꽂힌 책**(크림 문고판 + 위로 삐죽 나온 당근)을 세운다(HJ 2026-11-27).
// 받는 사람이 미리보기만 보고도 "책에서 당근을 뽑는 곳"으로 알아보게.
// 랜딩 표지(SentenceBook.module.css)의 색·문구를 옮겼다. 책은 크게 키워 윗부분만 보이고, 아래는 무대 바닥선(흰 띠)에서 잘린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '오늘의 문장 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

/**
 * 책 윗부분만 보여 준다(HJ 2026-11-27 "흰 띠에서 잘리게").
 * 책 아래쪽은 무대 바닥선(흰 띠 경계)에서 잘린다. 가운데 정렬로 바꾸며 1.5 → 1.08배(전체 0.8배 기준).
 */
const SCALE = 1.08;
/** 문고판 판형(3:4) — 무대보다 길어서 아래가 잘린다 */
const BOOK = { width: 300 * SCALE, height: 400 * SCALE } as const;
/** 당근 — 책 위 오른쪽에서 몸통 절반이 책 뒤로 숨는다 */
const CARROT = { width: 84 * SCALE, height: 137 * SCALE } as const;
/** 책 윗변 — 당근 머리 끝이 다른 카드 그림의 윗변(OBJECT_TOP)쯤에 오게 */
const BOOK_TOP = OBJECT_TOP - 10 + CARROT.height / 2;

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
  // 무대 크기의 창 — overflow: hidden 으로 책 아래쪽을 무대 바닥선에서 자른다
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: STAGE_HEIGHT,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: STAGE_CENTER - BOOK.width / 2,
        top: BOOK_TOP - CARROT.height / 2,
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
          right: 38 * SCALE,
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
          borderRadius: 9,
          background: COLORS.cream,
          overflow: 'hidden',
        }}
      >
        {/* 책등 쪽 띠 */}
        <div
          style={{
            display: 'flex',
            width: 22 * SCALE,
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
            padding: `${30 * SCALE}px ${26 * SCALE}px 0 ${26 * SCALE}px`,
            color: COLORS.ink,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BrandSymbol size={40 * SCALE} />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 6 * SCALE,
              fontSize: 32 * SCALE,
              fontWeight: 800,
              lineHeight: 1.3,
              letterSpacing: -1.5,
            }}
          >
            <div style={{ display: 'flex' }}>책 사이에 끼워 둔</div>
            <div style={{ display: 'flex' }}>
              오늘의
              <span style={{ color: COLORS.blue, marginLeft: 9 * SCALE }}>
                한 줄
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 14 * SCALE,
              fontSize: 17 * SCALE,
              fontWeight: 500,
              color: COLORS.muted,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 20 * SCALE,
                marginRight: 10 * SCALE,
                borderTop: `2px solid ${COLORS.muted}`,
              }}
            />
            하루 한 번, 당근을 뽑아요
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Image = () =>
  renderOg(
    <StageCard cta='오늘의 문장 뽑기'>
      <StageSlogan lines={['당근을 뽑으면,', '오늘의 한 문장']} />
      <CarrotBook />
    </StageCard>
  );

export default Image;
