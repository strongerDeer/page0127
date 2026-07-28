import { ImageResponse } from 'next/og';

import { BookShelf } from '@/shared/lib/og/BookShelf';
import {
  BOOK_SPINES,
  OG_CACHE_CONTROL,
  OG_COLORS,
  OG_SIZE,
} from '@/shared/lib/og/theme';

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
//
// runtime: 지정하지 않는다 = Next.js 기본값인 Node.js 런타임.
// 예전엔 runtime = 'edge' 였는데, next/og(satori + wasm 렌더러)가 통째로 실려
// Edge Function 번들이 1.12MB가 되면서 Vercel Hobby 플랜의 1MB 한도를 넘겨
// "Deploying outputs..." 단계에서 배포가 실패했다(빌드는 통과하므로 빌드 로그만
// 봐서는 원인이 안 보인다). Node.js 런타임의 Serverless Function은 용량 한도가
// 훨씬 커서 같은 번들이 문제없이 올라가고, 생성되는 이미지 결과는 동일하다.
export const alt = 'page0127 - 책장을 보면, 그 사람이 보인다';
export const size = OG_SIZE;
export const contentType = 'image/png';

const Image = () => {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: OG_COLORS.ink,
        color: OG_COLORS.paper,
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

      {/* 우: 선반에 꽂힌 책등 — 브랜드 카드라 선반을 가득 채운다 */}
      <BookShelf spines={BOOK_SPINES} />
    </div>,
    {
      ...size,
      // next/og 기본값은 max-age=0 이라 크롤러가 부를 때마다 다시 그린다
      headers: { 'Cache-Control': OG_CACHE_CONTROL },
    }
  );
};

export default Image;
