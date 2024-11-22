import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/ttb/api/:path*',
        destination: 'http://www.aladin.co.kr/ttb/api/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  // console.log 구문 자동 제거
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'], // error와 warn 로그는 유지
          }
        : false,
  },
};

const withVanillaExtract = createVanillaExtractPlugin();

// Bundle Analyzer 설정
const analyzeBundles = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// 플러그인 적용
export default analyzeBundles(withVanillaExtract(nextConfig));
