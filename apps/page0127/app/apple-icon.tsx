import { ImageResponse } from 'next/og';

import { AppIcon } from '@/shared/lib/brand/BrandSymbol';

// iOS 홈 화면은 PNG를 쓰고, 투명한 곳을 검게 채운 뒤 모서리를 직접 깎는다.
// 그래서 표지가 사각형을 꽉 채운 사본을 쓴다(AppIcon 주석 참조).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const Icon = () =>
  new ImageResponse(<AppIcon size={size.width} fullBleed />, size);

export default Icon;
