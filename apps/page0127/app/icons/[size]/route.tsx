import { ImageResponse } from 'next/og';

import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

/*
  PWA 설치 아이콘 (192·512 PNG) — manifest.ts 와 푸시 알림 아이콘이 쓴다.

  왜 apple-icon(180) 하나로 끝내지 않는가:
  - 크롬은 "설치 가능" 판정에 **192px 이상 아이콘**을, 시작 화면(splash)에 512px 를 쓴다.
    180 하나만 있으면 설치 메뉴가 뜨지 않거나 흐릿한 확대본이 나온다.
  - 그림은 apple-icon 과 같은 BrandSymbol 이다 — 형태는 여전히 한 곳에만 있다.

  빌드 때 두 장만 미리 만든다(generateStaticParams + dynamicParams=false).
  /icons/300 같은 다른 크기는 404 다.
*/
const SIZES = ['192', '512'] as const;

export const dynamicParams = false;

export const generateStaticParams = () => SIZES.map((size) => ({ size }));

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const px = Number(size);

  return new ImageResponse(<BrandSymbol size={px} />, {
    width: px,
    height: px,
  });
}
