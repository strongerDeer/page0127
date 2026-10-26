import { ImageResponse } from 'next/og';

import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

// iOS 홈 화면은 PNG를 사용한다. PWA·공유 카드와 같은 확정 원본으로 생성한다.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const Icon = () => new ImageResponse(<BrandSymbol size={size.width} />, size);

export default Icon;
