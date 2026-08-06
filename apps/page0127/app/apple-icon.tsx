import { ImageResponse } from 'next/og';

import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

/*
  iOS 홈 화면 아이콘 (apple-touch-icon)

  왜 파일을 따로 두는가:
  - iOS 는 홈 화면 아이콘으로 **SVG 를 받지 않는다.** `app/icon.svg` 만 있으면
    "홈 화면에 추가" 했을 때 아이콘 자리에 **페이지 스크린샷**이 들어간다.
  - 그래서 같은 형태를 PNG 로 한 장 더 만든다. 180×180 은 애플 권장 크기다.

  왜 PNG 원본을 저장소에 두지 않는가:
  - 색을 바꿀 때 디자인 파일·SVG·PNG 세 곳이 어긋난다. 코드로 그리면 형태가
    `BrandSymbol` 한 곳에만 있고 공유 카드의 워드마크도 같은 것을 쓴다.

  runtime 을 지정하지 않는다 = Node.js 런타임.
  'edge' 로 두면 next/og(satori + wasm)가 번들에 통째로 실려 Vercel Hobby 의
  Edge Function 1MB 한도를 넘긴다 (app/opengraph-image.tsx 의 같은 주석 참조).
*/
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const Icon = () => new ImageResponse(<BrandSymbol size={size.width} />, size);

export default Icon;
