import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // React Compiler 자동 메모이제이션 (Next.js 16부터 stable)
  reactCompiler: true,
  // 모노레포 패키지의 CSS/JS 파일을 트랜스파일하도록 설정
  // @repo/design-tokens 는 어디서도 import 되지 않아 제거했다.
  // 디자인 토큰의 단일 출처는 app/globals.css 다.
  transpilePackages: ['@repo/icons'],
  experimental: {
    // barrel(index) import를 개별 모듈 import로 변환해 tree-shaking 강화
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'sjngwxtykqhlsvxcyqah.supabase.co' },
    ],
  },
};

export default nextConfig;
