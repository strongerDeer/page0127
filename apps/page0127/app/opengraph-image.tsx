import { ImageResponse } from 'next/og';

// 동적 Open Graph 이미지 (Next.js 파일 규칙)
// - /opengraph-image 로 서빙되어 SNS 공유 시 썸네일로 노출됨
// - 별도 이미지 에셋 없이 코드로 생성 (JSX → 이미지)
//
// 디자인 원칙 (00_docs/07):
// - 인디고 그라디언트 + 📚 이모지 → 잉크 배경 + 책등이 꽂힌 선반
// - 공유했을 때 "책"이 보여야 한다
//
// 레이아웃 주의:
// - 좌우 2단으로 짠다. 세로로 쌓으면 책등 높이가 텍스트를 밀어내
//   630px 캔버스를 넘치고 글자가 겹친다.

// 라우트 세그먼트 설정
export const runtime = 'edge';
export const alt = 'page0127 - 책장을 보면, 그 사람이 보인다';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 책등 — 높이·두께를 조금씩 달리해 실제 책장처럼 들쭉날쭉하게 세운다.
// 책은 서로 맞닿아 꽂히므로 간격을 거의 주지 않는다(벌리면 막대그래프로 보인다).
const SPINES = [
  { h: 300, w: 44, c: '#2f5d3a' },
  { h: 352, w: 34, c: '#c25e3a' },
  { h: 272, w: 52, c: '#3f4a58' },
  { h: 330, w: 38, c: '#b8860b' },
  { h: 288, w: 30, c: '#7d8471' },
  { h: 364, w: 46, c: '#8a4a30' },
  { h: 312, w: 36, c: '#55606e' },
  { h: 262, w: 42, c: '#4a4a4a' },
];

const Image = () => {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#1f2a24',
          color: '#faf9f7',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
        }}
      >
        {/* 좌: 카피 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingRight: 40,
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, opacity: 0.65 }}>
            page0127
          </div>

          {/*
            Satori(next/og) 제약: 자식이 2개 이상인 div 는 명시적 display 필요.
            <br/> 대신 flex column 으로 두 줄을 각각 div 로 쌓는다.
            한글은 글리프가 커서 lineHeight 1.25 로는 윗줄을 침범한다.
          */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 28,
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            <div>책장을 보면,</div>
            <div>그 사람이 보인다</div>
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontSize: 27,
              opacity: 0.7,
            }}
          >
            읽은 책이 모여 책장이 됩니다
          </div>
        </div>

        {/* 우: 선반에 꽂힌 책등 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            borderBottom: '5px solid #faf9f7',
            paddingBottom: 5,
          }}
        >
          {SPINES.map((s) => (
            <div
              key={s.c + s.h}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 5,
                width: s.w,
                height: s.h,
                background: s.c,
                // 책등이라 위쪽 모서리만 살짝 둥글다
                borderRadius: '2px 2px 0 0',
              }}
            >
              {/* 책등에 각인된 제목 자리 — 두 줄의 얇은 선 */}
              <div
                style={{
                  width: s.w * 0.44,
                  height: 3,
                  background: '#faf9f7',
                  opacity: 0.42,
                }}
              />
              <div
                style={{
                  width: s.w * 0.28,
                  height: 3,
                  background: '#faf9f7',
                  opacity: 0.24,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
};

export default Image;
