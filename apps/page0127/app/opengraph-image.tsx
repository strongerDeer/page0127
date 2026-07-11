import { ImageResponse } from 'next/og';

// 동적 Open Graph 이미지 (Next.js 파일 규칙)
// - /opengraph-image 로 서빙되어 SNS 공유 시 썸네일로 노출됨
// - 별도 이미지 에셋 없이 코드로 생성 (JSX → 이미지)

// 라우트 세그먼트 설정
export const runtime = 'edge';
export const alt = 'page0127 - 책장을 보면, 그 사람이 보인다';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const Image = () => {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // 인디고 그라데이션 배경 (primary #6366f1 기반)
          background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '80px',
        }}
      >
        <div style={{ fontSize: 40, opacity: 0.85, marginBottom: 24 }}>
          📚 page0127
        </div>
        {/*
          Satori(next/og) 제약: 자식이 2개 이상인 div 는 명시적 display 필요.
          <br/> 대신 flex column 으로 두 줄을 각각 div 로 쌓는다.
        */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: 72,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.25,
          }}
        >
          <div>책장을 보면,</div>
          <div>그 사람이 보인다</div>
        </div>
        <div
          style={{
            fontSize: 32,
            opacity: 0.8,
            marginTop: 32,
            textAlign: 'center',
          }}
        >
          AI가 들려주는 나만의 독서 취향
        </div>
      </div>
    ),
    { ...size }
  );
};

export default Image;
