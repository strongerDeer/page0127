import { renderOg } from '@/shared/lib/og/render';
import { BrandStage } from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

// 동적 Open Graph 이미지 (Next.js 파일 규칙)
// - /opengraph-image 로 서빙되어 SNS 공유 시 썸네일로 노출됨
// - 별도 이미지 에셋 없이 코드로 생성 (JSX → 이미지)
// - 자기 OG 이미지가 없는 모든 페이지(소개·로그인·약관 등)가 이 카드를 물려받는다
//
// 디자인: 파란 무대 + 흰 띠 한 줄 — 책장·책 기록 카드와 같은 틀(shared/lib/og/StageCard).
//
// 라우트 세그먼트 설정
//
// runtime: 지정하지 않는다 = Next.js 기본값인 Node.js 런타임.
// 예전엔 runtime = 'edge' 였는데, next/og(satori + wasm 렌더러)가 통째로 실려
// Edge Function 번들이 1.12MB가 되면서 Vercel Hobby 플랜의 1MB 한도를 넘겨
// "Deploying outputs..." 단계에서 배포가 실패했다(빌드는 통과하므로 빌드 로그만
// 봐서는 원인이 안 보인다). Node.js 런타임의 Serverless Function은 용량 한도가
// 훨씬 커서 같은 번들이 문제없이 올라가고, 생성되는 이미지 결과는 동일하다.
export const alt = 'page0127. - 책장을 보면, 그 사람이 보인다';
export const size = OG_SIZE;
export const contentType = 'image/png';

const Image = () => renderOg(<BrandStage cta='내 책장 만들기' />);

export default Image;
