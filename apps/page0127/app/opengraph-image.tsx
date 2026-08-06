import { ImageResponse } from 'next/og';

import { CardFrame, Wordmark } from '@/shared/lib/og/CardFrame';
import { OG_CACHE_CONTROL, OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

// 동적 Open Graph 이미지 (Next.js 파일 규칙)
// - /opengraph-image 로 서빙되어 SNS 공유 시 썸네일로 노출됨
// - 별도 이미지 에셋 없이 코드로 생성 (JSX → 이미지)
//
// 디자인:
// - 흰 면에 가운데 정렬. 카톡·슬랙 타임라인에서 정사각으로 잘려도 핵심이 남는다.
// - 배경 책장은 뒤로 물린 무늬다 — 글자는 흰 여백 위에 얹혀 대비를 지킨다.
// - 워드마크의 심볼은 파비콘과 같은 형태다(shared/lib/brand/BrandSymbol).
//
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
    <CardFrame>
      <Wordmark size={46} />

      {/*
        Satori 제약: 자식이 2개 이상인 div 는 명시적 display 가 필요하다.
        <br/> 대신 flex column 으로 두 줄을 각각 div 로 쌓는다.
      */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 24,
          fontSize: 62,
          fontWeight: 700,
          // 한글은 글리프가 커서 lineHeight 1.25 로는 윗줄을 침범한다
          lineHeight: 1.3,
        }}
      >
        <div>책장을 보면,</div>
        <div>그 사람이 보인다</div>
      </div>

      {/*
        서브 카피가 "읽은 책이 모여 책장이 됩니다" 였을 때의 문제:
        메인 카피가 이미 '책장'을 말했는데 같은 말을 한 번 더 해서,
        **무슨 서비스인지 말할 자리**를 잃었다. 카드는 아직 들어오지 않은
        사람이 보는 것이라 행동(기록)과 보상(취향)을 함께 말해야 한다.
      */}
      <div
        style={{
          display: 'flex',
          marginTop: 24,
          fontSize: 27,
          color: OG_COLORS.inkSoft,
        }}
      >
        한 권씩 채우면, 취향이 보입니다
      </div>
    </CardFrame>,
    {
      ...size,
      // next/og 기본값은 max-age=0 이라 크롤러가 부를 때마다 다시 그린다
      headers: { 'Cache-Control': OG_CACHE_CONTROL },
    }
  );
};

export default Image;
