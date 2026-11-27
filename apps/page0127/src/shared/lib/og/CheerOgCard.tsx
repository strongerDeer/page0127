import { toCheerPatternSrc } from './CheerStoryCard';
import { OG_SIZE } from './theme';

const BLUE = '#1e69cb';
const BLUE_DEEP = '#0b4fae';
const RED = '#d64554';
const RED_DEEP = '#a8303e';
const NAVY = '#14294e';

const PATTERN_SRC = toCheerPatternSrc(OG_SIZE.width, OG_SIZE.height, 1.6);

/** 리본 매듭 — 화면(CheerScene)의 매듭 그림과 같다 */
const BOW_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 84 56' width='168' height='112'>" +
    `<path d='M42 28 C20 0 0 6 6 26 C10 40 30 36 42 28Z M42 28 C64 0 84 6 78 26 C74 40 54 36 42 28Z' fill='${RED}'/>` +
    `<circle cx='42' cy='28' r='9' fill='${RED_DEEP}'/></svg>`
)}`;

type CheerOgCardProps = {
  year: number;
};

/**
 * 연말 응원 링크 미리보기 그림(1200×630) — 응원 카드 화면(시안 v3)과 같은 옷을 입힌다.
 *
 * 파란 무대 + 은은한 흰 선 무늬 + 맨 아래 빨강·흰 띠 + 오른쪽에 아직 안 푼 선물 상자.
 * 홈 공유 그림(책 막대 무대)은 쓰지 않는다 — HJ 11/27 "이 디자인이 너무 싫어, 디자인 맞춰줘".
 * 문장·이름은 넣지 않는다: 문장은 눌러서 보는 재미로 남기고, 이름은 카톡이 그림 아래 제목으로 보여 준다.
 */
export const CheerOgCard = ({ year }: CheerOgCardProps) => (
  <div
    style={{
      display: 'flex',
      position: 'relative',
      width: OG_SIZE.width,
      height: OG_SIZE.height,
      padding: '64px 80px 80px',
      background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DEEP} 100%)`,
      color: '#ffffff',
      fontFamily: 'Pretendard',
    }}
  >
    {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 img 만 그린다 */}
    <img
      src={PATTERN_SRC}
      width={OG_SIZE.width}
      height={OG_SIZE.height}
      alt=''
      style={{ position: 'absolute', top: 0, left: 0 }}
    />

    {/* 왼쪽 글자 */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
      }}
    >
      <div
        style={{ display: 'flex', fontSize: 28, fontWeight: 600, opacity: 0.9 }}
      >
        {year} 연말 선물
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 62,
            fontWeight: 800,
            lineHeight: 1.3,
            letterSpacing: -1,
          }}
        >
          <div>한 해 수고한 당신에게</div>
          <div>응원이 도착했어요</div>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 22,
            fontSize: 28,
            opacity: 0.88,
          }}
        >
          리본을 풀어 열어 보세요
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 800 }}>
        page0127.
      </div>
    </div>

    {/* 오른쪽 선물 상자 */}
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 340,
          height: 340,
          borderRadius: 28,
          background: '#ffffff',
          boxShadow: '0 24px 50px rgba(0, 0, 0, 0.25)',
          transform: 'rotate(-4deg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 150,
            top: 0,
            width: 40,
            height: 340,
            background: RED,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 150,
            left: 0,
            width: 340,
            height: 40,
            background: RED,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 img 만 그린다 */}
        <img
          src={BOW_SRC}
          width={168}
          height={112}
          alt=''
          style={{ position: 'absolute', left: 86, top: 114 }}
        />
        <div
          style={{
            position: 'absolute',
            left: 20,
            bottom: 20,
            display: 'flex',
            padding: '6px 14px',
            borderRadius: 10,
            background: NAVY,
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          To. 당신
        </div>
      </div>
    </div>

    {/* 맨 아래 빨강·흰 띠 */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: OG_SIZE.width,
        height: 16,
        background: `repeating-linear-gradient(90deg, ${RED} 0px, ${RED} 28px, #ffffff 28px, #ffffff 56px)`,
      }}
    />
  </div>
);
