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
 * app/icon.png는 같은 원본을 64px로 축소한 브라우저 탭용 이미지다.
 */
const symbolSource = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'public/brand/page0127-symbol.png')
).toString('base64')}`;

type BrandSymbolProps = {
  size: number;
};

export const BrandSymbol = ({ size }: BrandSymbolProps) => (
  // Satori는 next/image 대신 원본 img의 data URI를 렌더링한다.
  // eslint-disable-next-line @next/next/no-img-element
  <img src={symbolSource} alt='page0127.' width={size} height={size} />
);
