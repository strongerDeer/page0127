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
    ],
  },
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
};

const withVanillaExtract = createVanillaExtractPlugin();

// Bundle Analyzer 설정
const analyzeBundles = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// 플러그인 적용
export default analyzeBundles(withVanillaExtract(nextConfig));
