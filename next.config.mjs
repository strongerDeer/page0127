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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },

  // console.log 구문 자동 제거
  swcMinify: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'], // error와 warn 로그는 유지
          }
        : false,
  },

  optimizeFonts: true,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['date-fns'], // date-fns 패키지 임포트 최적화
  },
  webpack: (config) => {
    config.optimization.runtimeChunk = 'single';
    config.optimization.splitChunks = {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      maxSize: 50000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            if (!module.context) return 'vendor';

            // 안전한 패키지 이름 추출
            const packageName = module.context.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
            );

            // 매치가 실패한 경우 기본값 반환
            if (!packageName || !packageName[1]) return 'vendor';

            return `vendor.${packageName[1].replace('@', '')}`;
          },
          priority: 20,
        },
        common: {
          name: 'commons',
          chunks: 'initial',
          minChunks: 2,
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    };
    return config;
  },
};

const withVanillaExtract = createVanillaExtractPlugin();

// Bundle Analyzer 설정
const analyzeBundles = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// 플러그인 적용
export default analyzeBundles(withVanillaExtract(nextConfig));
