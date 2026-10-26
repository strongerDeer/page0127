import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 브랜드 색 — 표지 파랑, 숫자 흰색, 마침표 민트. */
export const BRAND_SYMBOL = {
  bg: '#1e69cb',
  mark: '#ffffff',
  accent: '#6ee7b7',
} as const;

/**
 * Satori 전용 심볼. 확정한 A 시안의 종이 질감과 얕은 음각을 PNG로 보존한다.
 * 로컬 원본을 data URI로 읽어 아이콘·공유 카드 생성 시 외부 요청을 피한다.
 * 원본(page0127-symbol.png)은 연한 흰 바탕이 칠해져 있어 파란 카드 위에서 흰 네모로
 * 보인다. 그래서 바탕을 걷어 낸 투명 사본(app-icon.png)을 그린다.
 * app/icon.png는 같은 투명 사본을 64px로 축소한 브라우저 탭용 이미지다.
 *
 * ⚠️ 모듈 최상단에서 읽지 말 것 — 처음 렌더할 때 읽는다.
 *   모든 페이지가 메타데이터(size·contentType)를 얻으려고 app/apple-icon.tsx 를
 *   import 한다. 페이지 서버 함수 번들에는 public/ 파일이 실리지 않아서, import
 *   순간 읽으면 ENOENT 로 홈·로그인 등 페이지 전체가 에러 화면이 된다(2026-10-26).
 *   이미지를 실제로 그리는 라우트에는 next.config 의 outputFileTracingIncludes 로
 *   원본을 함께 싣는다.
 */
const sources = new Map<string, string>();

const readPng = (file: string) => {
  let source = sources.get(file);
  if (!source) {
    source = `data:image/png;base64,${readFileSync(
      join(process.cwd(), 'public/brand', file)
    ).toString('base64')}`;
    sources.set(file, source);
  }
  return source;
};

type BrandSymbolProps = {
  size: number;
};

export const BrandSymbol = ({ size }: BrandSymbolProps) => (
  // Satori는 next/image 대신 원본 img의 data URI를 렌더링한다.
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={readPng('app-icon.png')}
    alt='page0127.'
    width={size}
    height={size}
  />
);

type AppIconProps = {
  size: number;
  /** true 면 표지 파랑이 사각형을 꽉 채운 사본(OS 가 모양대로 잘라 쓴다) */
  fullBleed?: boolean;
};

/**
 * 설치형 앱·홈 화면 아이콘. 심볼 원본은 연한 흰 바탕이 들어 있어서 그대로 쓰면
 * 맥 Dock·iOS 홈 화면에 흰 판이 생긴다(2026-10-26).
 * - app-icon.png: 바탕을 투명하게 걷어 내고, 북마크가 튀어나온 만큼 위아래 여백을
 *   두어 책 몸통이 정가운데에 오게 꽉 채운 사본.
 * - app-icon-maskable.png: 책 표지를 정사각으로 잘라 사각형을 꽉 채운 사본.
 *   macOS 26 은 사각형을 꽉 채우지 않은 아이콘을 회색 판에 넣고 줄이고, iOS 는
 *   투명한 곳을 검게 채운다. 그래서 manifest 의 maskable·apple-icon 은 이걸 쓴다.
 */
export const AppIcon = ({ size, fullBleed = false }: AppIconProps) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={readPng(fullBleed ? 'app-icon-maskable.png' : 'app-icon.png')}
    alt='page0127.'
    width={size}
    height={size}
  />
);
